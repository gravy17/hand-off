# Backend discussion notes (hand-off-server)

Frontend work in this PR targets [hand-off-server PR #10](https://github.com/gravy17/hand-off-server/pull/10)
**without** changing that repo. These are the gaps that still limit feature parity
with the old mesh model. Discuss before implementing server-side.

## What works today (no server changes)

| Feature | Approach |
| --- | --- |
| Auth / rooms / presence | JWT handshake + `room:joined` / `presence:update` |
| 1:1 WebRTC link | `call:invite` → `call:accept` + `signal:ice` |
| Chat | WebRTC data channel only (no Socket.IO chat) |
| File transfer (any size) | WebRTC data channel + SCTP backpressure; OPFS on receive |
| A/V after link | Pre-created audio/video transceivers + `replaceTrack` |

## Gaps that need server changes for full parity

1. **Mesh / multi-peer data links**  
   The call registry allows **one** ringing/active call per `userId`. A room with
   3+ people cannot keep simultaneous P2P links to every peer. Today the client
   auto-links to a single peer.

   *Possible server change:* concurrent “data sessions” per peer pair that do not
   consume the A/V call slot, **or** allowlisted `signal:sdp` relay without the
   one-call-per-user lock.

2. **Mid-call SDP renegotiation**  
   Only the invite offer and accept answer carry SDP. Perfect negotiation /
   track add/remove via new offers is impossible.

   *Possible server change:* `signal:sdp` (or generic `signal`) relay while a
   call/session is active. The client currently avoids this with `replaceTrack`.

3. **Room-wide chat without a data link**  
   Chat no longer has a Socket.IO relay. Until a WebRTC link is up, messages
   cannot be delivered (and cannot fan out to unlinked peers).

   *Possible server change:* optional room-scoped `chat` event (rate-limited,
   size-capped), or accept chat-only over data channels as the product rule.

4. **SDP payload headroom**  
   Default `MAX_PAYLOAD_BYTES=16384` is usually enough for a 2-m-line offer, but
   heavy codec lists can approach the limit.

   *Possible server change:* raise the default (e.g. 64 KiB) or document a
   recommended floor for browser SDPs.

## Preference

File bytes and chat content should stay off Socket.IO. Any server additions
should be signaling/control only.
