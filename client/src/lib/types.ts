export interface Peer {
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
  /** Object URL, available once an incoming file is fully received. */
  url?: string;
}

/** Control messages exchanged over the WebRTC data channel. */
export type DataChannelControl =
  | { kind: 'file-meta'; id: string; name: string; size: number; mime: string }
  | { kind: 'file-end'; id: string };
