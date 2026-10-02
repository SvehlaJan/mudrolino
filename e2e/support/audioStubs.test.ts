import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installAudioStub, installSpeechStub, type AudioStubOptions } from './audioStubs';

const defaults: AudioStubOptions = { priority: 1, holdPraise: false, holdPaths: [], holdFirstClip: false };
let observed: { __heldAudio?: EventTarget[]; __holdAudioPaths?: string[] };
let mediaConstructor: new (src: string) => EventTarget & { play(): Promise<void> };

beforeEach(() => {
  vi.useFakeTimers();
  observed = {};
  class Media extends EventTarget {
    constructor(public src: string) { super(); }
    play() { return Promise.reject(new Error('native playback must be replaced')); }
  }
  mediaConstructor = Media;
  vi.stubGlobal('HTMLMediaElement', Media);
  vi.stubGlobal('window', observed);
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('deterministic audio initializers', () => {
  it.each([true, false])('holds exactly the opening clip regardless of default initializer order (%s)', async reverse => {
    const held: AudioStubOptions = { ...defaults, priority: 2, holdFirstClip: true };
    for (const options of reverse ? [held, defaults] : [defaults, held]) installAudioStub(options);
    const opening = new mediaConstructor('/audio/sk/letters/a.mp3');
    const selection = new mediaConstructor('/audio/sk/letters/a.mp3');
    const finished = vi.fn();
    opening.addEventListener('ended', finished);
    selection.addEventListener('ended', finished);
    await opening.play();
    await selection.play();
    await vi.runAllTimersAsync();
    expect(observed.__heldAudio).toEqual([opening]);
    expect(finished).toHaveBeenCalledOnce();
  });

  it('preserves held verdict options when the default initializer executes last', async () => {
    installAudioStub({ ...defaults, priority: 2, holdPraise: true });
    installAudioStub(defaults);
    const praise = new mediaConstructor('/audio/sk/praise/vyborne.mp3');
    await praise.play();
    expect(observed.__heldAudio).toEqual([praise]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('allows terminal verdicts to be held after earlier rounds completed normally', async () => {
    installAudioStub(defaults);
    const earlier = new mediaConstructor('/audio/sk/praise/vyborne.mp3');
    await earlier.play();
    await vi.runAllTimersAsync();
    expect(observed.__heldAudio).toBeUndefined();
    observed.__holdAudioPaths = ['/phrases/nevadi'];
    const terminal = new mediaConstructor('/audio/sk/phrases/nevadi.mp3');
    await terminal.play();
    expect(observed.__heldAudio).toEqual([terminal]);
  });

  it('speech completion remains deterministic when lower-priority initialization runs last', async () => {
    class Synth { speak(_utterance: { onend: () => void }) {} }
    const synth = new Synth();
    vi.stubGlobal('window', { speechSynthesis: synth });
    installSpeechStub(2);
    installSpeechStub(1);
    const onend = vi.fn();
    synth.speak({ onend });
    await vi.runAllTimersAsync();
    expect(onend).toHaveBeenCalledOnce();
  });
});
