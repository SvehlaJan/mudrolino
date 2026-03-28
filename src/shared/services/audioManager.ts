/**
 * AudioManager handles all auditory feedback in the application.
 * Uses Web Speech API (window.speechSynthesis) for voice feedback.
 */
export class AudioManager {
  private synth: SpeechSynthesis = window.speechSynthesis;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  constructor() {
    // Some browsers load voices asynchronously
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = () => {
        const voices = this.synth.getVoices();
        console.log(`[AudioManager] Voices loaded: ${voices.length}`);
      };
    }
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
  updateSettings(_settings: any) {
    // Voice is now always enabled by default
  }

  /**
   * Uses Web Speech API to generate and play speech.
   */
  private speak(text: string) {
    console.log(`[AudioManager] Attempting to speak: "${text}"`);
    
    if (!this.synth) {
      console.error('[AudioManager] SpeechSynthesis not supported in this browser.');
      return;
    }

    // Cancel any ongoing speech
    this.synth.cancel();

    // Small delay to allow the browser to process the cancellation
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      this.currentUtterance = utterance;
      
      // Get voices - they might not be ready immediately
      const voices = this.synth.getVoices();
      const skVoice = voices.find(v => v.lang === 'sk-SK' || v.lang.startsWith('sk'));
      
      if (skVoice) {
        console.log(`[AudioManager] Using Slovak voice: ${skVoice.name}`);
        utterance.voice = skVoice;
      } else {
        console.warn('[AudioManager] Slovak voice not found. Using default.');
      }

      utterance.lang = 'sk-SK';
      utterance.rate = 0.9;
      utterance.pitch = 1.0;

      utterance.onstart = () => console.log(`[AudioManager] Speech started: "${text}"`);
      utterance.onend = () => console.log(`[AudioManager] Speech ended: "${text}"`);
      utterance.onerror = (event) => {
        // 'interrupted' or 'canceled' are often expected when we call cancel()
        if (event.error === 'interrupted' || event.error === 'canceled') {
          console.log(`[AudioManager] Speech ${event.error}: "${text}"`);
        } else {
          console.error(`[AudioManager] Speech error (${event.error}): "${text}"`, event);
        }
      };

      try {
        // Some browsers (Chrome) need a resume() if it gets stuck
        if (this.synth.paused) {
          this.synth.resume();
        }
        this.synth.speak(utterance);
        console.log(`[AudioManager] synth.speak() executed for: "${text}"`);
      } catch (err) {
        console.error('[AudioManager] Error in synth.speak():', err);
      }
    }, 50);
  }

  /**
   * Plays a specific number.
   */
  playNumber(number: number) {
    this.speak(`Číslo ${number}`);
  }

  /**
   * Plays a specific letter.
   */
  playLetter(letter: string) {
    this.speak(`Písmenko ${letter}`);
  }

  /**
   * Plays a specific syllable.
   */
  playSyllable(syllable: string) {
    this.speak(`Slabika ${syllable}`);
  }

  /**
   * Plays a specific word.
   */
  playWord(word: string) {
    this.speak(word);
  }

  /**
   * Plays a random praising phrase.
   */
  playPraise() {
    const phrases = ["Výborne!", "Skvelá práca!", "Si šikovný!", "To je ono!", "Úžasné!", "Paráda!"];
    const phrase = phrases[Math.floor(Math.random() * phrases.length)];
    this.speak(phrase);
  }

  /**
   * Plays synthesized sound effects (no-op as requested).
   */
  playSfx(_type: 'success' | 'error') {
    // SFX effects removed as per user request
  }
}

export const audioManager = new AudioManager();
