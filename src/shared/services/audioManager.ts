/**
 * AudioManager handles all auditory feedback.
 * Primary: file-based playback from public/audio/.
 * Fallback: Web Speech API (TTS) when a file is missing or unavailable.
 */
import { ContentItem, PraiseEntry, PhraseTemplate } from '../types';
import { PRAISE_ENTRIES } from '../contentRegistry';

const CATEGORY_DIR: Record<ContentItem['category'], string> = {
  letter: 'letters',
  syllable: 'syllables',
  number: 'numbers',
  word: 'words',
};

// Internal phrase template map.
// '{target}' = correct ContentItem; '{selected}' = what the player tapped (wrong-letter only).
const PHRASE_TEMPLATES: Record<PhraseTemplate, Array<string | '{target}' | '{selected}'>> = {
  'find-letter':   ['phrases/najdi-pismeno', '{target}'],
  'wrong-letter':  ['phrases/toto-je-pismeno', '{selected}', 'phrases/skus-to-znova'],
  'find-number':   ['phrases/cislo', '{target}'],
  'wrong-number':  ['phrases/skus-to-znova'],
  'find-syllable': ['phrases/slabika', '{target}'],
  'wrong-syllable':['phrases/slabika', '{target}', 'phrases/skus-to-znova'],
  'count-items':   ['phrases/spocitaj-predmety'],
  'correct-count': ['phrases/ano-je-ich', '{target}'],
  'wrong-count':   ['phrases/nie-je-ich', '{target}', 'phrases/skus-to-znova'],
};

// TTS fallback text for each template
const FALLBACK_TEXT: Record<
  PhraseTemplate,
  (target: ContentItem, selected?: ContentItem) => string
> = {
  'find-letter':   (t)    => `Nájdi písmenko ${t.symbol}`,
  'wrong-letter':  (t, s) => `Toto je písmenko ${s?.symbol ?? t.symbol}. Skús to znova.`,
  'find-number':   (t)    => `Číslo ${t.symbol}`,
  'wrong-number':  ()     => 'Skús to znova.',
  'find-syllable': (t)    => `Slabika ${t.symbol}`,
  'wrong-syllable':(t)    => `Slabika ${t.symbol}. Skús to znova.`,
  'count-items':   ()     => 'Spočítaj predmety',
  'correct-count': (t)    => `Áno, je ich ${t.symbol}.`,
  'wrong-count':   (t)    => `Nie, je ich ${t.symbol}. Skús to znova.`,
};

export class AudioManager {
  private synth: SpeechSynthesis = window.speechSynthesis;
  private currentAudio: HTMLAudioElement | null = null;
  private musicAudio: HTMLAudioElement | null = null;
  private musicEnabled = false;

  constructor() {
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = () => {};
    }
  }

  updateSettings(settings: { music: boolean }): void {
    this.musicEnabled = settings.music;
    if (this.musicEnabled) {
      if (!this.musicAudio) {
        this.musicAudio = new Audio('/audio/music/background.mp3');
        this.musicAudio.loop = true;
        this.musicAudio.volume = 0.4;
      }
      this.musicAudio.play().catch(() => {
        // Autoplay blocked or file missing — silently do nothing
      });
    } else {
      if (this.musicAudio) {
        this.musicAudio.pause();
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  playAnnouncement(template: PhraseTemplate, target: ContentItem, selected?: ContentItem): void {
    const rawParts = PHRASE_TEMPLATES[template];
    const resolved = rawParts.map(part => {
      if (part === '{target}') return target;
      if (part === '{selected}') return selected ?? target;
      return part; // static path like 'phrases/najdi-pismeno'
    });
    const fallback = FALLBACK_TEXT[template](target, selected);
    this.playSequence(resolved, fallback);
  }

  playLetter(target: ContentItem): void {
    this.playAnnouncement('find-letter', target);
  }

  playNumber(target: ContentItem): void {
    this.playAnnouncement('find-number', target);
  }

  playSyllable(target: ContentItem): void {
    this.playAnnouncement('find-syllable', target);
  }

  playPraise(entry?: PraiseEntry): void {
    const chosen = entry ?? PRAISE_ENTRIES[Math.floor(Math.random() * PRAISE_ENTRIES.length)];
    this.playSequence([`praise/${chosen.audioKey}`], chosen.text);
  }

  // ---------------------------------------------------------------------------
  // Internal: file-based playback with TTS fallback
  // ---------------------------------------------------------------------------

  private getItemAudioPath(item: ContentItem): string {
    return `/audio/${CATEGORY_DIR[item.category]}/${item.audioKey}.mp3`;
  }

  private stopCurrent(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    this.synth.cancel();
  }

  private async playSingleClip(path: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const audio = new Audio(path);
      this.currentAudio = audio;
      audio.onended = () => resolve();
      audio.onerror = () => reject(new Error(`Failed to load: ${path}`));
      audio.play().catch(reject);
    });
  }

  private async playSequenceAsync(
    parts: Array<string | ContentItem>,
    fallbackText: string
  ): Promise<void> {
    this.stopCurrent();
    try {
      for (const part of parts) {
        const path = typeof part === 'string'
          ? `/audio/${part}.mp3`
          : this.getItemAudioPath(part);
        await this.playSingleClip(path);
      }
    } catch {
      console.warn('[AudioManager] Audio file failed, falling back to TTS:', fallbackText);
      this.speak(fallbackText);
    }
  }

  private playSequence(parts: Array<string | ContentItem>, fallbackText: string): void {
    this.playSequenceAsync(parts, fallbackText).catch(() => this.speak(fallbackText));
  }

  private speak(text: string): void {
    if (!this.synth) return;
    this.synth.cancel();
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = this.synth.getVoices();
      const skVoice = voices.find(v => v.lang === 'sk-SK' || v.lang.startsWith('sk'));
      if (skVoice) utterance.voice = skVoice;
      utterance.lang = 'sk-SK';
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      if (this.synth.paused) this.synth.resume();
      this.synth.speak(utterance);
    }, 50);
  }
}

export const audioManager = new AudioManager();
