import { useState } from 'react';

import { useStore } from '../store/useStore';
import { session } from '../lib/session';
import { VideoTile } from './VideoTile';
import {
  MicIcon, MicOffIcon, PhoneIcon, PhoneOffIcon, VideoIcon, VideoOffIcon,
} from './icons';

export function CallStage() {
  const inCall = useStore((s) => s.inCall);
  const localStream = useStore((s) => s.localStream);
  const remoteStreams = useStore((s) => s.remoteStreams);
  const micEnabled = useStore((s) => s.micEnabled);
  const camEnabled = useStore((s) => s.camEnabled);
  const self = useStore((s) => s.self);
  const peerName = useStore((s) => s.peerName);
  const [error, setError] = useState<string | null>(null);

  async function start(withVideo: boolean) {
    setError(null);
    try {
      await session.startCall(withVideo);
    } catch {
      setError('Could not access your microphone/camera. Check permissions and devices.');
    }
  }

  if (!inCall) {
    return (
      <div className="callstage callstage--idle">
        <div className="callstage__cta">
          <h3>Start a live call</h3>
          <p>Publish your mic and camera to everyone in the room.</p>
          <div className="callstage__buttons">
            <button className="btn btn--primary" onClick={() => start(true)}>
              <VideoIcon /> Video call
            </button>
            <button className="btn btn--ghost" onClick={() => start(false)}>
              <PhoneIcon /> Audio only
            </button>
          </div>
          {error && <p className="files__error">{error}</p>}
        </div>
      </div>
    );
  }

  const remoteEntries = Object.entries(remoteStreams);

  return (
    <div className="callstage">
      <div className={`callstage__grid tiles-${Math.min(remoteEntries.length + 1, 4)}`}>
        {localStream && (
          <VideoTile stream={localStream} label={`${self?.username ?? 'Me'} (you)`} muted mirror />
        )}
        {remoteEntries.map(([peerId, stream]) => (
          <VideoTile key={peerId} stream={stream} label={peerName(peerId)} />
        ))}
      </div>

      <div className="callstage__controls">
        <button
          className={`ctrl ${micEnabled ? '' : 'ctrl--off'}`}
          onClick={() => session.toggleMic()}
          aria-label={micEnabled ? 'Mute microphone' : 'Unmute microphone'}
        >
          {micEnabled ? <MicIcon /> : <MicOffIcon />}
        </button>
        {camEnabled !== undefined && localStream?.getVideoTracks().length ? (
          <button
            className={`ctrl ${camEnabled ? '' : 'ctrl--off'}`}
            onClick={() => session.toggleCam()}
            aria-label={camEnabled ? 'Turn camera off' : 'Turn camera on'}
          >
            {camEnabled ? <VideoIcon /> : <VideoOffIcon />}
          </button>
        ) : null}
        <button className="ctrl ctrl--hangup" onClick={() => session.leaveCall()} aria-label="Leave call">
          <PhoneOffIcon />
        </button>
      </div>
    </div>
  );
}
