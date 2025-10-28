// src/services/webRTCService.ts

import { type Socket } from 'socket.io-client';

// Configuration for ICE servers. Using public STUN servers from Google.
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export class WebRTCService {
  private socket: Socket;
  private peerConnections: { [peerId: string]: RTCPeerConnection } = {};
  private localStream: MediaStream | null = null;

  // Callbacks to update React components
  private onLocalStream: (stream: MediaStream) => void;
  private onRemoteStream: (stream: MediaStream, peerId: string) => void;
  private onPeerDisconnect: (peerId: string) => void;
  private onPeerStatusChange: (peerId: string, status: string) => void;
  private onMediaError: (error: Error) => void;

  constructor(
    socket: Socket,
    onLocalStream: (stream: MediaStream) => void,
    onRemoteStream: (stream: MediaStream, peerId: string) => void,
    onPeerDisconnect: (peerId: string) => void,
    onPeerStatusChange: (peerId: string, status: string) => void,
    onMediaError: (error: Error) => void
  ) {
    this.socket = socket;
    this.onLocalStream = onLocalStream;
    this.onRemoteStream = onRemoteStream;
    this.onPeerDisconnect = onPeerDisconnect;
    this.onPeerStatusChange = onPeerStatusChange;
    this.onMediaError = onMediaError;
  }

  public init(): void {
    this.socket.on('webrtc-offer', this.handleOffer);
    this.socket.on('webrtc-answer', this.handleAnswer);
    this.socket.on('webrtc-ice-candidate', this.handleIceCandidate);
  }

  public async startLocalStream(): Promise<void> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      this.onLocalStream(this.localStream);
    } catch (error) {
      console.error('Error accessing media devices:', error);
      if (error instanceof Error) {
        this.onMediaError(error);
      }
    }
  }

  public callUser(peerId: string): void {
    if (!this.localStream) {
      console.warn('Cannot call user before starting local stream.');
      return;
    }
    const pc = this.createPeerConnection(peerId);
    pc.createOffer()
      .then(offer => pc.setLocalDescription(offer))
      .then(() => {
        this.socket.emit('webrtc-offer', { to: peerId, offer: pc.localDescription });
      })
      .catch(e => console.error(`Error creating offer for ${peerId}:`, e));
  }

  private createPeerConnection(peerId: string): RTCPeerConnection {
    if (this.peerConnections[peerId]) {
      this.peerConnections[peerId].close();
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    this.peerConnections[peerId] = pc;

    this.localStream?.getTracks().forEach(track => {
      pc.addTrack(track, this.localStream!);
    });

    pc.onicecandidate = event => {
      if (event.candidate) {
        this.socket.emit('webrtc-ice-candidate', { to: peerId, candidate: event.candidate });
      }
    };

    pc.ontrack = event => {
      this.onRemoteStream(event.streams[0], peerId);
    };

    pc.onconnectionstatechange = () => {
      const status = pc.connectionState;
      this.onPeerStatusChange(peerId, status); // Report status change
      if (status === 'disconnected' || status === 'closed' || status === 'failed') {
        this.closeConnection(peerId);
      }
    };

    return pc;
  }

  private handleOffer = ({ from, offer }: { from: string; offer: RTCSessionDescriptionInit }) => {
    const pc = this.createPeerConnection(from);
    pc.setRemoteDescription(new RTCSessionDescription(offer))
      .then(() => pc.createAnswer())
      .then(answer => pc.setLocalDescription(answer))
      .then(() => {
        this.socket.emit('webrtc-answer', { to: from, answer: pc.localDescription });
      })
      .catch(e => console.error(`Error handling offer from ${from}:`, e));
  };

  private handleAnswer = ({ from, answer }: { from: string; answer: RTCSessionDescriptionInit }) => {
    const pc = this.peerConnections[from];
    if (pc) {
      pc.setRemoteDescription(new RTCSessionDescription(answer))
        .catch(e => console.error(`Error handling answer from ${from}:`, e));
    }
  };

  private handleIceCandidate = ({ from, candidate }: { from: string; candidate: RTCIceCandidateInit }) => {
    const pc = this.peerConnections[from];
    if (pc) {
      pc.addIceCandidate(new RTCIceCandidate(candidate))
        .catch(e => console.error(`Error adding ICE candidate from ${from}:`, e));
    }
  };

  public closeConnection = (peerId: string) => {
    const pc = this.peerConnections[peerId];
    if (pc) {
      pc.close();
      delete this.peerConnections[peerId];
      this.onPeerDisconnect(peerId);
      console.log(`WebRTC connection with ${peerId} closed.`);
    }
  };

  public toggleAudio(): boolean {
    if (!this.localStream) return false;
    const audioTrack = this.localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      return audioTrack.enabled;
    }
    return false;
  }

  public toggleVideo(): boolean {
    if (!this.localStream) return false;
    const videoTrack = this.localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      return videoTrack.enabled;
    }
    return false;
  }

  public destroy(): void {
    this.localStream?.getTracks().forEach(track => track.stop());
    Object.keys(this.peerConnections).forEach(this.closeConnection);
    this.socket.off('webrtc-offer', this.handleOffer);
    this.socket.off('webrtc-answer', this.handleAnswer);
    this.socket.off('webrtc-ice-candidate', this.handleIceCandidate);
    console.log('WebRTC service destroyed.');
  }
}
