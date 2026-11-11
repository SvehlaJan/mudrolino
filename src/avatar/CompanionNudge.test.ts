import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createGameState } from '../shared/game/gameState';
import { IDLE_NUDGE_CLIPS, selectIdleNudgeClip } from './companionCelebration';
import {
  CompanionNudge,
  IDLE_NUDGE_DELAY_MS,
  shouldArmIdleNudge,
} from './CompanionNudge';
import type { CompanionConfig } from './companionConfig';
import type { CompanionResource } from './companionResources';

const config: CompanionConfig = {
  id: 'bear-v1',
  modelUrl: '/bear.glb',
  animationName: 'celebrate',
  durationMs: 1400,
};

const nudgeEvent = {
  eventKey: 'nudge:1',
  animationName: 'think' as const,
  startedAtMs: 12_000,
};

const render = (overrides: Partial<Parameters<typeof CompanionNudge>[0]> = {}) =>
  renderToStaticMarkup(
    createElement(CompanionNudge, {
      event: nudgeEvent,
      config,
      resource: { status: 'ready', modelUrl: config.modelUrl } as CompanionResource,
      reducedMotion: false,
      stillUrl: '/bear-still.png',
      ...overrides,
    }),
  );

describe('CompanionNudge gating and clip rotation', () => {
  it('uses a 12,000 ms inactivity delay and arms only during unlocked awaiting-answer with companion enabled', () => {
    expect(IDLE_NUDGE_DELAY_MS).toBe(12_000);
    const awaiting = { ...createGameState(), phase: 'awaiting-answer' as const, paused: false };
    expect(shouldArmIdleNudge(awaiting, false, true)).toBe(true);

    expect(shouldArmIdleNudge({ ...awaiting, paused: true }, false, true)).toBe(false);
    expect(shouldArmIdleNudge(awaiting, true, true)).toBe(false);
    expect(shouldArmIdleNudge(awaiting, false, false)).toBe(false);

    for (const phase of [
      'loading',
      'ready',
      'listening',
      'resolving-answer',
      'answered-incorrectly',
      'answered-correctly',
      'transitioning',
      'session-complete',
      'recoverable-error',
    ] as const) {
      expect(shouldArmIdleNudge({ ...awaiting, phase }, false, true)).toBe(false);
    }
  });

  it('cycles IDLE_NUDGE_CLIPS across think, search, and listen', () => {
    expect(IDLE_NUDGE_CLIPS).toEqual(['think', 'search', 'listen']);
    expect(selectIdleNudgeClip(0, 0)).toBe('think');
    expect(selectIdleNudgeClip(0, 1)).toBe('search');
    expect(selectIdleNudgeClip(0, 2)).toBe('listen');
    expect(selectIdleNudgeClip(0, 3)).toBe('think');
    expect(selectIdleNudgeClip(1, 0)).toBe('search');
    expect(selectIdleNudgeClip(2, 0)).toBe('listen');
  });
});

describe('CompanionNudge rendering', () => {
  it('renders nothing when inactive or when companion config is absent', () => {
    expect(render({ event: null })).toBe('');
    expect(render({ config: null })).toBe('');
  });

  it('renders a fixed pointer-events-none decorative badge with bear-still when 3D is unavailable and omits still when ready', () => {
    const stillHtml = render({ reducedMotion: true });
    expect(stillHtml).toContain('data-testid="companion-idle-nudge"');
    expect(stillHtml).toContain('aria-hidden="true"');
    expect(stillHtml).toContain('pointer-events-none');
    expect(stillHtml).toContain('fixed');
    expect(stillHtml).toContain('data-companion-animation="think"');
    expect(stillHtml).toContain('data-companion-representation="still"');
    expect(stillHtml).toContain('src="/bear-still.png"');
    expect(stillHtml).not.toContain('<canvas');

    const readyHtml = render();
    expect(readyHtml).toContain('data-testid="companion-idle-nudge"');
    expect(readyHtml).not.toContain('src="/bear-still.png"');
  });
});
