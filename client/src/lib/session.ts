import { io, type Socket } from 'socket.io-client';

import { RTCManager } from './rtc';
import { Reassembler, makeFileId, sendFile } from './fileTransfer';
import { useStore } from '../store/useStore';
import type { ChatMessage, DataChannelControl, Peer, SharedFile } from './types';

interface JoinResponse {
  error?: string;
  selfId: string;
  roomId: string;
  username: string;
  peers: Peer[];
}

interface ServerChatMessage {
  id: string;
  senderId: string;
  username: string;
  text: string;
  ts: number;
}

/**
 * Ties together the signaling socket, the WebRTC mesh, and the UI store.
 * A single instance is shared across the app.
 */
class Session {
  private socket: Socket | null = null;
  private rtc: RTCManager | null = null;
  /** Active incoming transfer per peer (data channel is ordered, so one at a time). */
  private incoming = new Map<string, Reassembler>();

  private disposeConnections() {
    this.rtc?.destroy();
    this.rtc = null;
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.incoming.clear();
  }

  connect(username: string, roomId: string): Promise<void> {
    // Guard against duplicate connects (e.g. StrictMode double-mount).
    this.disposeConnections();

    const store = useStore.getState();
    store.setConnecting(true);
    store.setError(null);

    return new Promise((resolve, reject) => {
      const socket = io(import.meta.env.VITE_SERVER_URL || undefined, {
        reconnectionAttempts: 5,
      });
      this.socket = socket;

      socket.on('connect_error', () => {
        store.setError('Cannot reach the signaling server. Is it running?');
        store.setConnecting(false);
        reject(new Error('connect_error'));
      });

      socket.on('connect', () => {
        socket.emit('join', { roomId, username }, (res: JoinResponse) => {
          if (res?.error) {
            store.setError(res.error);
            store.setConnecting(false);
            socket.disconnect();
            reject(new Error(res.error));
            return;
          }
          const self: Peer = { id: res.selfId, username: res.username };
          store.setSession(self, res.roomId);
          store.setPeers(res.peers);
          store.setConnected(true);
          store.setConnecting(false);

          this.setupRtc(res.selfId);
          for (const peer of res.peers) this.rtc?.ensurePeer(peer.id);
          resolve();
        });
      });

      socket.on('peer-joined', (peer: Peer) => {
        useStore.getState().addPeer(peer);
        this.rtc?.ensurePeer(peer.id);
      });

      socket.on('peer-left', ({ id }: { id: string }) => {
        useStore.getState().removePeer(id);
        this.rtc?.removePeer(id);
        this.incoming.delete(id);
      });

      socket.on('chat', (m: ServerChatMessage) => {
        const state = useStore.getState();
        const message: ChatMessage = {
          id: m.id,
          senderId: m.senderId,
          username: m.username,
          text: m.text,
          ts: m.ts,
          mine: m.senderId === state.self?.id,
        };
        state.addMessage(message);
      });

      socket.on('signal', ({ from, data }: { from: string; data: never }) => {
        this.rtc?.handleSignal(from, data);
      });
    });
  }

  private setupRtc(selfId: string) {
    this.rtc = new RTCManager({
      selfId,
      sendSignal: (to, data) => this.socket?.emit('signal', { to, data }),
      onRemoteStream: (peerId, stream) => useStore.getState().setRemoteStream(peerId, stream),
      onRemoteStreamEnded: (peerId) => useStore.getState().removeRemoteStream(peerId),
      onData: (peerId, data) => this.handleData(peerId, data),
    });
  }

  private handleData(peerId: string, data: string | ArrayBuffer) {
    const store = useStore.getState();
    if (typeof data === 'string') {
      const msg = JSON.parse(data) as DataChannelControl;
      if (msg.kind === 'file-meta') {
        this.incoming.set(peerId, new Reassembler(msg));
        const file: SharedFile = {
          id: msg.id,
          name: msg.name,
          size: msg.size,
          mime: msg.mime,
          direction: 'incoming',
          from: peerId,
          fromName: store.peerName(peerId),
          progress: 0,
          done: false,
        };
        store.upsertFile(file);
      } else if (msg.kind === 'file-end') {
        const reassembler = this.incoming.get(peerId);
        if (reassembler) {
          const url = URL.createObjectURL(reassembler.toBlob());
          store.patchFile(msg.id, { progress: 1, done: true, url });
          this.incoming.delete(peerId);
        }
      }
      return;
    }

    const reassembler = this.incoming.get(peerId);
    if (reassembler) {
      reassembler.push(data);
      store.patchFile(reassembler.meta.id, { progress: reassembler.progress });
    }
  }

  sendChat(text: string) {
    const clean = text.trim();
    if (!clean) return;
    this.socket?.emit('chat', { text: clean });
  }

  async shareFiles(files: FileList | File[]) {
    if (!this.rtc || !this.rtc.hasOpenChannels()) {
      throw new Error('No connected peers yet — wait for someone to join the room.');
    }
    const store = useStore.getState();
    for (const file of Array.from(files)) {
      const id = makeFileId();
      const record: SharedFile = {
        id,
        name: file.name,
        size: file.size,
        mime: file.type,
        direction: 'outgoing',
        from: 'me',
        fromName: store.self?.username ?? 'Me',
        progress: 0,
        done: false,
      };
      store.upsertFile(record);
      await sendFile(this.rtc, id, file, (progress) =>
        store.patchFile(id, { progress, done: progress >= 1 }),
      );
    }
  }

  async startCall(withVideo: boolean) {
    const store = useStore.getState();
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: withVideo ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
    });
    store.setLocalStream(stream);
    store.setMic(true);
    store.setCam(withVideo);
    store.setInCall(true);
    this.rtc?.setLocalStream(stream);
  }

  leaveCall() {
    const store = useStore.getState();
    this.rtc?.stopLocalStream();
    store.setLocalStream(null);
    store.setInCall(false);
    for (const id of Object.keys(store.remoteStreams)) store.removeRemoteStream(id);
  }

  toggleMic() {
    const store = useStore.getState();
    const stream = store.localStream;
    if (!stream) return;
    const next = !store.micEnabled;
    stream.getAudioTracks().forEach((t) => (t.enabled = next));
    store.setMic(next);
  }

  toggleCam() {
    const store = useStore.getState();
    const stream = store.localStream;
    if (!stream) return;
    const next = !store.camEnabled;
    stream.getVideoTracks().forEach((t) => (t.enabled = next));
    store.setCam(next);
  }

  leaveRoom() {
    this.leaveCall();
    this.disposeConnections();
    useStore.getState().resetRoom();
  }
}

export const session = new Session();
