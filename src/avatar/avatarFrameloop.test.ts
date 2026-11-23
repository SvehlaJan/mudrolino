import { describe, expect, it } from 'vitest';
import {
  CALM_IDLE_BASE_INTERVAL_MS,
  CALM_IDLE_MAX_INTERVAL_MS,
  computeCalmIdleIntervalMs,
  resolveCompanionClipName,
  shouldPauseAvatarFrameloop,
} from './avatarFrameloop';

const CELEBRATION_V6_CLIPS = [
  'celebrate',
  'wave',
  'clap',
  'jump',
  'finale',
  'idle',
  'search',
  'think',
  'listen',
  'encourage',
  'shrug',
  'flex',
  'bow',
  'march',
  'wiggle',
  'peekaboo',
  'stretch',
] as const;

describe('shouldPauseAvatarFrameloop', () => {
  it('never pauses in loop mode or when inspection is active', () => {
    expect(
      shouldPauseAvatarFrameloop({
        mode: 'loop',
        isInspection: false,
        actionPaused: false,
        actionTime: 1.4,
        duration: 1.4,
        settledFramesRendered: 5,
      }),
    ).toBe(false);

    expect(
      shouldPauseAvatarFrameloop({
        mode: undefined,
        isInspection: false,
        actionPaused: true,
        actionTime: 1.4,
        duration: 1.4,
        settledFramesRendered: 5,
      }),
    ).toBe(false);

    expect(
      shouldPauseAvatarFrameloop({
        mode: 'once',
        isInspection: true,
        actionPaused: true,
        actionTime: 1.4,
        duration: 1.4,
        settledFramesRendered: 5,
      }),
    ).toBe(false);

    expect(
      shouldPauseAvatarFrameloop({
        mode: 'still',
        isInspection: true,
        actionPaused: true,
        actionTime: 0,
        duration: 1.4,
        settledFramesRendered: 5,
      }),
    ).toBe(false);
  });

  it('renders at least one settled frame when once clip finishes before pausing', () => {
    expect(
      shouldPauseAvatarFrameloop({
        mode: 'once',
        isInspection: false,
        actionPaused: false,
        actionTime: 0.7,
        duration: 1.4,
        settledFramesRendered: 0,
      }),
    ).toBe(false);

    expect(
      shouldPauseAvatarFrameloop({
        mode: 'once',
        isInspection: false,
        actionPaused: false,
        actionTime: 1.4 - 1e-6,
        duration: 1.4,
        settledFramesRendered: 0,
      }),
    ).toBe(false);

    expect(
      shouldPauseAvatarFrameloop({
        mode: 'once',
        isInspection: false,
        actionPaused: true,
        actionTime: 1.4,
        duration: 1.4,
        settledFramesRendered: 0,
      }),
    ).toBe(false);

    expect(
      shouldPauseAvatarFrameloop({
        mode: 'once',
        isInspection: false,
        actionPaused: false,
        actionTime: 1.4 - 1e-6,
        duration: 1.4,
        settledFramesRendered: 1,
      }),
    ).toBe(true);

    expect(
      shouldPauseAvatarFrameloop({
        mode: 'once',
        isInspection: false,
        actionPaused: true,
        actionTime: 1.4,
        duration: 1.4,
        settledFramesRendered: 2,
      }),
    ).toBe(true);
  });

  it('renders one frame in still mode before pausing', () => {
    expect(
      shouldPauseAvatarFrameloop({
        mode: 'still',
        isInspection: false,
        actionPaused: true,
        actionTime: 0,
        duration: 1.4,
        settledFramesRendered: 0,
      }),
    ).toBe(false);

    expect(
      shouldPauseAvatarFrameloop({
        mode: 'still',
        isInspection: false,
        actionPaused: true,
        actionTime: 0,
        duration: 1.4,
        settledFramesRendered: 1,
      }),
    ).toBe(true);
  });

  it('pauses immediately when document is hidden and keeps running when once hands off to idleAfterOnce', () => {
    expect(
      shouldPauseAvatarFrameloop({
        mode: 'loop',
        isInspection: false,
        actionPaused: false,
        actionTime: 0.2,
        duration: 4.0,
        settledFramesRendered: 0,
        documentHidden: true,
      }),
    ).toBe(true);

    expect(
      shouldPauseAvatarFrameloop({
        mode: 'once',
        isInspection: false,
        actionPaused: true,
        actionTime: 1.4,
        duration: 1.4,
        settledFramesRendered: 2,
        hasIdleAfterOnce: true,
      }),
    ).toBe(false);
  });
});

describe('resolveCompanionClipName', () => {
  it('returns idle_breathe when present in available clips', () => {
    const v7Clips = [...CELEBRATION_V6_CLIPS, 'idle_breathe'];
    expect(resolveCompanionClipName('idle_breathe', v7Clips)).toBe('idle_breathe');
  });

  it('falls back cleanly from idle_breathe and v8 clips to v7 equivalents', () => {
    const v7Clips = [...CELEBRATION_V6_CLIPS, 'idle_breathe'];
    expect(CELEBRATION_V6_CLIPS).toHaveLength(17);
    expect(resolveCompanionClipName('idle_breathe', CELEBRATION_V6_CLIPS)).toBe('idle');
    expect(resolveCompanionClipName('walk', v7Clips)).toBe('march');
    expect(resolveCompanionClipName('point_down', v7Clips)).toBe('search');
    expect(resolveCompanionClipName('gentle_try_again', v7Clips)).toBe('encourage');
    expect(resolveCompanionClipName('talk_explain', v7Clips)).toBe('listen');
    expect(resolveCompanionClipName('count_one_two_three', v7Clips)).toBe('clap');
    expect(resolveCompanionClipName('sleepy_yawn', v7Clips)).toBe('stretch');
  });

  it('falls back to case-insensitive idle clip, then first clip, or undefined when empty', () => {
    expect(resolveCompanionClipName('wave', CELEBRATION_V6_CLIPS)).toBe('wave');
    expect(resolveCompanionClipName('missing', ['Walk', 'Idle_Loop'])).toBe('Idle_Loop');
    expect(resolveCompanionClipName(null, ['Walk', 'Run'])).toBe('Walk');
    expect(resolveCompanionClipName('wave', [])).toBeUndefined();
  });
});

describe('computeCalmIdleIntervalMs', () => {
  it('returns the base 50ms interval for non-positive, non-finite, and fast GPU frame times', () => {
    expect(computeCalmIdleIntervalMs(0)).toBe(CALM_IDLE_BASE_INTERVAL_MS);
    expect(computeCalmIdleIntervalMs(-5)).toBe(CALM_IDLE_BASE_INTERVAL_MS);
    expect(computeCalmIdleIntervalMs(Number.NaN)).toBe(CALM_IDLE_BASE_INTERVAL_MS);
    expect(computeCalmIdleIntervalMs(2)).toBe(CALM_IDLE_BASE_INTERVAL_MS);
    expect(computeCalmIdleIntervalMs(20)).toBe(CALM_IDLE_BASE_INTERVAL_MS);
  });

  it('scales up smoothly for moderate frame times and caps at 90ms for heavy software rendering', () => {
    expect(computeCalmIdleIntervalMs(50)).toBe(75);
    expect(computeCalmIdleIntervalMs(80)).toBe(CALM_IDLE_MAX_INTERVAL_MS);
    expect(computeCalmIdleIntervalMs(300)).toBe(CALM_IDLE_MAX_INTERVAL_MS);
  });
});
