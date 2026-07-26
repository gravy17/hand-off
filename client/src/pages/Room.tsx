import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { useStore } from '../store/useStore';
import { session } from '../lib/session';
import { Logo } from '../components/Logo';
import { ChatPanel } from '../components/ChatPanel';
import { FilePanel } from '../components/FilePanel';
import { CallStage } from '../components/CallStage';
import { CopyIcon, LogOutIcon, UsersIcon } from '../components/icons';

type Tab = 'chat' | 'files' | 'call';

const NAME_KEY = 'handoff:username';

export default function Room() {
  const { roomId = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const connected = useStore((s) => s.connected);
  const connecting = useStore((s) => s.connecting);
  const error = useStore((s) => s.error);
  const self = useStore((s) => s.self);
  const peers = useStore((s) => s.peers);
  const linkedPeers = useStore((s) => s.linkedPeers);
  const inCall = useStore((s) => s.inCall);

  const [tab, setTab] = useState<Tab>('chat');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const stateName = (location.state as { username?: string } | null)?.username;
    const username = stateName || localStorage.getItem(NAME_KEY) || 'Guest';
    session.connect(username, decodeURIComponent(roomId)).catch(() => {
      /* error surfaced via store */
    });
    return () => session.leaveRoom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  function leave() {
    session.leaveRoom();
    navigate('/');
  }

  function copyLink() {
    navigator.clipboard?.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  if (error && !connected) {
    return (
      <div className="room-fallback">
        <h2>Couldn’t join the room</h2>
        <p>{error}</p>
        <button className="btn btn--primary" onClick={() => navigate('/')}>Back home</button>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="room-fallback">
        <div className="spinner" />
        <p>{connecting ? 'Connecting to room…' : 'Preparing…'}</p>
      </div>
    );
  }

  const participants = [
    ...(self ? [{ id: self.id, username: self.username, me: true }] : []),
    ...peers.map((p) => ({ ...p, me: false })),
  ];

  return (
    <div className="room">
      <header className="topbar">
        <div className="topbar__brand">
          <Logo size={28} />
          <div className="topbar__room">
            <span className="topbar__label">Room</span>
            <strong>{decodeURIComponent(roomId)}</strong>
          </div>
        </div>
        <div className="topbar__actions">
          <button className="btn btn--ghost btn--sm" onClick={copyLink}>
            <CopyIcon /> {copied ? 'Copied!' : 'Copy invite link'}
          </button>
          <button className="btn btn--danger btn--sm" onClick={leave}>
            <LogOutIcon /> Leave
          </button>
        </div>
      </header>

      <div className="room__body">
        <aside className="sidebar">
          <h3 className="sidebar__title"><UsersIcon /> In this room · {participants.length}</h3>
          <ul className="sidebar__people">
            {participants.map((p) => (
              <li key={p.id}>
                <span className={`dot ${!p.me && linkedPeers[p.id] ? 'dot--linked' : ''}`} />
                {p.username}
                {p.me && <span className="tag">you</span>}
                {!p.me && linkedPeers[p.id] && <span className="tag">linked</span>}
              </li>
            ))}
          </ul>
          {peers.length === 0 && (
            <p className="sidebar__hint">
              You’re the only one here. Share the invite link or open a second
              browser tab to connect a peer.
            </p>
          )}
          {peers.length > 1 && (
            <p className="sidebar__hint">
              Signaling supports one active peer link at a time. Chat, files, and
              calls use the linked peer.
            </p>
          )}
        </aside>

        <main className="content">
          <nav className="tabs">
            <button className={tab === 'chat' ? 'active' : ''} onClick={() => setTab('chat')}>Chat</button>
            <button className={tab === 'files' ? 'active' : ''} onClick={() => setTab('files')}>Files</button>
            <button className={tab === 'call' ? 'active' : ''} onClick={() => setTab('call')}>
              Call {inCall && <span className="live-dot" />}
            </button>
          </nav>
          <section className="panel">
            {tab === 'chat' && <ChatPanel />}
            {tab === 'files' && <FilePanel />}
            {tab === 'call' && <CallStage />}
          </section>
        </main>
      </div>
    </div>
  );
}
