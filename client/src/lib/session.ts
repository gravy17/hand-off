import { io, type Socket } from 'socket.io-client';

import { RTCManager } from './rtc';
import { StreamingReassembler, makeFileId, sendFile } from './fileTransfer';
import { mintSession, fetchTurnCredentials, resolveSignalingUrl } from './api';
import { getOrCreateUserId } from './identity';
import { useStore } from '../store/useStore';
import type { ChatMessage, DataChannelMessage, Peer, RoomMember, SharedFile } from './types';

/**
 * Ties together JWT session minting, hand-off-server signaling, the WebRTC
 * link, and the UI store. A single instance is shared across the app.
 *
 * Socket.IO is used only for presence + call/ICE signaling. Chat text and file
 * bytes travel exclusively on the WebRTC data channel.
 */
class Session {
  private socket: Socket | null = null;
  private rtc: RTCManager | null = null;
  private token: string | null = null;
  private selfId: string | null = null;
  /** Active incoming transfer per peer (data channel is ordered, so one at a time). */
  private incoming = new Map<string, StreamingReassembler>();
  /** Peer userIds we have invited or accepted (server call slot occupied). */
  private linked = new Set<string>();
  private linking = new Set<string>();

  private disposeConnections() {
    this.rtc?.destroy(true);
    this.rtc = null;
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.token = null;
    this.selfId = null;
    this.incoming.clear();
    this.linked.clear();
    this.linking.clear();
  }

  connect(username: string, roomId: string): Promise<void> {
    this.disposeConnections();

    const store = useStore.getState();
    store.setConnecting(true);
    store.setError(null);

    return (async () => {
      try {
        const userId = getOrCreateUserId();
        const session = await mintSession(roomId, username, userId);
        this.token = session.token;
        this.selfId = session.userId;

        const signalingUrl = resolveSignalingUrl(session);
        await this.openSocket(signalingUrl, session.token, session.username, session.roomId);
      } catch (err) {
        store.setConnecting(false);
        store.setError(err instanceof Error ? err.message : 'Failed to join room');
        this.disposeConnections();
        throw err;
      }
    })();
  }

  private openSocket(
    url: string | undefined,
    token: string,
    username: string,
    roomId: string,
  ): Promise<void> {
    const store = useStore.getState();

    return new Promise((resolve, reject) => {
      const socket = io(url || undefined, {
        auth: { token },
        transports: ['websocket'],
        reconnectionAttempts: 5,
      });
      this.socket = socket;

      let settled = false;
      const fail = (message: string) => {
        if (settled) return;
        settled = true;
        store.setError(message);
        store.setConnecting(false);
        reject(new Error(message));
      };

      socket.on('connect_error', (err) => {
        fail(err?.message || 'Cannot reach the signaling server. Is hand-off-server running?');
      });

      socket.on('error:client', (payload: { code?: string; message?: string }) => {
        if (!useStore.getState().connected) {
          fail(payload?.message || payload?.code || 'Signaling error');
        } else {
          console.warn('[session] server error', payload);
        }
      });

      socket.on('room:joined', async (payload: { roomId: string; self: RoomMember; members: RoomMember[] }) => {
        const self: Peer = { id: payload.self.userId, username: payload.self.name || username };
        this.selfId = self.id;
        store.setSession(self, payload.roomId || roomId);
        store.setPeers(this.membersToPeers(payload.members, self.id));
        store.setConnected(true);
        store.setConnecting(false);

        const turn = this.token ? await fetchTurnCredentials(this.token) : null;
        this.setupRtc(self.id, turn ?? undefined);
        this.reconcileLinks(payload.members);

        if (!settled) {
          settled = true;
          resolve();
        }
      });

      socket.on(
        'presence:update',
        (payload: { members: RoomMember[]; reason?: string; userId?: string }) => {
          const selfId = this.selfId;
          if (!selfId) return;
          store.setPeers(this.membersToPeers(payload.members, selfId));

          if (payload.reason === 'leave' && payload.userId) {
            this.rtc?.removePeer(payload.userId);
            this.linked.delete(payload.userId);
            this.linking.delete(payload.userId);
            void this.incoming.get(payload.userId)?.abort();
            this.incoming.delete(payload.userId);
            store.setPeerLinked(payload.userId, false);
          }

          this.reconcileLinks(payload.members);
        },
      );

      socket.on(
        'call:incoming',
        (payload: { fromUserId: string; fromName?: string; signal: RTCSessionDescriptionInit }) => {
          void this.onIncoming(payload.fromUserId, payload.signal);
        },
      );

      socket.on(
        'call:accepted',
        (payload: { fromUserId: string; signal: RTCSessionDescriptionInit }) => {
          this.linked.add(payload.fromUserId);
          this.linking.delete(payload.fromUserId);
          store.setPeerLinked(payload.fromUserId, true);
          void this.rtc?.handleAccepted(payload.fromUserId, payload.signal);
        },
      );

      socket.on('call:rejected', (payload: { fromUserId: string }) => {
        this.linking.delete(payload.fromUserId);
        this.linked.delete(payload.fromUserId);
        this.rtc?.removePeer(payload.fromUserId);
        store.setPeerLinked(payload.fromUserId, false);
      });

      socket.on('call:ended', (payload: { fromUserId: string }) => {
        this.linking.delete(payload.fromUserId);
        this.linked.delete(payload.fromUserId);
        this.rtc?.removePeer(payload.fromUserId);
        store.setPeerLinked(payload.fromUserId, false);
        store.removeRemoteStream(payload.fromUserId);
        void this.incoming.get(payload.fromUserId)?.abort();
        this.incoming.delete(payload.fromUserId);
      });

      socket.on('signal:ice', (payload: { fromUserId: string; candidate: RTCIceCandidateInit }) => {
        void this.rtc?.handleIce(payload.fromUserId, payload.candidate);
      });

      // Safety timeout if room:joined never arrives.
      setTimeout(() => {
        if (!settled) fail('Timed out waiting for room join.');
      }, 15_000);
    });
  }

  private membersToPeers(members: RoomMember[], selfId: string): Peer[] {
    return members
      .filter((m) => m.userId !== selfId)
      .map((m) => ({ id: m.userId, username: m.name }));
  }

  /**
   * hand-off-server allows one ringing/active call per user. We keep a single
   * P2P data link (needed for chat/files) with one peer at a time. The lower
   * userId is the deterministic initiator to avoid glare.
   */
  private reconcileLinks(members: RoomMember[]) {
    const selfId = this.selfId;
    if (!selfId || !this.rtc) return;

    const others = members.filter((m) => m.userId !== selfId);
    if (this.linked.size > 0 || this.linking.size > 0) return;

    // Prefer a single peer: first other member by stable userId order.
    const target = [...others].sort((a, b) => a.userId.localeCompare(b.userId))[0];
    if (!target) return;

    if (selfId < target.userId) {
      void this.beginLink(target.userId);
    }
  }

  private async beginLink(peerId: string) {
    if (!this.rtc || this.linked.has(peerId) || this.linking.has(peerId)) return;
    if (this.linked.size > 0 || this.linking.size > 0) return;
    this.linking.add(peerId);
    try {
      await this.rtc.invitePeer(peerId);
    } catch (err) {
      this.linking.delete(peerId);
      console.error('[session] invite failed', err);
    }
  }

  private async onIncoming(fromUserId: string, signal: RTCSessionDescriptionInit) {
    if (!this.rtc || !this.selfId) return;

    // Busy with someone else — reject.
    const busyWithOther =
      [...this.linked, ...this.linking].some((id) => id !== fromUserId);
    if (busyWithOther) {
      this.socket?.emit('call:reject', { toUserId: fromUserId });
      return;
    }

    this.linking.add(fromUserId);
    try {
      await this.rtc.handleIncoming(fromUserId, signal);
      this.linked.add(fromUserId);
      this.linking.delete(fromUserId);
      useStore.getState().setPeerLinked(fromUserId, true);
    } catch (err) {
      this.linking.delete(fromUserId);
      console.error('[session] accept failed', err);
      this.socket?.emit('call:reject', { toUserId: fromUserId });
    }
  }

  private setupRtc(selfId: string, turnServers?: RTCIceServer[]) {
    const iceServers: RTCIceServer[] = [
      { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
      ...(turnServers ?? []),
    ];

    this.rtc = new RTCManager({
      selfId,
      iceServers,
      signaling: {
        invite: (toUserId, signal) => this.socket?.emit('call:invite', { toUserId, signal }),
        accept: (toUserId, signal) => this.socket?.emit('call:accept', { toUserId, signal }),
        reject: (toUserId) => this.socket?.emit('call:reject', { toUserId }),
        end: (toUserId) => this.socket?.emit('call:end', { toUserId }),
        ice: (toUserId, candidate) => this.socket?.emit('signal:ice', { toUserId, candidate }),
      },
      onRemoteStream: (peerId, stream) => useStore.getState().setRemoteStream(peerId, stream),
      onRemoteStreamEnded: (peerId) => useStore.getState().removeRemoteStream(peerId),
      onData: (peerId, data) => {
        void this.handleData(peerId, data);
      },
      onDataChannelOpen: (peerId) => useStore.getState().setPeerLinked(peerId, true),
      onDataChannelClose: (peerId) => useStore.getState().setPeerLinked(peerId, false),
    });
  }

  private async handleData(peerId: string, data: string | ArrayBuffer) {
    const store = useStore.getState();

    if (typeof data === 'string') {
      let msg: DataChannelMessage;
      try {
        msg = JSON.parse(data) as DataChannelMessage;
      } catch {
        return;
      }

      if (msg.kind === 'chat') {
        const message: ChatMessage = {
          id: msg.id,
          senderId: peerId,
          username: store.peerName(peerId),
          text: msg.text,
          ts: msg.ts,
          mine: false,
        };
        store.addMessage(message);
        return;
      }

      if (msg.kind === 'file-meta') {
        const reassembler = await StreamingReassembler.create(msg);
        this.incoming.set(peerId, reassembler);
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
        return;
      }

      if (msg.kind === 'file-end') {
        const reassembler = this.incoming.get(peerId);
        if (!reassembler) return;
        try {
          const blob = await reassembler.finalize();
          const url = URL.createObjectURL(blob);
          store.patchFile(msg.id, { progress: 1, done: true, url });
        } catch (err) {
          store.patchFile(msg.id, {
            done: true,
            error: err instanceof Error ? err.message : 'Failed to assemble file',
          });
        }
        this.incoming.delete(peerId);
        return;
      }

      if (msg.kind === 'file-abort') {
        const reassembler = this.incoming.get(peerId);
        await reassembler?.abort();
        this.incoming.delete(peerId);
        store.patchFile(msg.id, {
          done: true,
          error: msg.reason || 'Transfer aborted',
        });
      }
      return;
    }

    const reassembler = this.incoming.get(peerId);
    if (reassembler) {
      await reassembler.push(data);
      store.patchFile(reassembler.meta.id, { progress: reassembler.progress });
    }
  }

  sendChat(text: string) {
    const clean = text.trim();
    if (!clean || !this.rtc) return;

    const store = useStore.getState();
    const id = makeFileId();
    const ts = Date.now();
    const message: ChatMessage = {
      id,
      senderId: store.self?.id ?? 'me',
      username: store.self?.username ?? 'Me',
      text: clean,
      ts,
      mine: true,
    };
    store.addMessage(message);

    if (!this.rtc.hasOpenChannels()) {
      store.setError('Waiting for a peer data link before chat can be delivered…');
      return;
    }

    const payload: DataChannelMessage = { kind: 'chat', id, text: clean, ts };
    this.rtc.broadcast(JSON.stringify(payload));
  }

  async shareFiles(files: FileList | File[]) {
    if (!this.rtc || !this.rtc.hasOpenChannels()) {
      throw new Error('No connected peers yet — wait for the peer data link to open.');
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
      try {
        await sendFile(this.rtc, id, file, (progress) =>
          store.patchFile(id, { progress, done: progress >= 1 }),
        );
      } catch (err) {
        store.patchFile(id, {
          done: true,
          error: err instanceof Error ? err.message : 'Transfer failed',
        });
        throw err;
      }
    }
  }

  async startCall(withVideo: boolean) {
    if (!this.rtc?.hasOpenChannels()) {
      throw new Error('Connect to a peer before starting a call.');
    }
    const store = useStore.getState();
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: withVideo ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
    });
    store.setLocalStream(stream);
    store.setMic(true);
    store.setCam(withVideo);
    store.setInCall(true);
    await this.rtc.setLocalStream(stream);
  }

  async leaveCall() {
    const store = useStore.getState();
    await this.rtc?.stopLocalStream();
    store.setLocalStream(null);
    store.setInCall(false);
    for (const id of Object.keys(store.remoteStreams)) store.removeRemoteStream(id);
  }

  toggleMic() {
    const store = useStore.getState();
    const stream = store.localStream;
    if (!stream) return;
    const next = !store.micEnabled;
    stream.getAudioTracks().forEach((t) => {
      t.enabled = next;
    });
    store.setMic(next);
  }

  toggleCam() {
    const store = useStore.getState();
    const stream = store.localStream;
    if (!stream) return;
    const next = !store.camEnabled;
    stream.getVideoTracks().forEach((t) => {
      t.enabled = next;
    });
    store.setCam(next);
  }

  leaveRoom() {
    void this.leaveCall();
    this.disposeConnections();
    useStore.getState().resetRoom();
  }

  hasDataLink(): boolean {
    return Boolean(this.rtc?.hasOpenChannels());
  }
}

export const session = new Session();
