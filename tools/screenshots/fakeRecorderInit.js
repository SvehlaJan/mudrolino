// Browser init script for deterministic release captures of the real /content recorder UI.
// This file is loaded by Playwright as plain JavaScript so tsx does not inject helpers into it.
const control = { mode: 'success' };
window.__captureRecorder = control;

class CaptureAudioContext {
  createMediaStreamSource() { return { connect() {} }; }
  createAnalyser() {
    return { fftSize: 0, frequencyBinCount: 8, getFloatTimeDomainData(values) { values.fill(0.2); } };
  }
  async decodeAudioData() {
    return { getChannelData: () => new Float32Array(4410).fill(0.2) };
  }
  close() { return Promise.resolve(); }
}

class CaptureMediaRecorder {
  state = 'inactive';
  mimeType = 'audio/webm';
  ondataavailable = null;
  onstop = null;
  onerror = null;
  start() { this.state = 'recording'; }
  stop() {
    if (this.state === 'inactive') return;
    this.state = 'inactive';
    setTimeout(() => {
      this.ondataavailable?.({ data: new Blob(['audio']) });
      this.onstop?.();
    }, 0);
  }
}

Object.defineProperty(window, 'AudioContext', { value: CaptureAudioContext });
Object.defineProperty(window, 'MediaRecorder', { value: CaptureMediaRecorder });
Object.defineProperty(navigator, 'mediaDevices', {
  value: { getUserMedia: async () => {
    if (control.mode === 'delayed-permission') return new Promise(() => {});
    return { getTracks: () => [{ stop() {} }] };
  } },
});
