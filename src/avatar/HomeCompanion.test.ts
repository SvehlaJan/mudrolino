import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { HOME_TAP_CLIPS } from './companionCelebration';
import {
  HomeCompanion,
  createHomeCompanionState,
  homeCompanionReducer,
} from './HomeCompanion';
import type { CompanionConfig } from './companionConfig';
import type { CompanionResource } from './companionResources';

const config: CompanionConfig = {
  id: 'bear-v1',
  modelUrl: '/bear.glb',
  animationName: 'celebrate',
  durationMs: 1400,
};

const render = (overrides: Partial<Parameters<typeof HomeCompanion>[0]> = {}) =>
  renderToStaticMarkup(
    createElement(HomeCompanion, {
      locale: 'sk',
      config,
      resource: { status: 'ready', modelUrl: config.modelUrl } as CompanionResource,
      reducedMotion: false,
      stillUrl: '/bear-still.png',
      ...overrides,
    }),
  );

describe('HomeCompanion markup and accessibility', () => {
  it('renders nothing when config is null or disabled in default test mode', () => {
    expect(render({ config: null })).toBe('');
    expect(renderToStaticMarkup(createElement(HomeCompanion, { locale: 'sk' }))).toBe('');
  });

  it.each([
    { reducedMotion: true },
    { resource: { status: 'loading', modelUrl: config.modelUrl } as CompanionResource },
    { resource: { status: 'failed', modelUrl: config.modelUrl } as CompanionResource },
    { resource: { status: 'disabled', modelUrl: null } as CompanionResource },
    { resource: { status: 'ready', modelUrl: '/other.glb' } as CompanionResource },
  ])('renders the accessible greeting button with bear-still when 3D is unavailable (%j)', overrides => {
    const html = render(overrides);
    expect(html).toContain('<button');
    expect(html).toContain('type="button"');
    expect(html).toContain('data-testid="home-companion"');
    expect(html).toContain('aria-label="Zamávaj medvedíkovi"');
    expect(html).toContain('data-companion-animation="wave"');
    expect(html).toContain('data-companion-representation="still"');
    expect(html).toContain('min-h-12 min-w-12');
    expect(html).toContain('src="/bear-still.png"');
    expect(html).not.toContain('<canvas');
    expect(html).not.toContain('role="img"');
  });

  it('localizes aria-label to Czech and omits the 2D still image when 3D resources are ready', () => {
    const csHtml = render({ locale: 'cs', reducedMotion: true });
    expect(csHtml).toContain('aria-label="Zamávat medvídkovi"');

    const readyHtml = render();
    expect(readyHtml).toContain('data-testid="home-companion"');
    expect(readyHtml).not.toContain('src="/bear-still.png"');
  });
});

describe('HomeCompanion state machine', () => {
  it('plays wave once -> idle_breathe once -> settles at 0 fps', () => {
    const initial = createHomeCompanionState();
    expect(initial).toMatchObject({
      phase: 'welcome-wave',
      activeClip: 'wave',
      settled: false,
    });

    const afterWave = homeCompanionReducer(initial, { type: 'playbackComplete', nowMs: 1600 });
    expect(afterWave).toMatchObject({
      phase: 'welcome-breathe',
      activeClip: 'idle_breathe',
      settled: false,
      startedAtMs: 1600,
    });
    expect(afterWave.eventKey).not.toBe(initial.eventKey);

    const afterBreathe = homeCompanionReducer(afterWave, { type: 'playbackComplete', nowMs: 5200 });
    expect(afterBreathe).toMatchObject({
      phase: 'welcome-breathe',
      activeClip: 'idle_breathe',
      eventKey: afterWave.eventKey,
      settled: true,
    });
  });

  it('handles 5 rapid taps monotonically and cycles HOME_TAP_CLIPS without returning to idle_breathe', () => {
    let state = createHomeCompanionState();
    const seenKeys = new Set<string>();

    for (let i = 0; i < 5; i++) {
      state = homeCompanionReducer(state, { type: 'tap', nowMs: 100 + i * 50 });
      expect(seenKeys.has(state.eventKey)).toBe(false);
      seenKeys.add(state.eventKey);
      expect(state.eventKey).toBe(`tap:${i + 1}`);
      expect(state.activeClip).toBe(HOME_TAP_CLIPS[i]);
      expect(state.settled).toBe(false);
    }

    // Completing the 5th tap clip settles directly on 'bow' without going through 'idle_breathe'
    const settledAfterTap = homeCompanionReducer(state, { type: 'playbackComplete', nowMs: 2500 });
    expect(settledAfterTap).toMatchObject({
      phase: 'tap',
      activeClip: 'bow',
      eventKey: 'tap:5',
      settled: true,
    });

    // Taps 6, 7, 8 finish the 7-clip cycle and wrap back to 'peekaboo'
    const tap6 = homeCompanionReducer(settledAfterTap, { type: 'tap', nowMs: 3000 });
    expect(tap6.activeClip).toBe('search');
    const tap7 = homeCompanionReducer(tap6, { type: 'tap', nowMs: 3100 });
    expect(tap7.activeClip).toBe('listen');
    const tap8 = homeCompanionReducer(tap7, { type: 'tap', nowMs: 3200 });
    expect(tap8.activeClip).toBe('peekaboo');
    expect(tap8.eventKey).toBe('tap:8');
  });
});
