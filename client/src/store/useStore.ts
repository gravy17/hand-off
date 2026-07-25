import { create } from 'zustand';
import type { ChatMessage, Peer, SharedFile } from '../lib/types';

interface StoreState {
  self: Peer | null;
  roomId: string | null;
  connecting: boolean;
  connected: boolean;
  error: string | null;

  peers: Peer[];
  messages: ChatMessage[];
  files: SharedFile[];

  inCall: boolean;
  localStream: MediaStream | null;
  remoteStreams: Record<string, MediaStream>;
  micEnabled: boolean;
  camEnabled: boolean;

  setConnecting: (v: boolean) => void;
  setConnected: (v: boolean) => void;
  setError: (msg: string | null) => void;
  setSession: (self: Peer, roomId: string) => void;

  setPeers: (peers: Peer[]) => void;
  addPeer: (peer: Peer) => void;
  removePeer: (id: string) => void;
  peerName: (id: string) => string;

  addMessage: (msg: ChatMessage) => void;

  upsertFile: (file: SharedFile) => void;
  patchFile: (id: string, patch: Partial<SharedFile>) => void;

  setInCall: (v: boolean) => void;
  setLocalStream: (stream: MediaStream | null) => void;
  setRemoteStream: (peerId: string, stream: MediaStream) => void;
  removeRemoteStream: (peerId: string) => void;
  setMic: (v: boolean) => void;
  setCam: (v: boolean) => void;

  resetRoom: () => void;
}

export const useStore = create<StoreState>((set, get) => ({
  self: null,
  roomId: null,
  connecting: false,
  connected: false,
  error: null,

  peers: [],
  messages: [],
  files: [],

  inCall: false,
  localStream: null,
  remoteStreams: {},
  micEnabled: true,
  camEnabled: true,

  setConnecting: (v) => set({ connecting: v }),
  setConnected: (v) => set({ connected: v }),
  setError: (msg) => set({ error: msg }),
  setSession: (self, roomId) => set({ self, roomId }),

  setPeers: (peers) => set({ peers }),
  addPeer: (peer) =>
    set((s) =>
      s.peers.some((p) => p.id === peer.id)
        ? s
        : { peers: [...s.peers, peer] },
    ),
  removePeer: (id) =>
    set((s) => {
      const remoteStreams = { ...s.remoteStreams };
      delete remoteStreams[id];
      return { peers: s.peers.filter((p) => p.id !== id), remoteStreams };
    }),
  peerName: (id) => {
    if (id === get().self?.id || id === 'me') return get().self?.username ?? 'Me';
    return get().peers.find((p) => p.id === id)?.username ?? 'Someone';
  },

  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),

  upsertFile: (file) =>
    set((s) => {
      const idx = s.files.findIndex((f) => f.id === file.id);
      if (idx === -1) return { files: [...s.files, file] };
      const files = s.files.slice();
      files[idx] = { ...files[idx], ...file };
      return { files };
    }),
  patchFile: (id, patch) =>
    set((s) => ({
      files: s.files.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    })),

  setInCall: (v) => set({ inCall: v }),
  setLocalStream: (stream) => set({ localStream: stream }),
  setRemoteStream: (peerId, stream) =>
    set((s) => ({ remoteStreams: { ...s.remoteStreams, [peerId]: stream } })),
  removeRemoteStream: (peerId) =>
    set((s) => {
      const remoteStreams = { ...s.remoteStreams };
      delete remoteStreams[peerId];
      return { remoteStreams };
    }),
  setMic: (v) => set({ micEnabled: v }),
  setCam: (v) => set({ camEnabled: v }),

  resetRoom: () =>
    set({
      self: null,
      roomId: null,
      connecting: false,
      connected: false,
      error: null,
      peers: [],
      messages: [],
      files: [],
      inCall: false,
      localStream: null,
      remoteStreams: {},
      micEnabled: true,
      camEnabled: true,
    }),
}));
