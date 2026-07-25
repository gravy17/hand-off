import type { RTCManager } from './rtc';
import type { DataChannelControl } from './types';

/** Chunk size for data-channel file transfer (64 KiB is well within SCTP limits). */
export const CHUNK_SIZE = 64 * 1024;

/** Pause sending when a channel's send buffer grows beyond this many bytes. */
const BUFFER_HIGH_WATERMARK = 4 * 1024 * 1024;

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

/** Reassembles data-channel chunks for a single incoming file. */
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

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Stream a file to all connected peers over their data channels, respecting
 * backpressure. Calls `onProgress` (0..1) as it goes.
 */
export async function sendFile(
  manager: RTCManager,
  fileId: string,
  file: File,
  onProgress: (progress: number) => void,
): Promise<void> {
  const meta: DataChannelControl = {
    kind: 'file-meta',
    id: fileId,
    name: file.name,
    size: file.size,
    mime: file.type,
  };
  manager.broadcast(JSON.stringify(meta));

  let offset = 0;
  while (offset < file.size) {
    while (manager.maxBufferedAmount() > BUFFER_HIGH_WATERMARK) {
      await delay(20);
    }
    const slice = file.slice(offset, offset + CHUNK_SIZE);
    const buffer = await slice.arrayBuffer();
    manager.broadcast(buffer);
    offset += buffer.byteLength;
    onProgress(file.size ? offset / file.size : 1);
  }

  const end: DataChannelControl = { kind: 'file-end', id: fileId };
  manager.broadcast(JSON.stringify(end));
  onProgress(1);
}
