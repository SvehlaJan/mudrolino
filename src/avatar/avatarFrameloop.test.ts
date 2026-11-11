import { describe, expect, it } from 'vitest';
import { resolveCompanionClipName, shouldPauseAvatarFrameloop } from './avatarFrameloop';

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
});

describe('resolveCompanionClipName', () => {
  it('returns idle_breathe when present in available clips', () => {
    const v7Clips = [...CELEBRATION_V6_CLIPS, 'idle_breathe'];
    expect(resolveCompanionClipName('idle_breathe', v7Clips)).toBe('idle_breathe');
  });

  it('falls back cleanly from idle_breathe to idle against celebration-v6 17-clip list', () => {
    expect(CELEBRATION_V6_CLIPS).toHaveLength(17);
    expect(resolveCompanionClipName('idle_breathe', CELEBRATION_V6_CLIPS)).toBe('idle');
  });

  it('falls back to case-insensitive idle clip, then first clip, or undefined when empty', () => {
    expect(resolveCompanionClipName('wave', CELEBRATION_V6_CLIPS)).toBe('wave');
    expect(resolveCompanionClipName('missing', ['Walk', 'Idle_Loop'])).toBe('Idle_Loop');
    expect(resolveCompanionClipName(null, ['Walk', 'Run'])).toBe('Walk');
    expect(resolveCompanionClipName('wave', [])).toBeUndefined();
  });
});
