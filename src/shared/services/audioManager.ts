/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AudioSpec, PraiseEntry } from '../types';
import { PRAISE_ENTRIES } from '../contentRegistry';

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
      this.musicAudio.play().catch(() => {});
    } else {
      if (this.musicAudio) {
        this.musicAudio.pause();
      }
    }
  }

  /** Play a sequence of audio clips described by an AudioSpec. Falls back to TTS on any failure. */
  play(spec: AudioSpec): void {
    this.playSequenceAsync(
      spec.sequence.map(path => `/audio/${path}.mp3`),
      spec.fallbackText
    ).catch(() => this.speak(spec.fallbackText));
  }

  playPraise(entry?: PraiseEntry): void {
    const chosen = entry ?? PRAISE_ENTRIES[Math.floor(Math.random() * PRAISE_ENTRIES.length)];
    this.playSequenceAsync([`/audio/praise/${chosen.audioKey}.mp3`], chosen.text)
      .catch(() => this.speak(chosen.text));
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

  private async playSequenceAsync(paths: string[], fallbackText: string): Promise<void> {
    this.stopCurrent();
    try {
      for (const path of paths) {
        await this.playSingleClip(path);
      }
    } catch {
      console.warn('[AudioManager] Audio file failed, falling back to TTS:', fallbackText);
      this.speak(fallbackText);
    }
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
