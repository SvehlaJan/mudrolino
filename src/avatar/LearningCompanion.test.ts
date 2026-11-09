import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LearningCompanion } from './LearningCompanion';
import type { CompanionConfig } from './companionConfig';
import type { CompanionResource } from './companionResources';

const config: CompanionConfig = { id: 'bear-v1', modelUrl: '/bear.glb', animationName: 'celebrate', durationMs: 1400 };
const event = { eventKey: '0:1:1', roundsPlayed: 1, correctRounds: 1, startedAtMs: 100 };
const props = { event, config, resource: { status: 'ready', modelUrl: config.modelUrl } as CompanionResource,
  reducedMotion: false, stillUrl: '/bear.png' };
const render = (overrides: Partial<Parameters<typeof LearningCompanion>[0]> = {}) =>
  renderToStaticMarkup(createElement(LearningCompanion, { ...props, ...overrides }));

describe('decorative learning companion', () => {
  it('has no output without an active event or accepted config', () => {
    expect(render({ event: null })).toBe('');
    expect(render({ config: null })).toBe('');
  });

  it('lets callers replace default dimensions with responsive size classes', () => {
    const html = render({ reducedMotion: true, className: 'h-28 w-24 [@media(max-height:500px)]:h-14 [@media(max-height:500px)]:w-12' });
    expect(html).toContain('h-28 w-24');
    expect(html).toContain('[@media(max-height:500px)]:h-14');
    expect(html).not.toMatch(/style="[^"]*(?:width|height):/);
    expect(html).not.toContain('h-36');
    expect(html).not.toContain('w-28');
  });

  it.each([
    { reducedMotion: true },
    { resource: { status: 'loading', modelUrl: config.modelUrl } as CompanionResource },
    { resource: { status: 'failed', modelUrl: config.modelUrl } as CompanionResource },
    { resource: { status: 'disabled', modelUrl: null } as CompanionResource },
    { resource: { status: 'ready', modelUrl: '/other.glb' } as CompanionResource },
  ])('shows the decorative bundled still while 3D is unavailable (%j)', overrides => {
    const html = render(overrides);
    expect(html).toContain('data-testid="learning-companion"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('data-celebration-key="0:1:1"');
    expect(html).toContain('data-companion-animation="celebrate"');
    expect(html).toContain('data-companion-representation="still"');
    expect(html).toContain('src="/bear.png"');
    expect(html).toContain('alt=""');
    expect(html).not.toContain('<canvas');
    expect(html).not.toContain('role="img"');
  });

  it('does not render the 2D still image when 3D resources are ready', () => {
    const html = render();
    expect(html).toContain('data-testid="learning-companion"');
    expect(html).not.toContain('src="/bear.png"');
  });
});
