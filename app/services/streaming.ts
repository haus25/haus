// Simplified streaming service - NO BACKEND REQUIRED
export interface StreamSession {
  streamUrl: string;
  playUrl: string;
  whipUrl: string;
  whepUrl: string;
  sessionId: string;
}

export interface StreamStatus {
  isLive: boolean;
  viewerCount: number;
  hasAccess: boolean;
}

class StreamingService {
  private currentStream: MediaStream | null = null;
  private peerConnection: RTCPeerConnection | null = null;
  private videoElement: HTMLVideoElement | null = null;

  constructor() {
    console.log('STREAMING: Simplified service initialized - no backend required');
  }

  /**
   * Get current media stream (for creator preview)
   */
  getCurrentStream(): MediaStream | null {
    return this.currentStream;
  }

  /**
   * Generate stream URLs directly (no backend needed)
   */
  generateStreamUrls(eventId: string): StreamSession {
    const sessionId = `event_${eventId}_${Date.now()}`;
    
    return {
      streamUrl: `rtmp://room.haus25.live:1935/live/${eventId}`,
      playUrl: `https://room.haus25.live:8080/live/${eventId}.flv`,
      whipUrl: `https://room.haus25.live/rtc/v1/whip/?app=live&stream=${eventId}`,
      whepUrl: `https://room.haus25.live/rtc/v1/whep/?app=live&stream=${eventId}`,
      sessionId
    };
  }

  /**
   * Generate event room URL directly
   */
  generateEventRoomUrl(eventId: string): string {
    if (typeof window !== 'undefined') {
      const isProductionDomain = window.location.hostname.includes('haus25.live');
      if (isProductionDomain) {
        return `https://room.haus25.live/${eventId}`;
      } else {
        return `http://localhost:3000/room/${eventId}`;
      }
    } else {
      return process.env.NODE_ENV === 'production' 
        ? `https://room.haus25.live/${eventId}`
        : `http://localhost:3000/room/${eventId}`;
    }
  }

  /**
   * Reserve stream URLs (simplified - just returns generated URLs)
   */
  async reserveStreamUrl(eventId: string, startTime: string, duration: number): Promise<{
    success: boolean;
    streamUrls: StreamSession;
    eventRoomUrl: string;
  }> {
    console.log('STREAMING: Generating stream URLs directly for event', eventId);
    
    const streamUrls = this.generateStreamUrls(eventId);
    const roomUrl = this.generateEventRoomUrl(eventId);
    
    return {
      success: true,
      streamUrls,
      eventRoomUrl: roomUrl
    };
  }

    /**
   * Get current WebRTC connection state
   */
  getConnectionState(): {
    isConnected: boolean;
    isPublishing: boolean;
    isViewing: boolean;
    connectionState: string;
  } {
    const connectionState = this.peerConnection?.connectionState || 'closed';
    const isConnected = connectionState === 'connected';
    
    return {
      isConnected,
      isPublishing: isConnected && !!this.currentStream,
      isViewing: isConnected && !!this.videoElement,
      connectionState
    };
  }

  /**
   * Get lightweight viewer count from SRS API
   */
  async getViewerCount(eventId: string): Promise<number> {
    try {
      const response = await fetch('https://room.haus25.live/srs-api/v1/streams', {
        signal: AbortSignal.timeout(3000),
        headers: { 'Accept': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error(`SRS API responded with status: ${response.status}`);
      }

      const srsData = await response.json();
      const streams = srsData.streams || [];
      
      // Find stream matching our event ID
      const matchingStream = streams.find((stream: any) => 
        (stream.app === 'live') && 
        (stream.stream === eventId || stream.name === eventId)
      );
      
      return matchingStream?.clients || 0;
    } catch (error) {
      console.warn('STREAMING: Error getting viewer count:', error);
      return 0;
    }
  }

  /**
   * Simple status check - primarily uses WebRTC connection state
   */
  async checkStreamStatus(eventId: string): Promise<{
    isLive: boolean;
    available: boolean;
    isActive: boolean;
    hasEnded: boolean;
    viewerCount?: number;
    publisherConnected?: boolean;
  }> {
    // Primary source of truth: WebRTC connection state
    const connectionState = this.getConnectionState();
    
    // For publishers, they are live if they're connected and publishing
    // For viewers, stream is live if they're successfully viewing
    const isLive = connectionState.isPublishing || connectionState.isViewing;
    
    console.log('STREAMING: Status based on WebRTC state:', {
      eventId,
      isLive,
      connectionState: connectionState.connectionState,
      isPublishing: connectionState.isPublishing,
      isViewing: connectionState.isViewing
    });
    
    return {
      isLive,
      available: true,
      isActive: isLive,
      hasEnded: false,
      viewerCount: 0, // Use separate getViewerCount method
      publisherConnected: connectionState.isPublishing
    };
  }



  /**
   * Get stream information directly (simplified)
   */
  async getStreamInfo(eventId: string): Promise<{
    streamUrls: StreamSession;
    eventRoomUrl: string;
    isLive: boolean;
    available: boolean;
  }> {
    console.log('STREAMING: Getting stream info for event', eventId);
    
    const streamUrls = this.generateStreamUrls(eventId);
    const status = await this.checkStreamStatus(eventId);
    
    return {
      streamUrls,
      eventRoomUrl: this.generateEventRoomUrl(eventId),
      isLive: status.isLive,
      available: status.available
    };
  }

  /**
   * Start publishing stream (Creator mode)
   */
  async startPublishing(eventId: string, constraints?: MediaStreamConstraints): Promise<StreamSession> {
    try {
      console.log('STREAMING: Starting publishing for event', eventId);

      // Get user media
      const defaultConstraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: { ideal: 48000 }
        }
      };

      this.currentStream = await navigator.mediaDevices.getUserMedia(
        constraints || defaultConstraints
      );

      // Generate stream URLs
      const streamUrls = this.generateStreamUrls(eventId);
      
      // Set up WebRTC connection for WHIP (WebRTC-HTTP Ingestion Protocol)
      this.peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ],
        bundlePolicy: 'max-bundle'
      });

      // Monitor connection state changes
      this.peerConnection.onconnectionstatechange = () => {
        const state = this.peerConnection?.connectionState;
        console.log('STREAMING: WebRTC connection state changed to:', state);
        
        if (state === 'failed' || state === 'disconnected') {
          console.warn('STREAMING: Connection lost, attempting to reconnect...');
        }
      };

      // Add stream tracks to peer connection
      this.currentStream.getTracks().forEach(track => {
        if (this.peerConnection && this.currentStream) {
          this.peerConnection.addTrack(track, this.currentStream);
        }
      });

      // Create offer and send to SRS via WHIP
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      await this.sendOfferToSRS(streamUrls.whipUrl, offer);

      console.log('STREAMING: Successfully started publishing');
      return streamUrls;

    } catch (error) {
      console.error('STREAMING: Error starting publishing:', error);
      throw new Error(`Failed to start publishing: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Start playing stream (Viewer mode)
   */
  async startPlaying(eventId: string, videoElement: HTMLVideoElement): Promise<StreamSession> {
    try {
      console.log('STREAMING: Starting playback for event', eventId);
      
      this.videoElement = videoElement;
      
      // Generate stream URLs
      const streamUrls = this.generateStreamUrls(eventId);
      
      // Set up WebRTC connection for WHEP (WebRTC-HTTP Egress Protocol)
      this.peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ],
        bundlePolicy: 'max-bundle'
      });

      // Monitor connection state changes
      this.peerConnection.onconnectionstatechange = () => {
        const state = this.peerConnection?.connectionState;
        console.log('STREAMING: WebRTC connection state changed to:', state);
        
        if (state === 'failed' || state === 'disconnected') {
          console.warn('STREAMING: Viewer connection lost');
        }
      };

      // Handle incoming stream
      this.peerConnection.ontrack = (event) => {
        console.log('STREAMING: Received remote track');
        if (this.videoElement && event.streams[0]) {
          this.videoElement.srcObject = event.streams[0];
        }
      };

      // Create offer for receiving stream via WHEP
      this.peerConnection.addTransceiver('video', { direction: 'recvonly' });
      this.peerConnection.addTransceiver('audio', { direction: 'recvonly' });
      
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      await this.sendOfferToSRS(streamUrls.whepUrl, offer);

      console.log('STREAMING: Successfully started playing');
      return streamUrls;

    } catch (error) {
      console.error('STREAMING: Error starting playback:', error);
      throw new Error(`Failed to start playback: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Stop streaming
   */
  async stopStreaming(): Promise<void> {
    try {
      console.log('STREAMING: Stopping stream');

      // Stop all tracks
      if (this.currentStream) {
        this.currentStream.getTracks().forEach(track => track.stop());
        this.currentStream = null;
      }

      // Close peer connection
      if (this.peerConnection) {
        this.peerConnection.close();
        this.peerConnection = null;
      }

      // Clear video element
      if (this.videoElement) {
        this.videoElement.srcObject = null;
        this.videoElement = null;
      }

      console.log('STREAMING: Stream stopped successfully');

    } catch (error) {
      console.error('STREAMING: Error stopping stream:', error);
      throw error;
    }
  }

  /**
   * Toggle video track
   */
  toggleVideo(enabled: boolean): void {
    if (this.currentStream) {
      const videoTracks = this.currentStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  /**
   * Toggle audio track
   */
  toggleAudio(enabled: boolean): void {
    if (this.currentStream) {
      const audioTracks = this.currentStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = enabled;
      });
    }
  }



  /**
   * Send offer to SRS server via WHIP/WHEP (private method)
   */
  private async sendOfferToSRS(url: string, offer: RTCSessionDescriptionInit): Promise<void> {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/sdp',
          'Accept': 'application/sdp'
        },
        body: offer.sdp
      });

      if (!response.ok) {
        throw new Error(`SRS server responded with status: ${response.status}`);
      }

      const answerSdp = await response.text();
      const answer: RTCSessionDescriptionInit = {
        type: 'answer',
        sdp: answerSdp
      };

      if (this.peerConnection) {
        await this.peerConnection.setRemoteDescription(answer);
      }

      console.log('STREAMING: Successfully exchanged SDP with SRS');

    } catch (error) {
      console.error('STREAMING: Error sending offer to SRS:', error);
      throw error;
    }
  }
}

// Create singleton instance
export const streamingService = new StreamingService();
