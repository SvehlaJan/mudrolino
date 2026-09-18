/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AudioSpec, AudioClip } from '../types';
import { getLocaleContent } from '../contentRegistry';
import { loadAppSettings } from './appSettingsStore';
import { audioOverrideStore } from './audioOverrideStore';
import { recordE2EAudioEvent } from './e2eState';

export class AudioManager {
  private synth: SpeechSynthesis = window.speechSynthesis;
  private currentAudio: HTMLAudioElement | null = null;
  private playbackToken = 0;
  private locale = 'sk';
  /** Settles the currently pending playSingleClip/speakAsync promise as cancelled — stop()
   * calls this directly so an in-flight await never hangs on an onended/onend that a
   * paused/cancelled element or utterance may not reliably fire. */
  private pendingCancel: (() => void) | null = null;

  constructor() {
    this.locale = loadAppSettings().locale;
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = () => {};
    }
  }

  updateLocale(locale: string): void {
    this.locale = locale;
  }

  /** Stop any in-progress audio or TTS immediately. */
  stop(): void {
    this.playbackToken += 1;
    const cancelPending = this.pendingCancel;
    this.pendingCancel = null;
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    this.synth.cancel();
    cancelPending?.();
  }

  /** Play a sequence of AudioClips. Each clip falls back to its own TTS if the file fails. */
  play(spec: AudioSpec): Promise<void> {
    return this.playClipsAsync(spec.clips);
  }

  playPraise(): Promise<void> {
    const entries = getLocaleContent(this.locale).praiseEntries;
    const chosen = entries[Math.floor(Math.random() * entries.length)];
    return this.playClipsAsync([
      { path: `${this.locale}/praise/${chosen.audioKey}`, fallbackText: chosen.text },
    ]);
  }

  private async playClipsAsync(clips: AudioClip[]): Promise<void> {
    this.stop();
    const playbackToken = this.playbackToken;
    for (const clip of clips) {
      // clip.path is locale-prefixed, e.g. 'sk/letters/a'
      // The override store key and the /audio/ URL both use this same path.
      const override = await audioOverrideStore.get(clip.path);
      if (playbackToken !== this.playbackToken) return;
      const url = override
        ? URL.createObjectURL(override)
        : `/audio/${clip.path}.mp3`;
      recordE2EAudioEvent(`start:${clip.path}`);
      try {
        await this.playSingleClip(url, playbackToken);
      } catch {
        if (playbackToken !== this.playbackToken) return;
        console.warn('[AudioManager] Audio file failed, falling back to TTS:', clip.fallbackText);
        await this.speakAsync(clip.fallbackText, playbackToken);
      } finally {
        if (override) URL.revokeObjectURL(url);
      }
      if (playbackToken !== this.playbackToken) return;
      recordE2EAudioEvent(`finish:${clip.path}`);
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
        if (playbackToken === this.playbackToken && this.currentAudio === audio) {
          this.currentAudio = null;
        }
        if (this.pendingCancel === cancelThisClip) this.pendingCancel = null;
      };

      const resolveOnce = () => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve();
      };

      const rejectOnce = () => {
        if (settled) return;
        settled = true;
        cleanup();
        if (playbackToken !== this.playbackToken) {
          resolve();
          return;
        }
        reject(new Error(`Failed to load: ${path}`));
      };

      const cancelThisClip = () => resolveOnce();
      this.pendingCancel = cancelThisClip;

      audio.onended = resolveOnce;
      audio.onerror = rejectOnce;
      audio.play().catch(() => rejectOnce());
    });
  }

  private speakAsync(text: string, playbackToken: number): Promise<void> {
    return new Promise((resolve) => {
      if (!this.synth || playbackToken !== this.playbackToken) { resolve(); return; }
      this.synth.cancel();
      let settled = false;
      const settleOnce = () => {
        if (settled) return;
        settled = true;
        if (this.pendingCancel === settleOnce) this.pendingCancel = null;
        resolve();
      };
      this.pendingCancel = settleOnce;
      setTimeout(() => {
        if (playbackToken !== this.playbackToken) { settleOnce(); return; }
        const utterance = new SpeechSynthesisUtterance(text);
        const voices = this.synth.getVoices();
        const langMap: Record<string, string> = {
          sk: 'sk-SK', cs: 'cs-CZ', en: 'en-US',
          fr: 'fr-FR', de: 'de-DE', es: 'es-ES', it: 'it-IT',
        };
        const lang = langMap[this.locale] ?? 'sk-SK';
        const voice = voices.find(v => v.lang === lang || v.lang.startsWith(this.locale + '-'));
        if (voice) utterance.voice = voice;
        utterance.lang = lang;
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.onend = settleOnce;
        utterance.onerror = settleOnce;
        if (this.synth.paused) this.synth.resume();
        if (playbackToken !== this.playbackToken) { settleOnce(); return; }
        this.synth.speak(utterance);
      }, 50);
    });
  }
}

export const audioManager = new AudioManager();
