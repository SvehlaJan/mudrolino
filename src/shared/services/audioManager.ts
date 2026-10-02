/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AudioSpec, AudioClip } from '../types';
import { getLocaleContent } from '../contentRegistry';
import { loadAppSettings } from './appSettingsStore';
import { audioOverrideStore } from './audioOverrideStore';
import { recordE2EAudioEvent } from './e2eState';

/** Web Speech can silently omit both terminal events in Chromium. */
export const SPEECH_UTTERANCE_TIMEOUT_MS = 15_000;

export interface AudioMedia {
  onended: ((...args: never[]) => unknown) | null;
  onerror: ((...args: never[]) => unknown) | null;
  currentTime: number;
  muted: boolean;
  pause(): void;
  play(): Promise<void>;
}
export interface AudioUtterance {
  onend: ((...args: never[]) => unknown) | null;
  onerror: ((...args: never[]) => unknown) | null;
  voice: SpeechSynthesisVoice | null;
  volume: number;
  lang: string;
  rate: number;
  pitch: number;
}
export interface AudioManagerDependencies {
  initialLocale: string;
  synth: {
    onvoiceschanged: unknown;
    paused: boolean;
    cancel(): void;
    getVoices(): SpeechSynthesisVoice[];
    resume(): void;
    speak(utterance: AudioUtterance): void;
  };
  createAudio(path: string): AudioMedia;
  createUtterance(text: string): AudioUtterance;
  getOverride(path: string): Promise<Blob | null>;
  createObjectURL(blob: Blob): string;
  revokeObjectURL(url: string): void;
  recordEvent(event: string): void;
  clock: { setTimeout(callback: () => void, ms: number): ReturnType<typeof setTimeout>; clearTimeout(timer: ReturnType<typeof setTimeout>): void };
}

export class AudioManager {
  private readonly dependencies: AudioManagerDependencies;
  private synth: AudioManagerDependencies['synth'];
  private currentAudio: AudioMedia | null = null;
  private playbackToken = 0;
  private locale = 'sk';
  /** Settles the currently pending playSingleClip/speakAsync promise as cancelled — stop()
   * calls this directly so an in-flight await never hangs on an onended/onend that a
   * paused/cancelled element or utterance may not reliably fire. */
  private pendingCancel: (() => void) | null = null;

  constructor(dependencies: Partial<AudioManagerDependencies> = {}) {
    this.dependencies = {
      initialLocale: dependencies.initialLocale ?? loadAppSettings().locale,
      synth: dependencies.synth ?? window.speechSynthesis,
      createAudio: path => new Audio(path),
      createUtterance: text => new SpeechSynthesisUtterance(text),
      getOverride: path => audioOverrideStore.get(path),
      createObjectURL: blob => URL.createObjectURL(blob),
      revokeObjectURL: url => URL.revokeObjectURL(url),
      recordEvent: recordE2EAudioEvent,
      clock: { setTimeout: (callback, ms) => setTimeout(callback, ms), clearTimeout: timer => clearTimeout(timer) },
      ...dependencies,
    };
    this.synth = this.dependencies.synth;
    this.locale = this.dependencies.initialLocale;
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
      const override = await this.dependencies.getOverride(clip.path);
      if (playbackToken !== this.playbackToken) return;
      const url = override
        ? this.dependencies.createObjectURL(override)
        : `/audio/${clip.path}.mp3`;
      this.dependencies.recordEvent(`start:${clip.path}`);
      try {
        await this.playSingleClip(url, playbackToken);
      } catch {
        if (playbackToken !== this.playbackToken) return;
        console.warn('[AudioManager] Audio file failed, falling back to TTS:', clip.fallbackText);
        await this.speakAsync(clip.fallbackText, playbackToken);
      } finally {
        if (override) this.dependencies.revokeObjectURL(url);
      }
      if (playbackToken !== this.playbackToken) return;
      this.dependencies.recordEvent(`finish:${clip.path}`);
    }
  }

  private playSingleClip(path: string, playbackToken: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const audio = this.dependencies.createAudio(path);
      if (import.meta.env?.MODE === 'test') audio.muted = true;
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
      let timeout: ReturnType<typeof setTimeout> | null = null;
      let utterance: AudioUtterance | null = null;
      let startDelay: ReturnType<typeof setTimeout> | null = null;

      const cleanup = () => {
        if (timeout !== null) this.dependencies.clock.clearTimeout(timeout);
        if (startDelay !== null) this.dependencies.clock.clearTimeout(startDelay);
        if (utterance) {
          utterance.onend = null;
          utterance.onerror = null;
        }
        if (this.pendingCancel === settleOnce) this.pendingCancel = null;
      };

      const settleOnce = () => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve();
      };
      this.pendingCancel = settleOnce;
      startDelay = this.dependencies.clock.setTimeout(() => {
        startDelay = null;
        if (playbackToken !== this.playbackToken) { settleOnce(); return; }
        utterance = this.dependencies.createUtterance(text);
        // macOS speech uses the system synthesizer, outside Chromium's --mute-audio output.
        // Preserve native completion timing while keeping automated test builds silent.
        if (import.meta.env?.MODE === 'test') utterance.volume = 0;
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
        timeout = this.dependencies.clock.setTimeout(() => {
          if (playbackToken === this.playbackToken) this.synth.cancel();
          settleOnce();
        }, SPEECH_UTTERANCE_TIMEOUT_MS);
        try {
          this.synth.speak(utterance);
        } catch {
          settleOnce();
        }
      }, 50);
    });
  }
}

export const audioManager = new AudioManager();
