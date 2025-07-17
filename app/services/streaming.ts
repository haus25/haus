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
   * Check stream status directly from SRS API
   */
  async checkStreamStatus(eventId: string): Promise<{
    isLive: boolean;
    available: boolean;
    isActive: boolean;
    hasEnded: boolean;
  }> {
    try {
      const srsApiUrl = 'https://room.haus25.live/srs-api/v1/streams/';
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(srsApiUrl, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`SRS API responded with status: ${response.status}`);
      }

      const srsData = await response.json();
      
      const isLive = srsData.streams?.some((stream: any) => 
        stream.app === 'live' && stream.stream === eventId
      ) || false;
      
      console.log('STREAMING: Direct SRS status check:', { eventId, isLive });
      
      return {
        isLive,
        available: true,
        isActive: isLive,
        hasEnded: false
      };

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('STREAMING: SRS status check timed out');
      } else {
        console.warn('STREAMING: Error checking SRS status:', error);
      }
      
      return {
        isLive: false,
        available: true,
        isActive: false,
        hasEnded: false
      };
    }
  }

  /**
   * Check if an event is currently valid to stream based on blockchain timing
   */
  async checkEventTiming(eventId: string): Promise<{
    canStream: boolean;
    status: 'upcoming' | 'live' | 'ended';
    timeUntilStart?: number;
    timeUntilEnd?: number;
    startDate: Date;
    endDate: Date;
  }> {
    try {
      // Get event data from blockchain (this is your scheduling system!)
      const { createEventFactoryService } = await import('./create');
      const eventService = createEventFactoryService();
      const eventDetails = await eventService.getEventDetails(parseInt(eventId));
      
      const now = new Date();
      const startDate = new Date(eventDetails.startDate * 1000); // Convert from Unix
      const endDate = new Date(startDate.getTime() + eventDetails.eventDuration * 60 * 1000);
      
      let status: 'upcoming' | 'live' | 'ended';
      let canStream = false;
      
      if (now < startDate) {
        status = 'upcoming';
        canStream = false; // Event hasn't started yet
      } else if (now <= endDate) {
        status = 'live';
        canStream = true; // Event is currently live
      } else {
        status = 'ended';
        canStream = false; // Event has ended
      }
      
      return {
        canStream,
        status,
        timeUntilStart: status === 'upcoming' ? startDate.getTime() - now.getTime() : undefined,
        timeUntilEnd: status === 'live' ? endDate.getTime() - now.getTime() : undefined,
        startDate,
        endDate
      };
      
    } catch (error) {
      console.error('STREAMING: Error checking event timing:', error);
      // Fallback: allow streaming (fail open)
      return {
        canStream: true,
        status: 'live',
        startDate: new Date(),
        endDate: new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now
      };
    }
  }

  /**
   * Get stream URLs with timing validation
   */
  async getStreamUrlsWithTiming(eventId: string): Promise<{
    streamUrls: StreamSession;
    eventRoomUrl: string;
    timing: {
      canStream: boolean;
      status: 'upcoming' | 'live' | 'ended';
      timeUntilStart?: number;
      timeUntilEnd?: number;
      startDate: Date;
      endDate: Date;
    };
    isLive: boolean;
    available: boolean;
  }> {
    console.log('STREAMING: Getting stream URLs with blockchain timing validation');
    
    const [streamUrls, timing, liveStatus] = await Promise.all([
      Promise.resolve(this.generateStreamUrls(eventId)),
      this.checkEventTiming(eventId),
      this.checkStreamStatus(eventId)
    ]);
    
    return {
      streamUrls,
      eventRoomUrl: this.generateEventRoomUrl(eventId),
      timing,
      isLive: liveStatus.isLive,
      available: timing.canStream || timing.status === 'upcoming' // Available if can stream or upcoming
    };
  }

  /**
   * Get stream information directly
   */
  async getStreamInfo(eventId: string): Promise<{
    streamUrls: StreamSession;
    eventRoomUrl: string;
    isLive: boolean;
    available: boolean;
  }> {
    console.log('STREAMING: Getting stream info directly for event', eventId);
    
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
   * Get current stream status
   */
  getStreamStatus(): {
    isPublishing: boolean;
    isPlaying: boolean;
    hasVideo: boolean;
    hasAudio: boolean;
  } {
    const hasStream = !!this.currentStream;
    const hasConnection = !!this.peerConnection;

    return {
      isPublishing: hasStream && hasConnection,
      isPlaying: hasConnection && !!this.videoElement,
      hasVideo: hasStream && this.currentStream ? this.currentStream.getVideoTracks().length > 0 : false,
      hasAudio: hasStream && this.currentStream ? this.currentStream.getAudioTracks().length > 0 : false
    };
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
