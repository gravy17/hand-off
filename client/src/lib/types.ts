export interface Peer {
  /** Stable user id from the room JWT (`sub`), used for signaling targets. */
  id: string;
  username: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  username: string;
  text: string;
  ts: number;
  /** True when this client is the author (for styling). */
  mine: boolean;
}

export type FileDirection = 'incoming' | 'outgoing';

export interface SharedFile {
  id: string;
  name: string;
  size: number;
  mime: string;
  direction: FileDirection;
  /** Peer id of the sender (incoming) or "me" (outgoing). */
  from: string;
  fromName: string;
  /** 0..1 transfer progress. */
  progress: number;
  done: boolean;
  error?: string;
  /** Object URL, available once an incoming file is fully received. */
  url?: string;
}

/** Control / app messages exchanged over the WebRTC data channel (never Socket.IO). */
export type DataChannelMessage =
  | { kind: 'file-meta'; id: string; name: string; size: number; mime: string }
  | { kind: 'file-end'; id: string }
  | { kind: 'file-abort'; id: string; reason?: string }
  | { kind: 'chat'; id: string; text: string; ts: number };

/** @deprecated Use DataChannelMessage */
export type DataChannelControl = DataChannelMessage;

export interface RoomMember {
  socketId: string;
  userId: string;
  name: string;
  role?: string;
}
