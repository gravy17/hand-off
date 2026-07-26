import { useRef, useState } from 'react';

import { useStore } from '../store/useStore';
import { session } from '../lib/session';
import { formatBytes } from '../lib/fileTransfer';
import { DownloadIcon, PaperclipIcon } from './icons';

export function FilePanel() {
  const files = useStore((s) => s.files);
  const linkedPeers = useStore((s) => s.linkedPeers);
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  async function onPick(list: FileList | null) {
    if (!list || list.length === 0) return;
    setError(null);
    try {
      await session.shareFiles(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'File transfer failed.');
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  const canShare = Object.values(linkedPeers).some(Boolean);

  return (
    <div className="files">
      <div className="files__actions">
        <button
          className="btn btn--primary"
          onClick={() => inputRef.current?.click()}
          disabled={!canShare}
          title={canShare ? 'Send a file over the WebRTC data channel' : 'Waiting for a peer data link'}
        >
          <PaperclipIcon /> Send a file
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          onChange={(e) => onPick(e.target.files)}
        />
        {!canShare && <span className="files__note">Waiting for a peer data link…</span>}
      </div>

      {error && <p className="files__error">{error}</p>}

      <ul className="files__list">
        {files.length === 0 && <li className="files__empty">No files shared yet.</li>}
        {files.map((f) => (
          <li key={f.id} className="filecard">
            <div className="filecard__info">
              <span className="filecard__name" title={f.name}>{f.name}</span>
              <span className="filecard__meta">
                {formatBytes(f.size)} · {f.direction === 'outgoing' ? 'sent' : `from ${f.fromName}`}
                {f.error ? ` · ${f.error}` : ''}
              </span>
              {!f.done && (
                <div className="progress">
                  <div className="progress__bar" style={{ width: `${Math.round(f.progress * 100)}%` }} />
                </div>
              )}
            </div>
            {f.direction === 'incoming' && f.done && f.url && (
              <a className="btn btn--ghost btn--icon" href={f.url} download={f.name} aria-label={`Download ${f.name}`}>
                <DownloadIcon />
              </a>
            )}
            {f.direction === 'outgoing' && (
              <span className={`badge ${f.done && !f.error ? 'badge--ok' : ''}`}>
                {f.error ? 'Failed' : f.done ? 'Sent' : `${Math.round(f.progress * 100)}%`}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
