import { LoopOnce, LoopRepeat, type AnimationAction } from 'three';
import type { AvatarPlaybackOptions } from './avatarTypes';

/** Apply the event clock before the first rendered frame, including on remount. */
export function applyAvatarPlayback(
  action: AnimationAction,
  options: AvatarPlaybackOptions,
  elapsedSeconds: number,
): void {
  const duration = action.getClip().duration;
  action.reset().setEffectiveWeight(1);
  action.setLoop(options.mode === 'loop' ? LoopRepeat : LoopOnce, options.mode === 'loop' ? Infinity : 1);
  action.clampWhenFinished = options.mode !== 'loop';
  action.play();
  action.time = options.mode === 'still' ? 0 : Math.max(0, Math.min(duration, elapsedSeconds));
  action.paused = options.mode === 'still' || (options.mode === 'once' && action.time >= duration);
  action.getMixer().update(0);
}
