/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AudioSpec, AudioClip, PraiseEntry } from '../types';
import { PRAISE_ENTRIES } from '../contentRegistry';

export class AudioManager {
  private synth: SpeechSynthesis = window.speechSynthesis;
  private currentAudio: HTMLAudioElement | null = null;
  private musicAudio: HTMLAudioElement | null = null;
  private musicEnabled = false;
  private playbackToken = 0;

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

  /** Stop any in-progress audio or TTS immediately. */
  stop(): void {
    this.playbackToken += 1;
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    this.synth.cancel();
  }

  /** Play a sequence of AudioClips. Each clip falls back to its own TTS if the file fails.
   *  Returns a Promise that resolves when the full sequence completes. */
  play(spec: AudioSpec): Promise<void> {
    return this.playClipsAsync(spec.clips);
  }

  playPraise(entry?: PraiseEntry): Promise<void> {
    const chosen = entry ?? PRAISE_ENTRIES[Math.floor(Math.random() * PRAISE_ENTRIES.length)];
    return this.playClipsAsync([{ path: `praise/${chosen.audioKey}`, fallbackText: chosen.text }]);
  }

  private async playClipsAsync(clips: AudioClip[]): Promise<void> {
    this.stop();
    const playbackToken = this.playbackToken;
    for (const clip of clips) {
      try {
        await this.playSingleClip(`/audio/${clip.path}.mp3`, playbackToken);
      } catch {
        if (playbackToken !== this.playbackToken) {
          return;
        }
        console.warn('[AudioManager] Audio file failed, falling back to TTS:', clip.fallbackText);
        await this.speakAsync(clip.fallbackText);
      }
    }
  }

  private playSingleClip(path: string, playbackToken: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const audio = new Audio(path);
      this.currentAudio = audio;
      let settled = false;

      const cleanup = () => {
        audio.onended = null;
        audio.onerror = null;
      };

      const resolveOnce = () => {
        if (settled) return;
        settled = true;
        this.currentAudio = null;
        cleanup();
        resolve();
      };

      const rejectOnce = () => {
        if (settled) return;
        settled = true;
        this.currentAudio = null;
        cleanup();
        if (playbackToken !== this.playbackToken) {
          resolve();
          return;
        }
        reject(new Error(`Failed to load: ${path}`));
      };

      audio.onended = resolveOnce;
      audio.onerror = rejectOnce;
      audio.play().catch(() => rejectOnce());
    });
  }

  private speakAsync(text: string): Promise<void> {
    return new Promise((resolve) => {
      if (!this.synth) { resolve(); return; }
      this.synth.cancel();
      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(text);
        const voices = this.synth.getVoices();
        const skVoice = voices.find(v => v.lang === 'sk-SK' || v.lang.startsWith('sk'));
        if (skVoice) utterance.voice = skVoice;
        utterance.lang = 'sk-SK';
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        if (this.synth.paused) this.synth.resume();
        this.synth.speak(utterance);
      }, 50);
    });
  }
}

export const audioManager = new AudioManager();
