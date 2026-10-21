import { describe, expect, it } from 'vitest';
import { AnimationClip, AnimationMixer, LoopOnce, LoopRepeat, NumberKeyframeTrack, Object3D } from 'three';
import { applyAvatarPlayback } from './avatarPlayback';

function fixture() {
  const object = new Object3D();
  const mixer = new AnimationMixer(object);
  const clip = new AnimationClip('celebrate', 1.4, [new NumberKeyframeTrack('.position[y]', [0, 1.4], [0, 14])]);
  return { object, mixer, action: mixer.clipAction(clip) };
}

describe('avatar playback with a real mixer', () => {
  it('plays once and holds its last pose over two clip durations', () => {
    const { object, mixer, action } = fixture();
    applyAvatarPlayback(action, { mode: 'once' }, 0);
    expect(action.loop).toBe(LoopOnce);
    expect(action.clampWhenFinished).toBe(true);
    mixer.update(0.7);
    expect(object.position.y).toBeCloseTo(7);
    mixer.update(2.1);
    expect(action.time).toBeCloseTo(1.4);
    expect(object.position.y).toBeCloseTo(14);
  });

  it('seeks a late mount into the original event', () => {
    const { object, mixer, action } = fixture();
    applyAvatarPlayback(action, { mode: 'once', eventKey: 'round-1', startedAtMs: 100 }, 0.7);
    expect(object.position.y).toBeCloseTo(7);
    mixer.update(0.2);
    expect(object.position.y).toBeCloseTo(9);
  });

  it('never wraps when mounted after the duration', () => {
    const { object, mixer, action } = fixture();
    applyAvatarPlayback(action, { mode: 'once' }, 3);
    expect(object.position.y).toBeCloseTo(14);
    mixer.update(2.8);
    expect(action.time).toBeCloseTo(1.4);
    expect(object.position.y).toBeCloseTo(14);
  });

  it('holds the first relaxed clip pose in still mode', () => {
    const { object, mixer, action } = fixture();
    object.position.y = 99;
    applyAvatarPlayback(action, { mode: 'still' }, 0.7);
    mixer.update(2.8);
    expect(action.time).toBe(0);
    expect(action.paused).toBe(true);
    expect(object.position.y).toBe(0);
  });

  it('keeps gallery looping by default', () => {
    const { object, mixer, action } = fixture();
    applyAvatarPlayback(action, { mode: 'loop' }, 0);
    expect(action.loop).toBe(LoopRepeat);
    mixer.update(3.1);
    expect(object.position.y).toBeCloseTo(3);
    expect(action.paused).toBe(false);
  });
});
