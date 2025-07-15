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
   * Now simply generates URLs since event data is stored on blockchain
   */
  async reserveStreamUrl(eventId: string, startTime: string, duration: number): Promise<{
    reserved: boolean;
    streamUrls: StreamSession;
    eventRoomUrl: string;
  }> {
    try {
      console.log('STREAMING: Generating stream URLs for event', eventId);

      // Generate stream URLs
      const streamUrls = this.generateStreamUrls(eventId);
      
      // Create event room URL
      const eventRoomUrl = `${this.eventRoomUrl}/${eventId}`;

      console.log('STREAMING: Stream URLs generated successfully');

      return {
        reserved: true,
        streamUrls,
        eventRoomUrl
      };

    } catch (error) {
      console.error('STREAMING: Error generating stream URLs:', error);
      throw error;
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
}

// Create singleton instance
export const streamingService = new StreamingService();

// Helper function to create streaming service
export const createStreamingService = () => streamingService;
