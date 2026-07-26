/**
 * WebRTC peer manager for hand-off-server v2.
 *
 * Signaling uses the server call state machine (invite → accept + ICE).
 * Each linked peer gets one RTCPeerConnection with:
 *   - a reliable data channel (chat + file bytes; never Socket.IO)
 *   - audio/video sendrecv transceivers so media can be added later via
 *     replaceTrack without SDP renegotiation (the server has no mid-call SDP path)
 */

const DEFAULT_STUN: RTCIceServer[] = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
];

const DATA_CHANNEL_LABEL = 'handoff';

function descriptionInit(desc: RTCSessionDescription | null): RTCSessionDescriptionInit {
  if (!desc) throw new Error('missing local description');
  return { type: desc.type, sdp: desc.sdp };
}

function candidateInit(candidate: RTCIceCandidate): RTCIceCandidateInit {
  return candidate.toJSON();
}

export interface RTCSignaling {
  invite: (toUserId: string, signal: RTCSessionDescriptionInit) => void;
  accept: (toUserId: string, signal: RTCSessionDescriptionInit) => void;
  reject: (toUserId: string) => void;
  end: (toUserId: string) => void;
  ice: (toUserId: string, candidate: RTCIceCandidateInit) => void;
}

export interface RTCManagerCallbacks {
  selfId: string;
  signaling: RTCSignaling;
  iceServers?: RTCIceServer[];
  onRemoteStream: (peerId: string, stream: MediaStream) => void;
  onRemoteStreamEnded: (peerId: string) => void;
  onData: (peerId: string, data: string | ArrayBuffer) => void;
  onDataChannelOpen?: (peerId: string) => void;
  onDataChannelClose?: (peerId: string) => void;
  onPeerConnectionState?: (peerId: string, state: RTCPeerConnectionState) => void;
}

interface PeerState {
  pc: RTCPeerConnection;
  dc: RTCDataChannel | null;
  /** True when we sent call:invite for this peer. */
  isInitiator: boolean;
  /** Remote description applied (offer or answer). */
  remoteSet: boolean;
  audioSender: RTCRtpSender | null;
  videoSender: RTCRtpSender | null;
}

export class RTCManager {
  private peers = new Map<string, PeerState>();
  private localStream: MediaStream | null = null;
  private iceServers: RTCIceServer[];

  constructor(private cb: RTCManagerCallbacks) {
    this.iceServers = cb.iceServers?.length ? cb.iceServers : DEFAULT_STUN;
  }

  setIceServers(servers: RTCIceServer[]) {
    this.iceServers = servers.length ? servers : DEFAULT_STUN;
  }

  /** Begin a link as the caller: create offer and emit call:invite. */
  async invitePeer(peerId: string): Promise<void> {
    if (this.peers.has(peerId)) return;

    const state = this.createPeer(peerId, true);
    const offer = await state.pc.createOffer();
    await state.pc.setLocalDescription(offer);
    this.cb.signaling.invite(peerId, descriptionInit(state.pc.localDescription));
  }

  /** Handle call:incoming — set remote offer, answer via call:accept. */
  async handleIncoming(peerId: string, signal: RTCSessionDescriptionInit): Promise<void> {
    // If we already initiated toward this peer, ignore a colliding invite
    // (deterministic initiator is decided by userId ordering in Session).
    if (this.peers.has(peerId) && this.peers.get(peerId)!.isInitiator) {
      this.cb.signaling.reject(peerId);
      return;
    }

    const state = this.peers.get(peerId) ?? this.createPeer(peerId, false);
    await state.pc.setRemoteDescription(signal);
    state.remoteSet = true;
    // Offer m-lines create the answerer's transceivers — capture senders now.
    this.captureSenders(state);
    this.publishLocalTo(state);

    const answer = await state.pc.createAnswer();
    await state.pc.setLocalDescription(answer);
    this.cb.signaling.accept(peerId, descriptionInit(state.pc.localDescription));
  }

  /** Handle call:accepted — apply remote answer. */
  async handleAccepted(peerId: string, signal: RTCSessionDescriptionInit): Promise<void> {
    const state = this.peers.get(peerId);
    if (!state) return;
    await state.pc.setRemoteDescription(signal);
    state.remoteSet = true;
  }

  async handleIce(peerId: string, candidate: RTCIceCandidateInit): Promise<void> {
    const state = this.peers.get(peerId) ?? this.createPeer(peerId, false);
    try {
      await state.pc.addIceCandidate(candidate);
    } catch (err) {
      // Candidates can race ahead of setRemoteDescription; ignore transient failures.
      if (!state.remoteSet) return;
      console.error('[rtc] addIceCandidate failed', err);
    }
  }

  private createPeer(peerId: string, isInitiator: boolean): PeerState {
    const existing = this.peers.get(peerId);
    if (existing) return existing;

    const pc = new RTCPeerConnection({ iceServers: this.iceServers });
    const state: PeerState = {
      pc,
      dc: null,
      isInitiator,
      remoteSet: false,
      audioSender: null,
      videoSender: null,
    };
    this.peers.set(peerId, state);

    // Only the initiator pre-creates sendrecv transceivers (so media can be
    // swapped in later via replaceTrack). The answerer adopts m-lines from the offer.
    if (isInitiator) {
      const audio = pc.addTransceiver('audio', { direction: 'sendrecv' });
      const video = pc.addTransceiver('video', { direction: 'sendrecv' });
      state.audioSender = audio.sender;
      state.videoSender = video.sender;
    }

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) this.cb.signaling.ice(peerId, candidateInit(candidate));
    };

    pc.ontrack = (event) => {
      const [stream] = event.streams;
      const remote = stream ?? new MediaStream([event.track]);
      this.cb.onRemoteStream(peerId, remote);
      event.track.addEventListener('ended', () => {
        if (remote.getTracks().every((t) => t.readyState === 'ended')) {
          this.cb.onRemoteStreamEnded(peerId);
        }
      });
    };

    pc.ondatachannel = (event) => {
      this.attachDataChannel(peerId, state, event.channel);
    };

    pc.onconnectionstatechange = () => {
      this.cb.onPeerConnectionState?.(peerId, pc.connectionState);
      if (pc.connectionState === 'failed') {
        pc.restartIce();
      }
    };

    if (isInitiator) {
      const dc = pc.createDataChannel(DATA_CHANNEL_LABEL, { ordered: true });
      this.attachDataChannel(peerId, state, dc);
    }

    this.publishLocalTo(state);
    return state;
  }

  private attachDataChannel(peerId: string, state: PeerState, dc: RTCDataChannel) {
    dc.binaryType = 'arraybuffer';
    dc.bufferedAmountLowThreshold = 256 * 1024;
    state.dc = dc;
    dc.onopen = () => this.cb.onDataChannelOpen?.(peerId);
    dc.onclose = () => this.cb.onDataChannelClose?.(peerId);
    dc.onmessage = (event) => this.cb.onData(peerId, event.data);
  }

  private captureSenders(state: PeerState) {
    for (const t of state.pc.getTransceivers()) {
      const kind = t.receiver.track?.kind || t.sender.track?.kind;
      if (kind === 'audio') state.audioSender = t.sender;
      if (kind === 'video') state.videoSender = t.sender;
    }
    // Initiator offers always add audio then video; use that order as fallback.
    const ts = state.pc.getTransceivers();
    if (!state.audioSender && ts[0]) state.audioSender = ts[0].sender;
    if (!state.videoSender && ts[1]) state.videoSender = ts[1].sender;
  }

  private publishLocalTo(state: PeerState) {
    if (!this.localStream) return;
    if (!state.audioSender || !state.videoSender) this.captureSenders(state);
    const audio = this.localStream.getAudioTracks()[0] ?? null;
    const video = this.localStream.getVideoTracks()[0] ?? null;
    void state.audioSender?.replaceTrack(audio);
    void state.videoSender?.replaceTrack(video);
  }

  /** Send to every peer with an open data channel. */
  broadcast(data: string | ArrayBuffer) {
    for (const { dc } of this.peers.values()) {
      if (dc && dc.readyState === 'open') {
        if (typeof data === 'string') dc.send(data);
        else dc.send(data);
      }
    }
  }

  send(peerId: string, data: string | ArrayBuffer): boolean {
    const dc = this.peers.get(peerId)?.dc;
    if (!dc || dc.readyState !== 'open') return false;
    if (typeof data === 'string') dc.send(data);
    else dc.send(data);
    return true;
  }

  getDataChannel(peerId: string): RTCDataChannel | null {
    return this.peers.get(peerId)?.dc ?? null;
  }

  openChannels(): RTCDataChannel[] {
    const channels: RTCDataChannel[] = [];
    for (const { dc } of this.peers.values()) {
      if (dc && dc.readyState === 'open') channels.push(dc);
    }
    return channels;
  }

  hasOpenChannels(): boolean {
    return this.openChannels().length > 0;
  }

  linkedPeerIds(): string[] {
    return [...this.peers.keys()];
  }

  maxBufferedAmount(): number {
    let max = 0;
    for (const dc of this.openChannels()) {
      max = Math.max(max, dc.bufferedAmount);
    }
    return max;
  }

  /** Publish (or update) local media via replaceTrack — no SDP renegotiation. */
  async setLocalStream(stream: MediaStream) {
    this.localStream = stream;
    const audio = stream.getAudioTracks()[0] ?? null;
    const video = stream.getVideoTracks()[0] ?? null;
    await Promise.all(
      [...this.peers.values()].map(async (state) => {
        await state.audioSender?.replaceTrack(audio);
        await state.videoSender?.replaceTrack(video);
      }),
    );
  }

  async stopLocalStream() {
    await Promise.all(
      [...this.peers.values()].map(async (state) => {
        await state.audioSender?.replaceTrack(null);
        await state.videoSender?.replaceTrack(null);
      }),
    );
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.localStream = null;
  }

  endPeer(peerId: string, notify = true) {
    if (notify && this.peers.has(peerId)) {
      this.cb.signaling.end(peerId);
    }
    this.removePeer(peerId);
  }

  removePeer(peerId: string) {
    const state = this.peers.get(peerId);
    if (!state) return;
    try {
      state.dc?.close();
    } catch {
      /* ignore */
    }
    try {
      state.pc.close();
    } catch {
      /* ignore */
    }
    this.peers.delete(peerId);
  }

  destroy(notify = false) {
    for (const id of [...this.peers.keys()]) {
      if (notify) this.cb.signaling.end(id);
      this.removePeer(id);
    }
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.localStream = null;
  }
}
