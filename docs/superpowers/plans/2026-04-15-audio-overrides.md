# Audio Overrides Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow parents to record custom voice clips that override the default audio files for any audio key, stored in IndexedDB, with a `/recordings` screen accessible from the parent settings zone.

**Architecture:** `audioOverrideStore` wraps IndexedDB behind a storage interface. `audioManager.playClipsAsync` checks the store before loading a file from `/audio/`. `useRecorder` captures audio via `MediaRecorder`, detects silence for auto-stop, trims, and encodes to MP3 via `lamejs`. `AudioRecordingScreen` at `/recordings` shows all audio keys grouped by category with a per-item recording sub-screen and optional auto-advance batch mode.

**Prerequisite:** `2026-04-15-i18n-prep.md` must be implemented first. Audio keys are locale-prefixed (`sk/letters/a`) after that plan.

**Tech Stack:** TypeScript, React, Web Audio API (`MediaRecorder`, `AnalyserNode`, `AudioContext`), `lamejs` (MP3 encoding), IndexedDB

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/shared/services/audioOverrideStore.ts` | `AudioOverrideStore` interface + IndexedDB implementation |
| Create | `src/shared/hooks/useRecorder.ts` | Record → silence-detect → trim → MP3 encode |
| Create | `src/recordings/AudioRecordingScreen.tsx` | `/recordings` route — list + recording sub-screen |
| Modify | `src/shared/services/audioManager.ts` | Check override store before file load |
| Modify | `src/shared/components/SettingsOverlay.tsx` | Add "Vlastné nahrávky" navigation button |
| Modify | `src/App.tsx` | Add `/recordings` route |

---

### Task 1: Install `lamejs`

- [ ] **Step 1: Install package**

```bash
cd /home/skclaw/teo-learn && npm install lamejs
```

`@types/lamejs` is not published to npm. Instead, add a local declaration file:

- [ ] **Step 2: Create `src/typings/lamejs.d.ts`**

```ts
declare module 'lamejs' {
  export class Mp3Encoder {
    constructor(channels: number, sampleRate: number, kbps: number);
    encodeBuffer(left: Int16Array): Int8Array;
    flush(): Int8Array;
  }
}
```

- [ ] **Step 3: Verify install**

```bash
node -e "require('lamejs'); console.log('lamejs ok')"
```
Expected: `lamejs ok`

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/typings/lamejs.d.ts
git commit -m "chore: add lamejs for browser MP3 encoding"
```

---

### Task 2: Create `audioOverrideStore`

**Files:**
- Create: `src/shared/services/audioOverrideStore.ts`

- [ ] **Step 1: Create the file**

```ts
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const DB_NAME = 'hrave-ucenie-audio-overrides';
const STORE_NAME = 'overrides';
const DB_VERSION = 1;

export interface AudioOverrideStore {
  get(key: string): Promise<Blob | null>;
  set(key: string, blob: Blob): Promise<void>;
  delete(key: string): Promise<void>;
  listKeys(): Promise<string[]>;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

class IndexedDBOverrideStore implements AudioOverrideStore {
  async get(key: string): Promise<Blob | null> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = () => resolve((req.result as Blob) ?? null);
      req.onerror = () => reject(req.error);
    });
  }

  async set(key: string, blob: Blob): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const req = tx.objectStore(STORE_NAME).put(blob, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async delete(key: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const req = tx.objectStore(STORE_NAME).delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async listKeys(): Promise<string[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAllKeys();
      req.onsuccess = () => resolve(req.result as string[]);
      req.onerror = () => reject(req.error);
    });
  }
}

export const audioOverrideStore: AudioOverrideStore = new IndexedDBOverrideStore();
```

- [ ] **Step 2: Run lint**

```bash
npm run lint
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/shared/services/audioOverrideStore.ts
git commit -m "feat: add audioOverrideStore (IndexedDB) with AudioOverrideStore interface"
```

---

### Task 3: Integrate override store into `audioManager`

**Files:**
- Modify: `src/shared/services/audioManager.ts`

- [ ] **Step 1: Update `playClipsAsync` to check the store**

Add the import at the top of `audioManager.ts`:
```ts
import { audioOverrideStore } from './audioOverrideStore';
```

Replace `playClipsAsync` with:
```ts
private async playClipsAsync(clips: AudioClip[]): Promise<void> {
  this.stop();
  const playbackToken = this.playbackToken;
  for (const clip of clips) {
    // clip.path is locale-prefixed, e.g. 'sk/letters/a'
    // The override store key and the /audio/ URL both use this same path.
    const override = await audioOverrideStore.get(clip.path);
    const url = override
      ? URL.createObjectURL(override)
      : `/audio/${clip.path}.mp3`;
    try {
      await this.playSingleClip(url, playbackToken);
    } catch {
      if (playbackToken !== this.playbackToken) return;
      console.warn('[AudioManager] Audio file failed, falling back to TTS:', clip.fallbackText);
      await this.speakAsync(clip.fallbackText);
    } finally {
      if (override) URL.revokeObjectURL(url);
    }
  }
}
```

- [ ] **Step 2: Run lint**

```bash
npm run lint
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/shared/services/audioManager.ts
git commit -m "feat: audioManager checks audioOverrideStore before loading from /audio/"
```

---

### Task 4: Create `useRecorder` hook

**Files:**
- Create: `src/shared/hooks/useRecorder.ts`

- [ ] **Step 1: Create the file**

```ts
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useCallback } from 'react';
import * as lamejs from 'lamejs';

export type RecorderState = 'idle' | 'recording' | 'processing';

export interface UseRecorderResult {
  state: RecorderState;
  /** 0–1 float representing current input level (for VU meter) */
  level: number;
  start: () => Promise<void>;
  stop: () => void;
  /** Resolves with the encoded MP3 Blob after recording + processing finishes */
  blobPromise: Promise<Blob> | null;
}

// Silence detection thresholds — match the Python split_audio.py defaults
const SILENCE_THRESHOLD_DB = -35;
const SILENCE_DURATION_MS = 800;
const SAMPLE_RATE = 44100;
const MP3_BITRATE = 128;

function rmsToDb(rms: number): number {
  if (rms === 0) return -Infinity;
  return 20 * Math.log10(rms);
}

function trimSilence(samples: Float32Array, thresholdDb: number): Float32Array {
  const threshold = Math.pow(10, thresholdDb / 20);
  let start = 0;
  let end = samples.length - 1;

  while (start < samples.length && Math.abs(samples[start]) < threshold) start++;
  while (end > start && Math.abs(samples[end]) < threshold) end--;

  // Add 50ms of padding on each side (matching Python PADDING = 0.05)
  const pad = Math.round(SAMPLE_RATE * 0.05);
  start = Math.max(0, start - pad);
  end = Math.min(samples.length - 1, end + pad);

  return samples.slice(start, end + 1);
}

function encodeMp3(samples: Float32Array): Blob {
  const encoder = new lamejs.Mp3Encoder(1, SAMPLE_RATE, MP3_BITRATE);
  const pcm = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    pcm[i] = Math.max(-32768, Math.min(32767, samples[i] * 32768));
  }

  const blockSize = 1152;
  const chunks: Int8Array[] = [];

  for (let i = 0; i < pcm.length; i += blockSize) {
    const block = pcm.subarray(i, i + blockSize);
    const encoded = encoder.encodeBuffer(block);
    if (encoded.length > 0) chunks.push(encoded);
  }

  const flushed = encoder.flush();
  if (flushed.length > 0) chunks.push(flushed);

  return new Blob(chunks, { type: 'audio/mpeg' });
}

export function useRecorder(): UseRecorderResult {
  const [state, setState] = useState<RecorderState>('idle');
  const [level, setLevel] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const levelRafRef = useRef<number | null>(null);
  const blobResolveRef = useRef<((blob: Blob) => void) | null>(null);
  const [blobPromise, setBlobPromise] = useState<Promise<Blob> | null>(null);

  const cleanup = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (levelRafRef.current) {
      cancelAnimationFrame(levelRafRef.current);
      levelRafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    mediaRecorderRef.current = null;
    setLevel(0);
  }, []);

  const stop = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const start = useCallback(async () => {
    if (state !== 'idle') return;

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;

    const audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
    audioContextRef.current = audioContext;

    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    analyserRef.current = analyser;

    const chunks: BlobPart[] = [];
    chunksRef.current = chunks;

    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;

    const promise = new Promise<Blob>((resolve) => {
      blobResolveRef.current = resolve;
    });
    setBlobPromise(promise);

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      setState('processing');
      cleanup();

      const rawBlob = new Blob(chunks, { type: mediaRecorder.mimeType });
      const arrayBuffer = await rawBlob.arrayBuffer();

      // Decode to PCM for trimming
      const decodeCtx = new AudioContext({ sampleRate: SAMPLE_RATE });
      const audioBuffer = await decodeCtx.decodeAudioData(arrayBuffer);
      decodeCtx.close();

      const samples = audioBuffer.getChannelData(0);
      const trimmed = trimSilence(samples, SILENCE_THRESHOLD_DB);
      const mp3Blob = encodeMp3(trimmed);

      blobResolveRef.current?.(mp3Blob);
      setState('idle');
    };

    // Level polling + silence detection
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);
    let silenceStart: number | null = null;

    const pollLevel = () => {
      if (!analyserRef.current) return;
      analyserRef.current.getFloatTimeDomainData(dataArray);

      let sum = 0;
      for (let i = 0; i < bufferLength; i++) sum += dataArray[i] * dataArray[i];
      const rms = Math.sqrt(sum / bufferLength);
      const db = rmsToDb(rms);
      setLevel(Math.min(1, rms * 10)); // scale for VU meter

      const isSilent = db < SILENCE_THRESHOLD_DB;
      const now = performance.now();

      if (isSilent) {
        if (silenceStart === null) silenceStart = now;
        else if (now - silenceStart >= SILENCE_DURATION_MS) {
          // Auto-stop on sustained silence
          if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop();
            return; // stop polling
          }
        }
      } else {
        silenceStart = null;
      }

      levelRafRef.current = requestAnimationFrame(pollLevel);
    };

    mediaRecorder.start();
    setState('recording');
    levelRafRef.current = requestAnimationFrame(pollLevel);
  }, [state, cleanup]);

  return { state, level, start, stop, blobPromise };
}
```

- [ ] **Step 2: Run lint**

```bash
npm run lint
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/shared/hooks/useRecorder.ts
git commit -m "feat: add useRecorder hook with silence detection and MP3 encoding via lamejs"
```

---

### Task 5: Create `AudioRecordingScreen`

**Files:**
- Create: `src/recordings/AudioRecordingScreen.tsx`

This component has two views rendered as local state: the item list and the per-item recording sub-screen.

- [ ] **Step 1: Create `src/recordings/AudioRecordingScreen.tsx`**

```tsx
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mic, Trash2, Search, X } from 'lucide-react';
import { getLocaleContent } from '../shared/contentRegistry';
import { audioOverrideStore } from '../shared/services/audioOverrideStore';
import { useRecorder } from '../shared/hooks/useRecorder';

interface AudioItem {
  key: string;        // full locale-prefixed path, e.g. 'sk/letters/a'
  label: string;      // display text
  category: Category;
}

type Category = 'letters' | 'words' | 'syllables' | 'numbers' | 'phrases' | 'praise';

const CATEGORY_LABELS: Record<Category, string> = {
  letters:   'Písmená',
  words:     'Slová',
  syllables: 'Slabiky',
  numbers:   'Čísla',
  phrases:   'Frázy',
  praise:    'Pochvaly',
};

const CATEGORIES: Category[] = ['letters', 'words', 'syllables', 'numbers', 'phrases', 'praise'];

function buildAudioItems(locale: string): AudioItem[] {
  const content = getLocaleContent(locale);
  const items: AudioItem[] = [];

  for (const l of content.letterItems) {
    items.push({ key: `${locale}/letters/${l.audioKey}`, label: `${l.symbol} — ${l.label}`, category: 'letters' });
  }
  for (const w of content.wordItems) {
    items.push({ key: `${locale}/words/${w.audioKey}`, label: `${w.word} ${w.emoji}`, category: 'words' });
  }
  for (const s of content.syllableItems) {
    items.push({ key: `${locale}/syllables/${s.audioKey}`, label: s.symbol, category: 'syllables' });
  }
  for (const n of content.numberItems) {
    items.push({ key: `${locale}/numbers/${n.audioKey}`, label: String(n.value), category: 'numbers' });
  }
  // Phrases
  for (const [phraseKey, phrase] of Object.entries(content.audioPhrases)) {
    items.push({ key: `${locale}/phrases/${phrase.audioKey}`, label: `${phraseKey}: ${phrase.text}`, category: 'phrases' });
  }
  // Praise
  for (const p of content.praiseEntries) {
    items.push({ key: `${locale}/praise/${p.audioKey}`, label: `${p.emoji} ${p.text}`, category: 'praise' });
  }
  return items;
}

// ---------------------------------------------------------------------------
// Recording sub-screen
// ---------------------------------------------------------------------------

interface RecordingSubScreenProps {
  item: AudioItem;
  hasOverride: boolean;
  batchMode: boolean;
  onBatchToggle: () => void;
  onBack: () => void;
  /** Called after blob is saved — refreshes badge state only, does NOT advance. */
  onSaved: () => void;
  /** Called after the 1s countdown completes in batch mode — advances to next item. */
  onAdvance: () => void;
}

function RecordingSubScreen({
  item,
  hasOverride,
  batchMode,
  onBatchToggle,
  onBack,
  onSaved,
  onAdvance,
}: RecordingSubScreenProps) {
  const { state, level, start, stop, blobPromise } = useRecorder();
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = useRef(false);

  const handleDelete = async () => {
    await audioOverrideStore.delete(item.key);
    onSaved(); // refresh badge state in parent
  };

  // When processing finishes and blob is ready, save it and optionally start countdown
  useEffect(() => {
    if (!blobPromise) return;
    blobPromise.then(async (blob) => {
      await audioOverrideStore.set(item.key, blob);
      onSaved(); // refresh badge state only — does NOT advance to next item
      if (batchMode && !cancelledRef.current) {
        // Start 1s countdown; onAdvance() is called only when the countdown completes
        let t = 10; // 10 × 100ms = 1s
        setCountdown(t);
        countdownRef.current = setInterval(() => {
          t -= 1;
          setCountdown(t);
          if (t <= 0) {
            clearInterval(countdownRef.current!);
            setCountdown(null);
            if (!cancelledRef.current) onAdvance(); // advance AFTER countdown
          }
        }, 100);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blobPromise]);

  const cancelCountdown = useCallback(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setCountdown(null);
    cancelledRef.current = true;
  }, []);

  const levelPercent = Math.round(level * 100);

  return (
    <div className="flex flex-col h-full" onClick={countdown !== null ? cancelCountdown : undefined}>
      {/* Header */}
      <div className="p-6 border-b-2 border-shadow/30 bg-bg-light/50 flex items-center gap-4 shrink-0">
        <button onClick={onBack} className="w-12 h-12 bg-bg-light rounded-full flex items-center justify-center">
          <ArrowLeft size={20} />
        </button>
        <span className="text-2xl font-bold truncate">{item.label}</span>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8 p-8">
        {/* VU meter */}
        <div className="w-full max-w-xs h-6 bg-shadow/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-accent-blue rounded-full transition-all duration-75"
            style={{ width: `${levelPercent}%` }}
          />
        </div>

        {/* Record / Stop button */}
        {countdown !== null ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-24 h-24 rounded-full bg-bg-light flex items-center justify-center text-4xl font-bold">
              {(countdown / 10).toFixed(1)}s
            </div>
            <p className="text-base opacity-60">Klepni pre zrušenie</p>
          </div>
        ) : (
          <button
            onClick={state === 'idle' ? start : stop}
            disabled={state === 'processing'}
            className={`w-24 h-24 rounded-full flex items-center justify-center shadow-block active:translate-y-1 active:shadow-block-pressed transition-all ${
              state === 'recording'
                ? 'bg-soft-watermelon'
                : state === 'processing'
                ? 'bg-shadow/20'
                : 'bg-accent-blue'
            }`}
          >
            {state === 'recording' ? (
              <span className="w-8 h-8 bg-white rounded-sm" />
            ) : state === 'processing' ? (
              <span className="text-2xl animate-spin">⏳</span>
            ) : (
              <Mic size={36} className="text-white" />
            )}
          </button>
        )}

        <p className="text-lg opacity-60 font-medium">
          {state === 'idle' && countdown === null && 'Klepni pre nahrávanie'}
          {state === 'recording' && 'Nahrávam… (auto-stop na ticho)'}
          {state === 'processing' && 'Spracovávam…'}
        </p>

        {/* Batch toggle */}
        <div className="flex items-center gap-3">
          <span className="text-lg font-medium opacity-70">Auto-pokračovať</span>
          <button
            onClick={onBatchToggle}
            className={`w-14 h-8 rounded-full transition-colors ${batchMode ? 'bg-accent-blue' : 'bg-shadow/20'}`}
          >
            <span
              className={`block w-6 h-6 rounded-full bg-white shadow transition-transform mx-1 ${batchMode ? 'translate-x-6' : ''}`}
            />
          </button>
        </div>

        {/* Delete button — only if override exists */}
        {hasOverride && (
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 text-soft-watermelon font-semibold text-lg py-3 px-6 rounded-2xl border-2 border-soft-watermelon/40 active:bg-soft-watermelon/10"
          >
            <Trash2 size={20} />
            Zmazať nahrávku
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// List view
// ---------------------------------------------------------------------------

interface AudioRecordingScreenProps {
  locale: string;
}

export function AudioRecordingScreen({ locale }: AudioRecordingScreenProps) {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<Category>('letters');
  const [search, setSearch] = useState('');
  const [overrideKeys, setOverrideKeys] = useState<Set<string>>(new Set());
  const [selectedItem, setSelectedItem] = useState<AudioItem | null>(null);
  const [batchMode, setBatchMode] = useState(false);
  const allItems = buildAudioItems(locale);

  const refreshOverrides = useCallback(async () => {
    const keys = await audioOverrideStore.listKeys();
    setOverrideKeys(new Set(keys));
  }, []);

  useEffect(() => {
    refreshOverrides();
  }, [refreshOverrides]);

  const filteredItems = search.trim()
    ? allItems.filter((item) =>
        item.label.toLowerCase().includes(search.toLowerCase()) ||
        item.key.toLowerCase().includes(search.toLowerCase()),
      )
    : allItems.filter((item) => item.category === activeCategory);

  // Refreshes badge state only — called immediately after each recording is saved.
  const handleSaved = useCallback(() => {
    refreshOverrides();
  }, [refreshOverrides]);

  // Advances to the next item in the current list — called by RecordingSubScreen
  // after the 1s countdown completes in batch mode.
  const handleAdvance = useCallback(() => {
    if (!selectedItem) return;
    const idx = filteredItems.findIndex((i) => i.key === selectedItem.key);
    if (idx >= 0 && idx < filteredItems.length - 1) {
      setSelectedItem(filteredItems[idx + 1]);
    } else {
      setSelectedItem(null); // Reached end of list
    }
  }, [filteredItems, selectedItem]);

  if (selectedItem) {
    return (
      <div className="fixed inset-0 z-50 bg-bg-light flex flex-col">
        <RecordingSubScreen
          item={selectedItem}
          hasOverride={overrideKeys.has(selectedItem.key)}
          batchMode={batchMode}
          onBatchToggle={() => setBatchMode((b) => !b)}
          onBack={() => setSelectedItem(null)}
          onSaved={handleSaved}
          onAdvance={handleAdvance}
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-bg-light flex flex-col">
      {/* Header */}
      <div className="p-6 border-b-2 border-shadow/30 bg-bg-light/50 shrink-0">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-3xl font-bold">Vlastné nahrávky</h2>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Hľadať…"
            className="w-full pl-11 pr-10 py-3 bg-white rounded-2xl border-2 border-shadow/10 text-lg font-medium focus:outline-none focus:border-accent-blue/50"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 opacity-40"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Category tabs — hidden when searching */}
        {!search && (
          <div className="flex gap-2 mt-4 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-full text-base font-semibold whitespace-nowrap transition-all ${
                  activeCategory === cat
                    ? 'bg-accent-blue text-white'
                    : 'bg-white text-text-main opacity-60'
                }`}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Item list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filteredItems.length === 0 && (
          <p className="text-center text-lg opacity-40 mt-8">Žiadne položky</p>
        )}
        {filteredItems.map((item) => (
          <button
            key={item.key}
            onClick={() => setSelectedItem(item)}
            className="w-full flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm active:bg-bg-light transition-colors"
          >
            <span className="text-xl font-medium">{item.label}</span>
            {overrideKeys.has(item.key) && (
              <Mic size={18} className="text-accent-blue shrink-0" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run lint**

```bash
npm run lint
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/recordings/AudioRecordingScreen.tsx
git commit -m "feat: add AudioRecordingScreen with list view, recording sub-screen, and batch mode"
```

---

### Task 6: Wire up route and settings entry point

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/shared/components/SettingsOverlay.tsx`

- [ ] **Step 1: Add `/recordings` route to `src/App.tsx`**

Add import at top:
```ts
import { AudioRecordingScreen } from './recordings/AudioRecordingScreen';
```

Add route inside `<Routes>`, before the catch-all:
```tsx
<Route
  path="/recordings"
  element={
    <ErrorBoundary>
      <AudioRecordingScreen locale={appSettings.locale} />
    </ErrorBoundary>
  }
/>
```

- [ ] **Step 2: Add "Vlastné nahrávky" button to `SettingsOverlay`**

In `src/shared/components/SettingsOverlay.tsx`, add `useNavigate` import:
```ts
import { useNavigate } from 'react-router-dom';
```

Inside the component, add the hook:
```ts
const navigate = useNavigate();
```

Add the button inside the scrollable content area, after the "Test zvuku" section and before the numbers range section:

```tsx
<div className="pt-4 pb-8 border-b-2 border-shadow/10">
  <h3 className="text-2xl sm:text-3xl font-bold mb-6 text-center">Vlastné nahrávky</h3>
  <button
    onClick={() => { onClose(); navigate('/recordings'); }}
    className="w-full py-4 bg-accent-blue text-white rounded-2xl font-bold text-xl shadow-block active:translate-y-2 active:shadow-block-pressed flex items-center justify-center gap-3"
  >
    <Mic size={24} />
    Spravovať nahrávky
  </button>
  <p className="text-center mt-4 text-lg opacity-50 font-medium">Nahraj vlastný hlas pre každý zvuk</p>
</div>
```

Add `Mic` to the lucide-react import:
```ts
import { ArrowLeft, Music, Mic } from 'lucide-react';
```

- [ ] **Step 3: Run lint**

```bash
npm run lint
```
Expected: no errors.

- [ ] **Step 4: Smoke test**

```bash
npm run dev
```

Manual checks:
1. Navigate to home → tap settings gear → hold 3s (ParentsGate) → confirm "Vlastné nahrávky" section appears
2. Tap "Spravovať nahrávky" → confirm navigation to `/recordings`
3. Confirm category tabs display: Písmená, Slová, Slabiky, Čísla, Frázy, Pochvaly
4. Type in search → confirm tabs hide and items filter
5. Tap any item → confirm recording sub-screen appears with mic button and VU meter
6. Grant microphone permission → tap mic button → speak → confirm auto-stop after ~0.8s of silence
7. Confirm mic badge appears next to the item after saving
8. Re-enter the item → confirm "Zmazať nahrávku" button appears → tap it → confirm badge disappears
9. Navigate to any game → confirm custom recording plays for the overridden item

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/shared/components/SettingsOverlay.tsx
git commit -m "feat: add /recordings route and Vlastné nahrávky entry point in settings"
```
