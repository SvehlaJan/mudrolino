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
const playbackEvents: string[] = [];
let speechCompletion: 'automatic' | 'manual' | 'silent' = 'automatic';

class FakeAudio {
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  currentTime = 0;
  paused = false;
  muted = false;

  constructor(readonly path: string) {
    played.push(this);
  }

  play(): Promise<void> {
    playbackEvents.push(`audio:${this.path}`);
    if (this.path.includes('tts')) return Promise.reject(new Error('missing clip'));
    if (!this.path.includes('first') && !this.path.includes('second') && !this.path.includes('long')) {
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
  volume = 1;
  voice: unknown;

  constructor(readonly text: string) {}
}

const synth = {
  onvoiceschanged: null as (() => void) | null,
  paused: false,
  cancel: () => { playbackEvents.push('synth:cancel'); },
  getVoices: () => [],
  resume: () => undefined,
  speak: (utterance: FakeUtterance) => {
    spoken.push(utterance);
    playbackEvents.push(`synth:speak:${utterance.text}`);
    if (speechCompletion === 'automatic') utterance.onend?.();
  },
};

Object.assign(globalThis, {
  window: { speechSynthesis: synth },
  Audio: FakeAudio,
  SpeechSynthesisUtterance: FakeUtterance,
  localStorage: { getItem: () => null, setItem: () => undefined },
  URL: { createObjectURL: () => 'blob:override', revokeObjectURL: () => undefined },
});

const { AudioManager, SPEECH_UTTERANCE_TIMEOUT_MS } = await import('./audioManager');
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

  speechCompletion = 'manual';
  const completedTtsManager = new AudioManager();
  const completedTtsPlay = completedTtsManager.play({ clips: [{ path: 'tts-completes', fallbackText: 'completed speech' }] });
  await new Promise((resolve) => setTimeout(resolve, 60));
  const completedUtterance = spoken.at(-1)!;
  assert.equal(completedUtterance.volume, 1, 'normal builds must preserve audible speech');
  completedUtterance.onend?.();
  await completedTtsPlay;
  assert.equal(completedUtterance.onend, null, 'normal TTS completion must clean up its event handler');

  const cancelledTtsManager = new AudioManager();
  const cancelledTtsPlay = cancelledTtsManager.play({ clips: [{ path: 'tts-cancelled', fallbackText: 'cancelled speech' }] });
  await new Promise((resolve) => setTimeout(resolve, 60));
  const cancelledUtterance = spoken.at(-1)!;
  cancelledTtsManager.stop();
  await cancelledTtsPlay;
  assert.equal(cancelledUtterance.onend, null, 'cancelled TTS must clean up its event handler');

  speechCompletion = 'silent';
  const silentTtsManager = new AudioManager();
  const spokenBeforeSilentTts = spoken.length;
  const eventsBeforeSilentTts = playbackEvents.length;
  const nativeSetTimeout = globalThis.setTimeout;
  const accelerateSpeechTimeout = (...[handler, delay, ...args]: Parameters<typeof setTimeout>) =>
    nativeSetTimeout(handler, delay === SPEECH_UTTERANCE_TIMEOUT_MS ? 0 : delay, ...args);
  globalThis.setTimeout = accelerateSpeechTimeout as typeof setTimeout;
  try {
    const silentTtsPlay = silentTtsManager.play({ clips: [
      { path: 'tts-silent', fallbackText: 'silent speech' },
      { path: 'after-silent', fallbackText: 'after silent speech' },
    ] });
    const silentTtsSettled = await Promise.race([
      silentTtsPlay.then(() => true),
      new Promise<boolean>((resolve) => nativeSetTimeout(() => resolve(false), 100)),
    ]);
    assert.equal(silentTtsSettled, true, 'a started TTS utterance with no end/error event must settle on its timeout');
    const silentUtterances = spoken.slice(spokenBeforeSilentTts);
    assert.equal(silentUtterances.length, 1, 'the silent test must start exactly one new TTS utterance');
    const [silentUtterance] = silentUtterances;
    assert.equal(silentUtterance.text, 'silent speech', 'the silent test must inspect its own utterance');
    assert.equal(silentUtterance.onend, null, 'timed-out TTS must clean up its event handler');

    const silentEvents = playbackEvents.slice(eventsBeforeSilentTts);
    const speechIndex = silentEvents.indexOf('synth:speak:silent speech');
    const timeoutCancelIndex = silentEvents.indexOf('synth:cancel', speechIndex + 1);
    const followingClipIndex = silentEvents.indexOf('audio:/audio/after-silent.mp3');
    assert.notEqual(timeoutCancelIndex, -1, 'the silent TTS timeout must call synth.cancel()');
    assert.ok(followingClipIndex > timeoutCancelIndex, 'the following clip must wait until silent TTS is cancelled');
  } finally {
    globalThis.setTimeout = nativeSetTimeout;
    silentTtsManager.stop();
  }
  speechCompletion = 'automatic';

  const currentManager = new AudioManager();
  const first = currentManager.play({ clips: [{ path: 'first', fallbackText: 'first' }] });
  await Promise.resolve();
  const firstAudio = played.at(-1)!;
  assert.equal(firstAudio.muted, false, 'normal builds must preserve audible media');
  const second = currentManager.play({ clips: [{ path: 'second', fallbackText: 'second' }] });
  await Promise.resolve();
  const secondAudio = played.at(-1)!;
  firstAudio.onended?.();
  currentManager.stop();
  assert.equal(secondAudio.paused, true, 'a stale clip completion must not clear the current clip');
  secondAudio.onended?.();
  await Promise.all([first, second]);

  const midPlayManager = new AudioManager();
  const midPlay = midPlayManager.play({ clips: [{ path: 'long-running', fallbackText: 'long' }] });
  await Promise.resolve();
  await Promise.resolve();
  const stillPending = await Promise.race([
    midPlay.then(() => false),
    new Promise<boolean>((resolve) => setTimeout(() => resolve(true), 20)),
  ]);
  assert.equal(stillPending, true, 'a clip with no ended/error event must still be pending before stop');
  midPlayManager.stop();
  const settledPromptly = await Promise.race([
    midPlay.then(() => true),
    new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 200)),
  ]);
  assert.equal(settledPromptly, true, 'stop() must settle an active clip without manually invoking onended');
} finally {
  audioOverrideStore.get = originalGet;
}

console.log('✓ audio playback cancellation contract passed');
