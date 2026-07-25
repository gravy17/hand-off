import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { randomName, randomRoom } from '../lib/names';
import { Logo } from '../components/Logo';

const NAME_KEY = 'handoff:username';

export default function Home() {
  const navigate = useNavigate();
  const [username, setUsername] = useState(
    () => localStorage.getItem(NAME_KEY) || randomName(),
  );
  const [room, setRoom] = useState('');

  function join(targetRoom: string) {
    const name = username.trim() || randomName();
    const roomId = targetRoom.trim();
    if (!roomId) return;
    localStorage.setItem(NAME_KEY, name);
    navigate(`/room/${encodeURIComponent(roomId)}`, { state: { username: name } });
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    join(room);
  }

  return (
    <div className="home">
      <div className="home__card">
        <header className="home__brand">
          <Logo size={44} />
          <div>
            <h1>HandOff</h1>
            <p className="home__tagline">
              Peer-to-peer chat, calls &amp; file sharing — right in your browser.
            </p>
          </div>
        </header>

        <form className="home__form" onSubmit={onSubmit}>
          <label className="field">
            <span>Your display name</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. Ada"
              maxLength={40}
              autoComplete="off"
            />
          </label>

          <label className="field">
            <span>Room name</span>
            <div className="field__row">
              <input
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder="e.g. design-standup"
                autoComplete="off"
              />
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setRoom(randomRoom())}
                title="Generate a random room name"
              >
                Shuffle
              </button>
            </div>
          </label>

          <button type="submit" className="btn btn--primary" disabled={!room.trim()}>
            Join room
          </button>
          <p className="home__hint">
            Share the room name with a friend (or open a second tab) to connect
            peer-to-peer. Everything runs directly between browsers.
          </p>
        </form>
      </div>

      <ul className="home__features">
        <li><strong>Real-time chat</strong><span>Instant messaging in shared rooms.</span></li>
        <li><strong>Audio &amp; video calls</strong><span>Native WebRTC, no plugins.</span></li>
        <li><strong>P2P file sharing</strong><span>Files stream directly between peers.</span></li>
      </ul>
    </div>
  );
}
