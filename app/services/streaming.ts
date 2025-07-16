export interface StreamConfig {
  eventId: string;
  isCreator: boolean;
  userId: string;
  eventStartTime: string;
  eventDuration: number; // in minutes
}

export interface StreamSession {
  streamUrl: string;
  playUrl: string;
  whipUrl: string;
  whepUrl: string;
  sessionId: string;
}

class StreamingService {
  private srsBaseUrl: string;
  private eventRoomUrl: string;
  private currentStream: MediaStream | null = null;
  private peerConnection: RTCPeerConnection | null = null;
  private videoElement: HTMLVideoElement | null = null;

  constructor() {
    // Use DNS-configured domain for SRS server
    this.srsBaseUrl = 'room.haus25.live';
    this.eventRoomUrl = 'https://room.haus25.live';
  }

  /**
   * Generate stream URLs for an event
   */
  generateStreamUrls(eventId: string): StreamSession {
    const sessionId = `event_${eventId}_${Date.now()}`;
    const streamKey = `live/${eventId}`;
    
    return {
      streamUrl: `rtmp://${this.srsBaseUrl}:1935/live/${eventId}`,
      playUrl: `https://${this.srsBaseUrl}:8080/live/${eventId}.flv`,
      whipUrl: `https://${this.srsBaseUrl}:1985/rtc/v1/whip/?app=live&stream=${eventId}`,
      whepUrl: `https://${this.srsBaseUrl}:1985/rtc/v1/whep/?app=live&stream=${eventId}`,
      sessionId
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

      console.log('STREAMING: Got user media stream');

      // Generate stream URLs
      const streamSession = this.generateStreamUrls(eventId);
      
      // Set up WebRTC connection
      const config: RTCConfiguration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      };

      this.peerConnection = new RTCPeerConnection(config);

      // Add stream tracks to peer connection
      this.currentStream.getTracks().forEach(track => {
        if (this.peerConnection && this.currentStream) {
          this.peerConnection.addTrack(track, this.currentStream);
        }
      });

      // Handle ICE candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('STREAMING: ICE candidate:', event.candidate);
        }
      };

      // Create offer and set local description
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      console.log('STREAMING: Created offer:', offer);

      // Send offer to SRS via WHIP
      await this.sendOfferToSRS(streamSession.whipUrl, offer);

      console.log('STREAMING: Successfully started publishing');
      return streamSession;

    } catch (error) {
      console.error('STREAMING: Error starting publishing:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to start publishing: ${errorMessage}`);
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
      const streamSession = this.generateStreamUrls(eventId);
      
      // Set up WebRTC connection for receiving
      const config: RTCConfiguration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      };

      this.peerConnection = new RTCPeerConnection(config);

      // Handle incoming stream
      this.peerConnection.ontrack = (event) => {
        console.log('STREAMING: Received remote track');
        if (this.videoElement && event.streams[0]) {
          this.videoElement.srcObject = event.streams[0];
        }
      };

      // Handle ICE candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('STREAMING: ICE candidate:', event.candidate);
        }
      };

      // Create offer for receiving stream
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      // Send offer to SRS via WHEP
      await this.sendOfferToSRS(streamSession.whepUrl, offer);

      console.log('STREAMING: Successfully started playing');
      return streamSession;

    } catch (error) {
      console.error('STREAMING: Error starting playback:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to start playback: ${errorMessage}`);
    }
  }

  /**
   * Send offer to SRS server via WHIP/WHEP
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

  /**
   * Stop streaming
   */
  async stopStreaming(): Promise<void> {
    try {
      console.log('STREAMING: Stopping stream');

      // Stop all tracks
      if (this.currentStream) {
        this.currentStream.getTracks().forEach(track => {
          track.stop();
        });
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
   * Check if stream is live
   */
  async checkStreamStatus(eventId: string): Promise<boolean> {
    try {
      // Use production backend URL or fallback to localhost for development
      const backendUrl = process.env.NODE_ENV === 'production' 
        ? 'https://room.haus25.live/api'
        : 'http://localhost:3001';

      // First try backend service
      const backendResponse = await fetch(`${backendUrl}/stream/${eventId}/status`);
      if (backendResponse.ok) {
        const backendData = await backendResponse.json();
        console.log('STREAMING: Stream status from backend:', backendData);
        return backendData.isLive;
      }

      console.log('STREAMING: Backend unavailable, checking SRS directly');
      
      // Fallback to direct SRS check
      const response = await fetch(`https://${this.srsBaseUrl}:1985/api/v1/streams/`);
      const data = await response.json();
      
      // Check if stream exists for this event
      const streamExists = data.streams?.some((stream: any) => 
        stream.app === 'live' && stream.stream === eventId
      );

      return streamExists || false;

    } catch (error) {
      console.error('STREAMING: Error checking stream status:', error);
      return false;
    }
  }

  /**
   * Reserve stream URL for event (called during event creation)
   * Communicates with backend stream service
   */
  async reserveStreamUrl(eventId: string, startTime: string, duration: number): Promise<{
    reserved: boolean;
    streamUrls: StreamSession;
    eventRoomUrl: string;
  }> {
    try {
      console.log('STREAMING: Reserving stream URLs for event', eventId);

      // Use production backend URL or fallback to localhost for development
      const backendUrl = process.env.NODE_ENV === 'production' 
        ? 'https://room.haus25.live/api'
        : 'http://localhost:3001';

      // Call backend to reserve stream
      const response = await fetch(`${backendUrl}/stream/reserve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId,
          startTime,
          duration
        })
      });

      if (!response.ok) {
        throw new Error(`Backend responded with status: ${response.status}`);
      }

      const result = await response.json();

      console.log('STREAMING: Stream URLs reserved successfully via backend');

      return {
        reserved: result.success,
        streamUrls: result.streamUrls,
        eventRoomUrl: result.eventRoomUrl
      };

    } catch (error) {
      console.error('STREAMING: Error reserving stream URLs:', error);
      // Fallback to direct URL generation if backend is unavailable
      console.log('STREAMING: Falling back to direct URL generation');
      
      const streamUrls = this.generateStreamUrls(eventId);
      const eventRoomUrl = `${this.eventRoomUrl}/${eventId}`;

      return {
        reserved: true,
        streamUrls,
        eventRoomUrl
      };
    }
  }

  /**
   * Get stream information for an event
   * Generates URLs dynamically since no reservation storage needed
   */
  getReservedStream(eventId: string): {
    streamUrls: StreamSession;
    eventRoomUrl: string;
  } {
    return {
      streamUrls: this.generateStreamUrls(eventId),
      eventRoomUrl: `${this.eventRoomUrl}/${eventId}`
    };
  }

  /**
   * Get comprehensive stream information from backend
   */
  async getStreamInfo(eventId: string): Promise<{
    streamUrls: StreamSession;
    eventRoomUrl: string;
    isLive: boolean;
  }> {
    try {
      console.log('STREAMING: Getting stream info from backend for event', eventId);

      // Use production backend URL or fallback to localhost for development
      const backendUrl = process.env.NODE_ENV === 'production' 
        ? 'https://room.haus25.live/api'
        : 'http://localhost:3001';

      const response = await fetch(`${backendUrl}/stream/${eventId}`);
      if (response.ok) {
        const result = await response.json();
        console.log('STREAMING: Stream info from backend:', result);
        
        // Also check live status
        const isLive = await this.checkStreamStatus(eventId);
        
        return {
          streamUrls: result.streamUrls,
          eventRoomUrl: result.eventRoomUrl,
          isLive
        };
      }

      console.log('STREAMING: Backend unavailable, using fallback');
      
      // Fallback to direct generation
      const streamInfo = this.getReservedStream(eventId);
      const isLive = await this.checkStreamStatus(eventId);
      
      return {
        ...streamInfo,
        isLive
      };

    } catch (error) {
      console.error('STREAMING: Error getting stream info:', error);
      
      // Final fallback
      const streamInfo = this.getReservedStream(eventId);
      return {
        ...streamInfo,
        isLive: false
      };
    }
  }

  /**
   * Check if an event room is still available (hasn't expired)
   */
  async checkEventAvailability(eventId: string): Promise<{
    available: boolean;
    isActive: boolean;
    hasEnded: boolean;
    startTime?: string;
    duration?: number;
    message: string;
  }> {
    try {
      console.log('STREAMING: Checking event availability for', eventId);

      // Use production backend URL or fallback to localhost for development
      const backendUrl = process.env.NODE_ENV === 'production' 
        ? 'https://room.haus25.live/api'
        : 'http://localhost:3001';

      const response = await fetch(`${backendUrl}/stream/${eventId}/availability`);
      
      if (response.status === 404) {
        return {
          available: false,
          isActive: false,
          hasEnded: false,
          message: 'Event not found or never reserved'
        };
      }

      if (!response.ok) {
        throw new Error(`Backend responded with status: ${response.status}`);
      }

      const result = await response.json();
      console.log('STREAMING: Event availability result:', result);

      return {
        available: result.available,
        isActive: result.isActive,
        hasEnded: result.hasEnded,
        startTime: result.startTime,
        duration: result.duration,
        message: result.message
      };

    } catch (error) {
      console.error('STREAMING: Error checking event availability:', error);
      // Fallback to assume available if backend is unavailable
      return {
        available: true,
        isActive: false,
        hasEnded: false,
        message: 'Could not verify event status - proceeding with caution'
      };
    }
  }

  /**
   * Check if stream is currently live and event is available
   */
  async checkStreamAndEventStatus(eventId: string): Promise<{
    isLive: boolean;
    available: boolean;
    isActive: boolean;
    hasEnded: boolean;
    eventData?: any;
    message: string;
  }> {
    try {
      console.log('STREAMING: Checking stream and event status for', eventId);

      // Use production backend URL or fallback to localhost for development
      const backendUrl = process.env.NODE_ENV === 'production' 
        ? 'https://room.haus25.live/api'
        : 'http://localhost:3001';

      const response = await fetch(`${backendUrl}/stream/${eventId}/status`);
      
      if (!response.ok) {
        throw new Error(`Backend responded with status: ${response.status}`);
      }

      const result = await response.json();
      console.log('STREAMING: Stream and event status result:', result);

      return {
        isLive: result.isLive,
        available: result.available,
        isActive: result.isActive,
        hasEnded: result.hasEnded,
        eventData: result.eventData,
        message: result.message
      };

    } catch (error) {
      console.error('STREAMING: Error checking stream status:', error);
      // Fallback behavior
      return {
        isLive: false,
        available: true,
        isActive: false,
        hasEnded: false,
        message: 'Could not verify stream status'
      };
    }
  }

  /**
   * Check if stream is currently live (legacy method for backward compatibility)
   */
  async isStreamLive(eventId: string): Promise<boolean> {
    try {
      const status = await this.checkStreamAndEventStatus(eventId);
      return status.isLive && status.available;
    } catch (error) {
      console.error('STREAMING: Error checking stream status:', error);
      return false;
    }
  }
}

// Create singleton instance
export const streamingService = new StreamingService();

// Helper function to create streaming service
export const createStreamingService = () => streamingService;
