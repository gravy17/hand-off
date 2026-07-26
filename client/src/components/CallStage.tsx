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
  const linkedPeers = useStore((s) => s.linkedPeers);
  const [error, setError] = useState<string | null>(null);
  const hasLink = Object.values(linkedPeers).some(Boolean);

  async function start(withVideo: boolean) {
    setError(null);
    try {
      await session.startCall(withVideo);
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      setError(
        message && !/permission|NotAllowed|NotFound|devices/i.test(message)
          ? message
          : 'Could not access your microphone/camera. Check permissions and devices.',
      );
    }
  }

  if (!inCall) {
    return (
      <div className="callstage callstage--idle">
        <div className="callstage__cta">
          <h3>Start a live call</h3>
          <p>
            {hasLink
              ? 'Publish your mic and camera to your linked peer over WebRTC.'
              : 'Waiting for a peer data link before a call can start…'}
          </p>
          <div className="callstage__buttons">
            <button className="btn btn--primary" onClick={() => start(true)} disabled={!hasLink}>
              <VideoIcon /> Video call
            </button>
            <button className="btn btn--ghost" onClick={() => start(false)} disabled={!hasLink}>
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
