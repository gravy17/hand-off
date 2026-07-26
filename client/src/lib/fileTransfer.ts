import type { RTCManager } from './rtc';
import type { DataChannelMessage } from './types';

/** Chunk size for data-channel file transfer (64 KiB is well within SCTP limits). */
export const CHUNK_SIZE = 64 * 1024;

/** Pause sending when a channel's send buffer grows beyond this many bytes. */
export const BUFFER_HIGH_WATERMARK = 1 * 1024 * 1024;

/** Resume when the buffer drains to this many bytes. */
export const BUFFER_LOW_WATERMARK = 256 * 1024;

export function makeFileId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 || Number.isInteger(value) ? 0 : 1)} ${units[unit]}`;
}

function waitForBufferedAmountLow(dc: RTCDataChannel, low: number): Promise<void> {
  if (dc.readyState !== 'open') {
    return Promise.reject(new Error('Data channel closed during transfer'));
  }
  if (dc.bufferedAmount <= low) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const onLow = () => {
      cleanup();
      resolve();
    };
    const onClose = () => {
      cleanup();
      reject(new Error('Data channel closed during transfer'));
    };
    const cleanup = () => {
      dc.removeEventListener('bufferedamountlow', onLow);
      dc.removeEventListener('close', onClose);
    };
    dc.bufferedAmountLowThreshold = low;
    dc.addEventListener('bufferedamountlow', onLow);
    dc.addEventListener('close', onClose);
  });
}

async function waitForBackpressure(manager: RTCManager): Promise<void> {
  while (manager.maxBufferedAmount() > BUFFER_HIGH_WATERMARK) {
    const channels = manager.openChannels();
    if (channels.length === 0) {
      throw new Error('Data channel closed during transfer');
    }
    await Promise.race(channels.map((dc) => waitForBufferedAmountLow(dc, BUFFER_LOW_WATERMARK)));
  }
}

/**
 * Stream a file to all linked peers over WebRTC data channels.
 *
 * Only one `CHUNK_SIZE` window is materialized at a time (`File.slice`), so
 * senders can handle files of any size without loading them into memory.
 * Backpressure uses `bufferedamountlow` (no Socket.IO involvement).
 */
export async function sendFile(
  manager: RTCManager,
  fileId: string,
  file: File,
  onProgress: (progress: number) => void,
): Promise<void> {
  if (!manager.hasOpenChannels()) {
    throw new Error('No connected peers yet — wait for someone to join the room.');
  }

  const meta: DataChannelMessage = {
    kind: 'file-meta',
    id: fileId,
    name: file.name,
    size: file.size,
    mime: file.type,
  };
  manager.broadcast(JSON.stringify(meta));

  let offset = 0;

  try {
    while (offset < file.size) {
      await waitForBackpressure(manager);
      const blob = file.slice(offset, offset + CHUNK_SIZE);
      const buffer = await blob.arrayBuffer();
      manager.broadcast(buffer);
      offset += buffer.byteLength;
      onProgress(file.size ? offset / file.size : 1);
    }

    const end: DataChannelMessage = { kind: 'file-end', id: fileId };
    manager.broadcast(JSON.stringify(end));
    onProgress(1);
  } catch (err) {
    const abort: DataChannelMessage = {
      kind: 'file-abort',
      id: fileId,
      reason: err instanceof Error ? err.message : 'transfer failed',
    };
    try {
      manager.broadcast(JSON.stringify(abort));
    } catch {
      /* ignore */
    }
    throw err;
  }
}

/**
 * Streams an incoming file to disk when possible.
 *
 * Uses the Origin Private File System so multi‑GB transfers do not retain every
 * chunk in RAM. Falls back to in-memory chunk accumulation when OPFS is missing.
 */
export class StreamingReassembler {
  received = 0;
  private chunks: ArrayBuffer[] = [];
  private opfsHandle: FileSystemFileHandle | null = null;
  private writable: FileSystemWritableFileStream | null = null;
  private closed = false;

  constructor(public readonly meta: { id: string; name: string; size: number; mime: string }) {}

  static async create(meta: {
    id: string;
    name: string;
    size: number;
    mime: string;
  }): Promise<StreamingReassembler> {
    const r = new StreamingReassembler(meta);
    await r.init();
    return r;
  }

  private async init(): Promise<void> {
    try {
      if (!navigator.storage?.getDirectory) return;
      const root = await navigator.storage.getDirectory();
      const dir = await root.getDirectoryHandle('handoff-transfers', { create: true });
      this.opfsHandle = await dir.getFileHandle(this.meta.id, { create: true });
      this.writable = await this.opfsHandle.createWritable();
    } catch {
      this.opfsHandle = null;
      this.writable = null;
    }
  }

  async push(chunk: ArrayBuffer): Promise<void> {
    if (this.closed) return;
    this.received += chunk.byteLength;
    if (this.writable) {
      await this.writable.write(chunk);
      return;
    }
    this.chunks.push(chunk);
  }

  get progress(): number {
    if (this.meta.size <= 0) return 1;
    return Math.min(1, this.received / this.meta.size);
  }

  async abort(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    try {
      await this.writable?.abort();
    } catch {
      /* ignore */
    }
    this.writable = null;
    this.chunks = [];
    if (this.opfsHandle) {
      try {
        const root = await navigator.storage.getDirectory();
        const dir = await root.getDirectoryHandle('handoff-transfers');
        await dir.removeEntry(this.meta.id);
      } catch {
        /* ignore */
      }
      this.opfsHandle = null;
    }
  }

  async finalize(): Promise<Blob> {
    if (this.closed) throw new Error('transfer already closed');
    this.closed = true;

    if (this.writable && this.opfsHandle) {
      await this.writable.close();
      this.writable = null;
      const file = await this.opfsHandle.getFile();
      return new Blob([file], { type: this.meta.mime || file.type || 'application/octet-stream' });
    }

    return new Blob(this.chunks, { type: this.meta.mime || 'application/octet-stream' });
  }
}

/**
 * Synchronous in-memory reassembler for unit tests and tiny payloads.
 * Production receive path uses {@link StreamingReassembler}.
 */
export class Reassembler {
  private chunks: ArrayBuffer[] = [];
  received = 0;

  constructor(public readonly meta: { id: string; name: string; size: number; mime: string }) {}

  push(chunk: ArrayBuffer): void {
    this.chunks.push(chunk);
    this.received += chunk.byteLength;
  }

  get progress(): number {
    if (this.meta.size <= 0) return 1;
    return Math.min(1, this.received / this.meta.size);
  }

  toBlob(): Blob {
    return new Blob(this.chunks, { type: this.meta.mime || 'application/octet-stream' });
  }
}
