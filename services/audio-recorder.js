class AudioRecorder {
  constructor() {
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.isRecording = false;
    this.stream = null;
    this.onDataAvailable = null;
    this.onStop = null;
  }

  /**
   * Initialize audio recording
   * @returns {Promise<boolean>} Success status
   */
  async initialize() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: "audio/webm;codecs=opus",
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: "audio/webm" });
        this.audioChunks = [];

        if (this.onStop) {
          this.onStop(audioBlob);
        }
      };

      return true;
    } catch (error) {
      console.error("Audio initialization failed:", error);
      return false;
    }
  }

  /**
   * Start recording
   * @returns {boolean} Success status
   */
  startRecording() {
    if (!this.mediaRecorder || this.isRecording) {
      return false;
    }

    try {
      this.audioChunks = [];
      this.mediaRecorder.start(100); // Collect data every 100ms
      this.isRecording = true;
      return true;
    } catch (error) {
      console.error("Failed to start recording:", error);
      return false;
    }
  }

  /**
   * Stop recording
   * @returns {boolean} Success status
   */
  stopRecording() {
    if (!this.mediaRecorder || !this.isRecording) {
      return false;
    }

    try {
      this.mediaRecorder.stop();
      this.isRecording = false;
      return true;
    } catch (error) {
      console.error("Failed to stop recording:", error);
      return false;
    }
  }

  /**
   * Check if currently recording
   * @returns {boolean} Recording status
   */
  isCurrentlyRecording() {
    return this.isRecording;
  }

  /**
   * Get audio stream for real-time processing
   * @returns {MediaStream|null} Audio stream
   */
  getAudioStream() {
    return this.stream;
  }

  /**
   * Clean up resources
   */
  cleanup() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    this.mediaRecorder = null;
    this.audioChunks = [];
    this.isRecording = false;
  }

  /**
   * Convert audio blob to base64 for API transmission
   * @param {Blob} audioBlob - Audio blob
   * @returns {Promise<string>} Base64 string
   */
  async audioBlobToBase64(audioBlob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(audioBlob);
    });
  }

  /**
   * Get audio duration from blob
   * @param {Blob} audioBlob - Audio blob
   * @returns {Promise<number>} Duration in seconds
   */
  async getAudioDuration(audioBlob) {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.onloadedmetadata = () => {
        resolve(audio.duration);
      };
      audio.onerror = reject;
      audio.src = URL.createObjectURL(audioBlob);
    });
  }
}

module.exports = AudioRecorder;
