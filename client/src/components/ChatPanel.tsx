import { useEffect, useRef, useState, type FormEvent } from 'react';

import { useStore } from '../store/useStore';
import { session } from '../lib/session';
import { SendIcon } from './icons';

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function ChatPanel() {
  const messages = useStore((s) => s.messages);
  const linkedPeers = useStore((s) => s.linkedPeers);
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const hasLink = Object.values(linkedPeers).some(Boolean);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    session.sendChat(text);
    setDraft('');
  }

  return (
    <div className="chat">
      <div className="chat__messages">
        {messages.length === 0 && (
          <p className="chat__empty">
            {hasLink
              ? 'No messages yet. Say hello — chat is peer-to-peer over WebRTC.'
              : 'Waiting for a peer data link… chat will flow directly between browsers.'}
          </p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`bubble ${m.mine ? 'bubble--mine' : ''}`}>
            {!m.mine && <span className="bubble__author">{m.username}</span>}
            <span className="bubble__text">{m.text}</span>
            <span className="bubble__time">{formatTime(m.ts)}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form className="chat__composer" onSubmit={onSubmit}>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSubmit(e);
            }
          }}
          placeholder="Type a message…"
          rows={1}
          maxLength={4000}
        />
        <button type="submit" className="btn btn--primary btn--icon" aria-label="Send message">
          <SendIcon />
        </button>
      </form>
    </div>
  );
}
