/**
 * A small WebRTC mesh manager.
 *
 * It maintains one `RTCPeerConnection` per remote peer in the room, using the
 * "perfect negotiation" pattern so either side can (re)negotiate safely — e.g.
 * when media tracks are added/removed for a call. Each connection also carries
 * a reliable `RTCDataChannel` used for peer-to-peer file transfer.
 *
 * Signaling (SDP + ICE) is relayed through the caller-provided `sendSignal`,
 * which in this app is a socket.io message routed to a specific peer.
 */

const STUN_SERVERS: RTCIceServer[] = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
];

const DATA_CHANNEL_LABEL = 'handoff';

export interface RTCManagerCallbacks {
  selfId: string;
  sendSignal: (to: string, data: unknown) => void;
  onRemoteStream: (peerId: string, stream: MediaStream) => void;
  onRemoteStreamEnded: (peerId: string) => void;
  onData: (peerId: string, data: string | ArrayBuffer) => void;
  onDataChannelOpen?: (peerId: string) => void;
}

interface PeerState {
  pc: RTCPeerConnection;
  dc: RTCDataChannel | null;
  makingOffer: boolean;
  ignoreOffer: boolean;
  polite: boolean;
}

export class RTCManager {
  private peers = new Map<string, PeerState>();
  private localStream: MediaStream | null = null;

  constructor(private cb: RTCManagerCallbacks) {}

  /** Create (or reuse) a connection to a peer and start negotiation if needed. */
  ensurePeer(peerId: string): PeerState {
    const existing = this.peers.get(peerId);
    if (existing) return existing;

    const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });
    // The peer with the lexicographically smaller id is the "polite" one.
    const polite = this.cb.selfId < peerId;
    const state: PeerState = { pc, dc: null, makingOffer: false, ignoreOffer: false, polite };
    this.peers.set(peerId, state);

    pc.onnegotiationneeded = async () => {
      try {
        state.makingOffer = true;
        await pc.setLocalDescription();
        this.cb.sendSignal(peerId, { description: pc.localDescription });
      } catch (err) {
        console.error('[rtc] negotiation error', err);
      } finally {
        state.makingOffer = false;
      }
    };

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) this.cb.sendSignal(peerId, { candidate });
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
      if (pc.connectionState === 'failed') {
        pc.restartIce();
      }
    };

    // The impolite peer opens the data channel; this triggers the initial
    // offer via `onnegotiationneeded` and avoids both sides opening one.
    if (!polite) {
      const dc = pc.createDataChannel(DATA_CHANNEL_LABEL, { ordered: true });
      this.attachDataChannel(peerId, state, dc);
    }

    // If a call is already in progress, publish our media to the new peer.
    if (this.localStream) {
      for (const track of this.localStream.getTracks()) {
        pc.addTrack(track, this.localStream);
      }
    }

    return state;
  }

  private attachDataChannel(peerId: string, state: PeerState, dc: RTCDataChannel) {
    dc.binaryType = 'arraybuffer';
    state.dc = dc;
    dc.onopen = () => this.cb.onDataChannelOpen?.(peerId);
    dc.onmessage = (event) => this.cb.onData(peerId, event.data);
  }

  async handleSignal(from: string, data: { description?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit }) {
    const state = this.ensurePeer(from);
    const { pc } = state;

    try {
      if (data.description) {
        const desc = data.description;
        const offerCollision =
          desc.type === 'offer' && (state.makingOffer || pc.signalingState !== 'stable');

        state.ignoreOffer = !state.polite && offerCollision;
        if (state.ignoreOffer) return;

        await pc.setRemoteDescription(desc);
        if (desc.type === 'offer') {
          await pc.setLocalDescription();
          this.cb.sendSignal(from, { description: pc.localDescription });
        }
      } else if (data.candidate) {
        try {
          await pc.addIceCandidate(data.candidate);
        } catch (err) {
          if (!state.ignoreOffer) throw err;
        }
      }
    } catch (err) {
      console.error('[rtc] signal handling error', err);
    }
  }

  /** Send data to every peer with an open data channel. */
  broadcast(data: string | ArrayBuffer) {
    for (const { dc } of this.peers.values()) {
      if (dc && dc.readyState === 'open') {
        dc.send(data as ArrayBuffer);
      }
    }
  }

  hasOpenChannels(): boolean {
    for (const { dc } of this.peers.values()) {
      if (dc && dc.readyState === 'open') return true;
    }
    return false;
  }

  /** Largest send-buffer backlog across all open data channels (for backpressure). */
  maxBufferedAmount(): number {
    let max = 0;
    for (const { dc } of this.peers.values()) {
      if (dc && dc.readyState === 'open') max = Math.max(max, dc.bufferedAmount);
    }
    return max;
  }

  /** Start (or update) publishing local media to every peer. */
  setLocalStream(stream: MediaStream) {
    this.localStream = stream;
    for (const { pc } of this.peers.values()) {
      const existing = new Set(pc.getSenders().map((s) => s.track));
      for (const track of stream.getTracks()) {
        if (!existing.has(track)) pc.addTrack(track, stream);
      }
    }
  }

  /** Stop publishing local media and renegotiate. */
  stopLocalStream() {
    for (const { pc } of this.peers.values()) {
      for (const sender of pc.getSenders()) {
        if (sender.track) pc.removeTrack(sender);
      }
    }
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.localStream = null;
  }

  removePeer(peerId: string) {
    const state = this.peers.get(peerId);
    if (!state) return;
    state.dc?.close();
    state.pc.close();
    this.peers.delete(peerId);
  }

  destroy() {
    for (const id of [...this.peers.keys()]) this.removePeer(id);
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.localStream = null;
  }
}
