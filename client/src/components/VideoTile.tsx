import { useEffect, useRef } from 'react';

interface VideoTileProps {
  stream: MediaStream;
  label: string;
  muted?: boolean;
  mirror?: boolean;
}

export function VideoTile({ stream, label, muted = false, mirror = false }: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasVideo = stream.getVideoTracks().length > 0;

  useEffect(() => {
    const el = videoRef.current;
    if (el && el.srcObject !== stream) {
      el.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className={`tile ${mirror ? 'tile--mirror' : ''}`}>
      {hasVideo ? (
        <video ref={videoRef} autoPlay playsInline muted={muted} />
      ) : (
        <div className="tile__audio">
          <div className="tile__avatar">{label.charAt(0).toUpperCase()}</div>
        </div>
      )}
      <span className="tile__label">{label}</span>
    </div>
  );
}
