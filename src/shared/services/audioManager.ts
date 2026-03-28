/**
 * AudioManager handles all auditory feedback in the application.
 * Uses Web Speech API (window.speechSynthesis) for low-latency fallback
 * until real audio assets are provided.
 */
export class AudioManager {
  private voiceEnabled: boolean = true;
  private sfxEnabled: boolean = true;
  private audioContext: AudioContext | null = null;
  private synth: SpeechSynthesis = window.speechSynthesis;

  constructor() {}

  /**
   * Initializes or resumes the AudioContext for SFX.
   */
  private async getAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    return this.audioContext;
  }

  /**
   * Stops any currently playing speech.
   */
  private stopCurrent() {
    this.synth.cancel();
  }

  /**
   * Updates the manager's settings.
   */
  updateSettings(settings: { voice: boolean; sfx: boolean }) {
    this.voiceEnabled = settings.voice;
    this.sfxEnabled = settings.sfx;
  }

  /**
   * Uses Web Speech API to generate and play speech.
   */
  private speak(text: string) {
    if (!this.voiceEnabled) return;

    this.stopCurrent();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'sk-SK'; // Slovak
    utterance.rate = 1.0;
    utterance.pitch = 1.1; // Slightly higher pitch for kids' app feel

    this.synth.speak(utterance);
  }

  /**
   * Plays a specific letter.
   */
  async playLetter(letter: string) {
    this.speak(`Písmenko ${letter}`);
  }

  /**
   * Plays a specific syllable.
   */
  async playSyllable(syllable: string) {
    this.speak(`Slabika ${syllable}`);
  }

  /**
   * Plays a specific word.
   */
  async playWord(word: string) {
    this.speak(word);
  }

  /**
   * Plays a random praising phrase.
   */
  async playPraise() {
    const phrases = ["Výborne!", "Skvelá práca!", "Si šikovný!", "To je ono!", "Úžasné!", "Paráda!"];
    const phrase = phrases[Math.floor(Math.random() * phrases.length)];
    this.speak(phrase);
  }

  /**
   * Plays feedback when a wrong item is selected.
   */
  async playFeedback(selected: string) {
    this.speak(`Vybral si písmenko ${selected}. Skús to znova.`);
  }

  /**
   * Plays synthesized sound effects.
   */
  async playSfx(type: 'success' | 'error') {
    if (!this.sfxEnabled) return;
    
    const ctx = await this.getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(1046.50, ctx.currentTime + 0.1); // C6
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime); // A3
      osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.2); // A2
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    }
  }
}

export const audioManager = new AudioManager();
