import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

class Media {
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  currentTime = 0;
  muted = false;
  pause = vi.fn();
  play = vi.fn(() => Promise.resolve());
}
class Utterance {
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  volume = 1;
  lang = '';
  rate = 1;
  pitch = 1;
  voice: SpeechSynthesisVoice | null = null;
  constructor(readonly text: string) {}
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { resolve, promise };
}
const synth = {
  cancel: vi.fn(), getVoices: () => [], paused: false, resume: vi.fn(), speak: vi.fn(), onvoiceschanged: null,
};
vi.stubGlobal('window', { speechSynthesis: synth });
vi.stubGlobal('localStorage', { getItem: () => null });
const { AudioManager, SPEECH_UTTERANCE_TIMEOUT_MS } = await import('./audioManager');

function setup() {
  const media: Media[] = [];
  const spoken: Utterance[] = [];
  const events: string[] = [];
  const getOverride = vi.fn(async (): Promise<Blob | null> => null);
  const revokeObjectURL = vi.fn();
  const manager = new AudioManager({
    initialLocale: 'sk',
    synth,
    createAudio: () => { const clip = new Media(); media.push(clip); return clip; },
    createUtterance: text => { const utterance = new Utterance(text); spoken.push(utterance); return utterance; },
    getOverride,
    createObjectURL: () => 'blob:override',
    revokeObjectURL,
    recordEvent: event => events.push(event),
    clock: { setTimeout: (callback, ms) => setTimeout(callback, ms), clearTimeout: timer => clearTimeout(timer) },
  });
  return { manager, media, spoken, events, getOverride, revokeObjectURL };
}
const clip = (path: string) => ({ path, fallbackText: path });
async function flush() { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); }

describe('audio playback cancellation and fallback', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.spyOn(console, 'warn').mockImplementation(() => undefined); });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  it('does not create media after a cancelled override lookup', async () => {
    const { manager, getOverride, media } = setup();
    const lookup = deferred<Blob | null>();
    getOverride.mockReturnValue(lookup.promise);
    const play = manager.play({ clips: [clip('old')] });
    manager.stop();
    lookup.resolve(null);
    await play;
    expect(media).toHaveLength(0);
  });

  it('plays clips serially and revokes override URLs after completion', async () => {
    const { manager, getOverride, media, events, revokeObjectURL } = setup();
    getOverride.mockResolvedValue(new Blob(['audio']));
    const play = manager.play({ clips: [clip('first'), clip('second')] });
    await flush();
    expect(media).toHaveLength(1);
    media[0].onended?.();
    await flush();
    expect(media).toHaveLength(2);
    expect(events).toEqual(['start:first', 'finish:first', 'start:second']);
    media[1].onended?.();
    await play;
    expect(revokeObjectURL).toHaveBeenCalledTimes(2);
    expect(events.at(-1)).toBe('finish:second');
  });

  it('settles stopped media and ignores a stale ended callback', async () => {
    const { manager, media } = setup();
    const first = manager.play({ clips: [clip('first'), clip('never')] });
    await flush();
    const staleEnd = media[0].onended;
    const second = manager.play({ clips: [clip('second')] });
    await flush();
    staleEnd?.();
    manager.stop();
    await Promise.all([first, second]);
    expect(media).toHaveLength(2);
    expect(media[1].pause).toHaveBeenCalledOnce();
    expect(media[1].onended).toBeNull();
  });

  it('cancels the 50ms fallback delay without starting speech or leaving timers', async () => {
    const { manager, media, spoken } = setup();
    const play = manager.play({ clips: [clip('missing')] });
    await flush();
    media[0].onerror?.();
    await flush();
    await vi.advanceTimersByTimeAsync(49);
    expect(spoken).toHaveLength(0);
    manager.stop();
    await play;
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(spoken).toHaveLength(0);
  });

  it('bounds silent speech and starts the next clip only after the timeout', async () => {
    const { manager, media, spoken, events } = setup();
    const play = manager.play({ clips: [clip('missing'), clip('next')] });
    await flush();
    media[0].onerror?.();
    await flush();
    await vi.advanceTimersByTimeAsync(50);
    expect(spoken[0]).toMatchObject({ lang: 'sk-SK', rate: 0.9 });
    await vi.advanceTimersByTimeAsync(SPEECH_UTTERANCE_TIMEOUT_MS - 1);
    expect(media).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(spoken[0].onend).toBeNull();
    expect(events).toEqual(['start:missing', 'finish:missing', 'start:next']);
    media[1].onended?.();
    await play;
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cleans up normal speech completion and cancellation', async () => {
    const { manager, media, spoken } = setup();
    for (let i = 0; i < 2; i++) {
      const play = manager.play({ clips: [clip('missing')] });
      await flush();
      media[i].onerror?.();
      await flush();
      await vi.advanceTimersByTimeAsync(50);
      if (i === 0) spoken[i].onend?.();
      else manager.stop();
      await play;
      expect(spoken[i].onend).toBeNull();
      expect(vi.getTimerCount()).toBe(0);
    }
  });
});
