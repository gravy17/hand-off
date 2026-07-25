import { describe, expect, it } from 'vitest';

import { Reassembler, formatBytes, makeFileId } from './fileTransfer';

describe('formatBytes', () => {
  it('formats byte-scale values', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
  });

  it('formats KB/MB/GB with sensible precision', () => {
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5 MB');
    expect(formatBytes(1024 ** 3)).toBe('1 GB');
  });

  it('guards against invalid input', () => {
    expect(formatBytes(-5)).toBe('0 B');
    expect(formatBytes(NaN)).toBe('0 B');
  });
});

describe('makeFileId', () => {
  it('produces unique-ish ids', () => {
    const ids = new Set(Array.from({ length: 100 }, () => makeFileId()));
    expect(ids.size).toBe(100);
  });
});

describe('Reassembler', () => {
  it('accumulates chunks and reports progress', () => {
    const r = new Reassembler({ id: 'a', name: 'f.bin', size: 8, mime: 'application/octet-stream' });
    expect(r.progress).toBe(0);
    r.push(new Uint8Array([1, 2, 3, 4]).buffer);
    expect(r.progress).toBe(0.5);
    r.push(new Uint8Array([5, 6, 7, 8]).buffer);
    expect(r.progress).toBe(1);
    expect(r.received).toBe(8);
  });

  it('builds a blob of the correct size', async () => {
    const r = new Reassembler({ id: 'b', name: 'f.txt', size: 5, mime: 'text/plain' });
    r.push(new TextEncoder().encode('hello').buffer);
    const blob = r.toBlob();
    expect(blob.size).toBe(5);
    expect(await blob.text()).toBe('hello');
  });

  it('treats zero-size files as complete', () => {
    const r = new Reassembler({ id: 'c', name: 'empty', size: 0, mime: '' });
    expect(r.progress).toBe(1);
  });
});
