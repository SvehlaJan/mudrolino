import { afterEach, describe, expect, it, vi } from 'vitest';
import { installNativeAudioMute } from './nativeAudioMute';

afterEach(() => { vi.unstubAllGlobals(); });

describe('native browser output muting', () => {
  it('mutes output before native play and returns the original playback promise without synthesizing completion', () => {
    const pendingPlayback = new Promise<void>(() => {});
    const nativePlay = vi.fn((muted: boolean) => { expect(muted).toBe(true); return pendingPlayback; });
    class Media {
      muted = false;
      play() { return nativePlay(this.muted); }
    }
    vi.stubGlobal('HTMLMediaElement', Media);
    vi.stubGlobal('window', {});
    installNativeAudioMute();
    const media = new Media();
    expect(media.play()).toBe(pendingPlayback);
    expect(nativePlay).toHaveBeenCalledOnce();
  });

  it('silences native speech without changing its callbacks or synthesizing an end event', () => {
    const nativeSpeak = vi.fn();
    class Synth { speak(utterance: { volume: number; onend: () => void }) { nativeSpeak(utterance); } }
    class Media { muted = false; play() { return Promise.resolve(); } }
    const synth = new Synth();
    vi.stubGlobal('HTMLMediaElement', Media);
    vi.stubGlobal('window', { speechSynthesis: synth });
    installNativeAudioMute();
    const onend = vi.fn();
    const utterance = { volume: 1, onend };
    synth.speak(utterance);
    expect(utterance.volume).toBe(0);
    expect(nativeSpeak).toHaveBeenCalledExactlyOnceWith(utterance);
    expect(utterance.onend).toBe(onend);
    expect(onend).not.toHaveBeenCalled();
  });
});
