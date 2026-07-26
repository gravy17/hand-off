export interface SessionResponse {
  token: string;
  userId: string;
  username: string;
  roomId: string;
  expiresIn: number;
  signalingUrl?: string;
}

export interface TurnCredentials {
  urls: string | string[];
  username: string;
  credential: string;
  ttl?: number;
}

function apiBase(): string {
  // Same-origin in dev (Vite proxies /api). Override only when the BFF is remote.
  return import.meta.env.VITE_API_URL || '';
}

function signalingBase(): string {
  return import.meta.env.VITE_SIGNALING_URL || import.meta.env.VITE_SERVER_URL || '';
}

export async function mintSession(roomId: string, username: string, userId: string): Promise<SessionResponse> {
  const res = await fetch(`${apiBase()}/api/session`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ roomId, username, userId }),
  });

  if (!res.ok) {
    let message = 'Could not create a room session.';
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  return res.json() as Promise<SessionResponse>;
}

/** Best-effort TURN credential fetch from hand-off-server (optional). */
export async function fetchTurnCredentials(token: string): Promise<RTCIceServer[] | null> {
  const base = signalingBase();
  if (!base) return null;

  try {
    const res = await fetch(`${base}/v1/turn/credentials`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as TurnCredentials;
    return [
      {
        urls: body.urls,
        username: body.username,
        credential: body.credential,
      },
    ];
  } catch {
    return null;
  }
}

export function resolveSignalingUrl(session?: SessionResponse): string | undefined {
  return (
    import.meta.env.VITE_SIGNALING_URL ||
    import.meta.env.VITE_SERVER_URL ||
    session?.signalingUrl ||
    undefined
  );
}
