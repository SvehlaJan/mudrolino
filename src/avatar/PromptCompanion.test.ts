import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createGameState } from '../shared/game/gameState';
import { IDLE_NUDGE_CLIPS } from './companionCelebration';
import {
  IDLE_NUDGE_DELAY_MS,
  PromptCompanion,
  selectIdleNudgeClip,
  shouldArmIdleNudge,
} from './PromptCompanion';
import type { CompanionConfig } from './companionConfig';
import type { CompanionResource } from './companionResources';

const config: CompanionConfig = {
  id: 'bear-v1',
  modelUrl: '/bear.glb',
  animationName: 'celebrate',
  durationMs: 1400,
};

const awaitingState = {
  ...createGameState(),
  phase: 'awaiting-answer' as const,
  paused: false,
};

const render = (overrides: Partial<Parameters<typeof PromptCompanion>[0]> = {}) =>
  renderToStaticMarkup(
    createElement(PromptCompanion, {
      locale: 'sk',
      config,
      resource: { status: 'ready', modelUrl: config.modelUrl } as CompanionResource,
      reducedMotion: false,
      stillUrl: '/bear-still.png',
      state: awaitingState,
      onReplay: () => undefined,
      ...overrides,
    }),
  );

describe('PromptCompanion gating and clip rotation', () => {
  it('uses a 12,000 ms inactivity delay and arms only during unlocked awaiting-answer with companion enabled', () => {
    expect(IDLE_NUDGE_DELAY_MS).toBe(12_000);
    expect(shouldArmIdleNudge(awaitingState, false, true)).toBe(true);

    expect(shouldArmIdleNudge({ ...awaitingState, paused: true }, false, true)).toBe(false);
    expect(shouldArmIdleNudge(awaitingState, true, true)).toBe(false);
    expect(shouldArmIdleNudge(awaitingState, false, false)).toBe(false);

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
      expect(shouldArmIdleNudge({ ...awaitingState, phase }, false, true)).toBe(false);
    }
  });

  it('cycles IDLE_NUDGE_CLIPS across think, search, listen, and point_down', () => {
    expect(IDLE_NUDGE_CLIPS).toEqual(['think', 'search', 'listen', 'point_down']);
    expect(selectIdleNudgeClip(0, 0)).toBe('think');
    expect(selectIdleNudgeClip(0, 1)).toBe('search');
    expect(selectIdleNudgeClip(0, 2)).toBe('listen');
    expect(selectIdleNudgeClip(0, 3)).toBe('point_down');
    expect(selectIdleNudgeClip(0, 4)).toBe('think');
    expect(selectIdleNudgeClip(1, 0)).toBe('search');
    expect(selectIdleNudgeClip(2, 0)).toBe('listen');
  });
});

describe('PromptCompanion rendering', () => {
  it('renders nothing when companion config is absent', () => {
    expect(render({ config: null })).toBe('');
  });

  it('renders an accessible replay button with localized aria-label and bear-still fallback when 3D is unavailable', () => {
    const stillHtml = render({ reducedMotion: true });
    expect(stillHtml).toContain('<button');
    expect(stillHtml).toContain('type="button"');
    expect(stillHtml).toContain('data-testid="prompt-companion"');
    expect(stillHtml).toContain('aria-label="Medvedík zopakuje zadanie"');
    expect(stillHtml).toContain('min-h-12 min-w-12');
    expect(stillHtml).toContain('data-companion-animation="idle_breathe"');
    expect(stillHtml).toContain('data-companion-representation="still"');
    expect(stillHtml).toContain('src="/bear-still.png"');
    expect(stillHtml).not.toContain('<canvas');

    const csHtml = render({ locale: 'cs', reducedMotion: true });
    expect(csHtml).toContain('aria-label="Medvídek zopakuje zadání"');

    const readyHtml = render();
    expect(readyHtml).toContain('data-testid="prompt-companion"');
    expect(readyHtml).not.toContain('src="/bear-still.png"');
  });

  it('reflects listening, retry, and idle nudge states cleanly in attributes', () => {
    const listeningHtml = render({
      state: { ...awaitingState, phase: 'listening' },
      promptReplaying: true,
      reducedMotion: true,
    });
    expect(listeningHtml).toContain('data-companion-animation="listen"');
    expect(listeningHtml).toContain('data-companion-reason="listen"');

    const retryHtml = render({
      state: { ...awaitingState, phase: 'answered-incorrectly', wrongAttempts: 1 },
      reducedMotion: true,
    });
    expect(retryHtml).toContain('data-companion-animation="gentle_try_again"');
    expect(retryHtml).toContain('data-companion-reason="retry"');

    const nudgeHtml = render({
      idleNudge: { eventKey: 'nudge:1', animationName: 'think', startedAtMs: 12_000 },
      reducedMotion: true,
    });
    expect(nudgeHtml).toContain('data-companion-animation="think"');
    expect(nudgeHtml).toContain('data-companion-reason="nudge"');
    expect(nudgeHtml).toContain('data-companion-nudge-active="true"');
  });
});
