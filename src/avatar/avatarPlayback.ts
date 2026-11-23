import { LoopOnce, LoopRepeat, type AnimationAction } from 'three';
import type { AvatarPlaybackOptions } from './avatarTypes';

/** Apply the event clock before the first rendered frame, including on remount. */
export function applyAvatarPlayback(
  action: AnimationAction,
  options: AvatarPlaybackOptions,
  elapsedSeconds: number,
  timeScale = 1,
): void {
  const duration = action.getClip().duration;
  action.reset().setEffectiveWeight(1).setEffectiveTimeScale(timeScale);
  action.setLoop(options.mode === 'loop' ? LoopRepeat : LoopOnce, options.mode === 'loop' ? Infinity : 1);
  action.clampWhenFinished = options.mode !== 'loop';
  action.play();
  action.time = options.mode === 'still' ? 0 : Math.max(0, Math.min(duration, elapsedSeconds));
  action.paused = options.mode === 'still' || (options.mode === 'once' && action.time >= duration);
  action.getMixer().update(0);
}

/** Cross-fade smoothly from an outgoing action to the next active clip (or snap cleanly when instant). */
export function transitionAvatarAction(
  prevAction: AnimationAction | null,
  nextAction: AnimationAction | null,
  options: AvatarPlaybackOptions,
  elapsedSeconds: number,
  timeScale = 1,
  instant = false,
): void {
  if (prevAction && prevAction !== nextAction) {
    if (instant) prevAction.stop();
    else prevAction.fadeOut(0.22);
  }
  if (!nextAction) return;
  applyAvatarPlayback(nextAction, options, elapsedSeconds, timeScale);
  if (!instant && prevAction && prevAction !== nextAction) {
    nextAction.fadeIn(0.22);
  }
}

/** Hand off a finished one-shot clip smoothly into its looping living-idle follow-up. */
export function handoffToIdleAction(
  fromAction: AnimationAction,
  idleAction: AnimationAction,
): void {
  if (fromAction !== idleAction) {
    fromAction.fadeOut(0.25);
    applyAvatarPlayback(idleAction, { mode: 'loop' }, 0, 1);
    idleAction.fadeIn(0.25);
    return;
  }
  idleAction.setLoop(LoopRepeat, Infinity);
  idleAction.clampWhenFinished = false;
  idleAction.paused = false;
  idleAction.play();
}
