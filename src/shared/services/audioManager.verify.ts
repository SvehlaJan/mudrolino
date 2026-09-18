import assert from 'node:assert/strict';

type Deferred<T> = {
  promise: Promise<T>;
  resolve(value: T): void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

const played: FakeAudio[] = [];
const spoken: FakeUtterance[] = [];

class FakeAudio {
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  currentTime = 0;
  paused = false;

  constructor(readonly path: string) {
    played.push(this);
  }

  play(): Promise<void> {
    if (this.path.includes('tts')) return Promise.reject(new Error('missing clip'));
    if (!this.path.includes('first') && !this.path.includes('second')) {
      queueMicrotask(() => this.onended?.());
    }
    return Promise.resolve();
  }

  pause(): void {
    this.paused = true;
  }
}

class FakeUtterance {
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  lang = '';
  rate = 1;
  pitch = 1;
  voice: unknown;

  constructor(readonly text: string) {}
}

const synth = {
  onvoiceschanged: null as (() => void) | null,
  paused: false,
  cancel: () => undefined,
  getVoices: () => [],
  resume: () => undefined,
  speak: (utterance: FakeUtterance) => {
    spoken.push(utterance);
    utterance.onend?.();
  },
};

Object.assign(globalThis, {
  window: { speechSynthesis: synth },
  Audio: FakeAudio,
  SpeechSynthesisUtterance: FakeUtterance,
  localStorage: { getItem: () => null, setItem: () => undefined },
  URL: { createObjectURL: () => 'blob:override', revokeObjectURL: () => undefined },
});

const { AudioManager } = await import('./audioManager');
const { audioOverrideStore } = await import('./audioOverrideStore');

const originalGet = audioOverrideStore.get;
try {
  const pendingOverride = deferred<Blob | null>();
  audioOverrideStore.get = () => pendingOverride.promise;
  const manager = new AudioManager();
  const stalePlay = manager.play({ clips: [{ path: 'old', fallbackText: 'old' }] });
  manager.stop();
  pendingOverride.resolve(null);
  await stalePlay;
  assert.equal(played.length, 0, 'stop must cancel a pending override lookup before Audio is created');

  audioOverrideStore.get = async () => null;
  const ttsManager = new AudioManager();
  const ttsPlay = ttsManager.play({ clips: [{ path: 'tts', fallbackText: 'stale speech' }] });
  await new Promise((resolve) => setTimeout(resolve, 0));
  ttsManager.stop();
  await new Promise((resolve) => setTimeout(resolve, 60));
  await ttsPlay;
  assert.equal(spoken.length, 0, 'stop must cancel delayed fallback speech before it starts');

  const currentManager = new AudioManager();
  const first = currentManager.play({ clips: [{ path: 'first', fallbackText: 'first' }] });
  await Promise.resolve();
  const firstAudio = played.at(-1)!;
  const second = currentManager.play({ clips: [{ path: 'second', fallbackText: 'second' }] });
  await Promise.resolve();
  const secondAudio = played.at(-1)!;
  firstAudio.onended?.();
  currentManager.stop();
  assert.equal(secondAudio.paused, true, 'a stale clip completion must not clear the current clip');
  secondAudio.onended?.();
  await Promise.all([first, second]);
} finally {
  audioOverrideStore.get = originalGet;
}

console.log('✓ audio playback cancellation contract passed');
