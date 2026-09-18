/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { recordingTransition, type RecorderState, type RecorderError } from '../../recordings/recordingState';

export type { RecorderState } from '../../recordings/recordingState';

export interface UseRecorderResult {
  state: RecorderState;
  level: number;
  speaking: boolean;
  error: RecorderError | null;
  start(): Promise<void>;
  stop(): Promise<Blob>;
  cancel(): void;
  reset(): void;
}

const SILENCE_THRESHOLD_DB = -35;
const SAMPLE_RATE = 44100;

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

function encodeWav(samples: Float32Array): Blob {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (SAMPLE_RATE * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = samples.length * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const write = (off: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i));
  };

  write(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  write(8, 'WAVE');
  write(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  write(36, 'data');
  view.setUint32(40, dataSize, true);

  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

export function useRecorder(): UseRecorderResult {
  const [state, setState] = useState<RecorderState>('idle');
  const stateRef = useRef<RecorderState>('idle');
  const [error, setError] = useState<RecorderError | null>(null);
  const [level, setLevel] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const generation = useRef(0);
  const resources = useRef<{
    stream?: MediaStream;
    recorder?: MediaRecorder;
    context?: AudioContext;
    decode?: AudioContext;
    frame?: number;
    timer?: ReturnType<typeof setTimeout>;
    reject?: (reason: Error) => void;
    chunks: Blob[];
  }>({ chunks: [] });

  const transition = useCallback((next: RecorderState) => {
    stateRef.current = recordingTransition(stateRef.current, next);
    setState(stateRef.current);
  }, []);

  const cleanup = useCallback(() => {
    const current = resources.current;
    if (current.frame !== undefined) cancelAnimationFrame(current.frame);
    clearTimeout(current.timer);
    if (current.recorder) {
      current.recorder.ondataavailable = null;
      current.recorder.onstop = null;
      current.recorder.onerror = null;
      if (current.recorder.state !== 'inactive') current.recorder.stop();
    }
    current.stream?.getTracks().forEach(track => track.stop());
    void current.context?.close().catch(() => {});
    void current.decode?.close().catch(() => {});
    current.reject?.(new DOMException('Recording cancelled', 'AbortError'));
    resources.current = { chunks: [] };
  }, []);

  const cancel = useCallback(() => {
    generation.current++;
    cleanup();
    setLevel(0);
    setSpeaking(false);
    transition('cancelled');
  }, [cleanup, transition]);

  const reset = useCallback(() => {
    if (['requesting', 'recording', 'processing'].includes(stateRef.current)) cancel();
    transition('idle');
    setError(null);
  }, [cancel, transition]);

  useEffect(() => () => {
    generation.current++;
    cleanup();
  }, [cleanup]);

  const start = useCallback(async () => {
    if (stateRef.current !== 'idle') return;
    const token = ++generation.current;
    transition('requesting');
    setError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') throw new Error('Unavailable');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (token !== generation.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      resources.current.stream = stream;
      const context = new AudioContext({ sampleRate: SAMPLE_RATE });
      resources.current.context = context;
      const analyser = context.createAnalyser();
      analyser.fftSize = 2048;
      context.createMediaStreamSource(stream).connect(analyser);
      const recorder = new MediaRecorder(stream);
      const current = resources.current;
      current.recorder = recorder;
      recorder.ondataavailable = event => {
        if (token === generation.current && event.data.size) current.chunks.push(event.data);
      };
      recorder.onerror = () => {
        if (token !== generation.current) return;
        current.reject?.(new Error('Recording failed'));
        cleanup();
        setError('processing-failed');
        transition('error');
      };
      recorder.start();
      transition('recording');
      const values = new Float32Array(analyser.frequencyBinCount);
      const poll = () => {
        if (token !== generation.current || stateRef.current !== 'recording') return;
        analyser.getFloatTimeDomainData(values);
        const rms = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0) / values.length);
        setLevel(Math.min(1, rms * 10));
        setSpeaking(rmsToDb(rms) >= SILENCE_THRESHOLD_DB);
        current.frame = requestAnimationFrame(poll);
      };
      current.frame = requestAnimationFrame(poll);
    } catch (cause) {
      if (token !== generation.current) return;
      cleanup();
      setError(cause instanceof DOMException && cause.name === 'NotAllowedError' ? 'permission-denied' : 'unavailable');
      transition('error');
    }
  }, [cleanup, transition]);

  const stop = useCallback(async (): Promise<Blob> => {
    const current = resources.current;
    const recorder = current.recorder;
    if (stateRef.current !== 'recording' || !recorder) throw new Error('Recorder is not recording');
    const token = generation.current;
    transition('processing');
    if (current.frame !== undefined) cancelAnimationFrame(current.frame);
    setLevel(0);
    setSpeaking(false);
    try {
      await new Promise<void>((resolve, reject) => {
        current.reject = reject;
        current.timer = setTimeout(() => reject(new Error('Recording timed out')), 10000);
        recorder.onstop = () => { if (token === generation.current) resolve(); };
        recorder.stop();
        current.stream?.getTracks().forEach(track => track.stop());
        current.stream = undefined;
        void current.context?.close().catch(() => {});
        current.context = undefined;
      });
      const raw = new Blob(current.chunks, { type: recorder.mimeType });
      if (!raw.size) throw new Error('Empty recording');
      const context = new AudioContext({ sampleRate: SAMPLE_RATE });
      current.decode = context;
      const decoded = await context.decodeAudioData(await raw.arrayBuffer());
      if (token !== generation.current) throw new DOMException('Recording cancelled', 'AbortError');
      const samples = trimSilence(decoded.getChannelData(0), SILENCE_THRESHOLD_DB);
      if (!samples.length) throw new Error('Empty samples');
      const blob = encodeWav(samples);
      transition('saved');
      return blob;
    } catch (cause) {
      if (token === generation.current) {
        setError('processing-failed');
        transition('error');
      }
      throw cause;
    } finally {
      if (token === generation.current) {
        current.reject = undefined;
        cleanup();
      }
    }
  }, [cleanup, transition]);

  return { state, level, speaking, error, start, stop, cancel, reset };
}
