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
  /** True when the current frame is above the silence threshold (voice detected) */
  speaking: boolean;
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
  const chunks: BlobPart[] = [];

  for (let i = 0; i < pcm.length; i += blockSize) {
    const block = pcm.subarray(i, i + blockSize);
    const encoded = encoder.encodeBuffer(block);
    if (encoded.length > 0) chunks.push(new Uint8Array(encoded));
  }

  const flushed = encoder.flush();
  if (flushed.length > 0) chunks.push(new Uint8Array(flushed));

  return new Blob(chunks, { type: 'audio/mpeg' });
}

export function useRecorder(): UseRecorderResult {
  const [state, setState] = useState<RecorderState>('idle');
  const [level, setLevel] = useState(0);
  const [speaking, setSpeaking] = useState(false);
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
    setSpeaking(false);
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

      try {
        const rawBlob = new Blob(chunks, { type: mediaRecorder.mimeType });
        if (rawBlob.size === 0) throw new Error('No audio data recorded');

        const arrayBuffer = await rawBlob.arrayBuffer();

        // Decode to PCM for trimming
        const decodeCtx = new AudioContext({ sampleRate: SAMPLE_RATE });
        const audioBuffer = await decodeCtx.decodeAudioData(arrayBuffer);
        decodeCtx.close();

        const samples = audioBuffer.getChannelData(0);
        const trimmed = trimSilence(samples, SILENCE_THRESHOLD_DB);
        const mp3Blob = encodeMp3(trimmed);

        blobResolveRef.current?.(mp3Blob);
      } catch (err) {
        console.warn('[useRecorder] Processing failed:', err);
        // Reject the promise so callers don't hang
        blobResolveRef.current?.(new Blob([], { type: 'audio/mpeg' }));
      } finally {
        setState('idle');
      }
    };

    // Level polling + silence detection
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);
    let silenceStart: number | null = null;
    // Silence detection only activates after voice is first detected
    let hasSpoken = false;

    const pollLevel = () => {
      if (!analyserRef.current) return;
      analyserRef.current.getFloatTimeDomainData(dataArray);

      let sum = 0;
      for (let i = 0; i < bufferLength; i++) sum += dataArray[i] * dataArray[i];
      const rms = Math.sqrt(sum / bufferLength);
      const db = rmsToDb(rms);
      setLevel(Math.min(1, rms * 10)); // scale for VU meter

      const isSilent = db < SILENCE_THRESHOLD_DB;
      setSpeaking(!isSilent);

      if (!isSilent) hasSpoken = true;

      // Only start watching for silence after voice has been detected at least once
      if (hasSpoken) {
        const now = performance.now();
        if (isSilent) {
          if (silenceStart === null) silenceStart = now;
          else if (now - silenceStart >= SILENCE_DURATION_MS) {
            // Auto-stop on sustained silence after speaking
            if (mediaRecorderRef.current?.state === 'recording') {
              mediaRecorderRef.current.stop();
              return; // stop polling
            }
          }
        } else {
          silenceStart = null;
        }
      }

      levelRafRef.current = requestAnimationFrame(pollLevel);
    };

    mediaRecorder.start();
    setState('recording');
    levelRafRef.current = requestAnimationFrame(pollLevel);
  }, [state, cleanup]);

  return { state, level, speaking, start, stop, blobPromise };
}
