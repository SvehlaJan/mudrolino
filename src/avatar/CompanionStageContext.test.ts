import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import {
  COMPANION_STAGE_PRIORITY,
  CompanionStageContext,
  reportCompanionStageError,
  sameActiveCompanionSlot,
  selectActiveCompanionSlot,
  type CompanionStageSlotRequest,
} from './companionStage';
import { HomeCompanion } from './HomeCompanion';
import { PromptCompanion } from './PromptCompanion';
import { createGameState } from '../shared/game/gameState';
import type { CompanionMode } from '../shared/services/appSettingsStore';

function makeSlot(
  id: string,
  priority: number,
  order: number,
  overrides: Partial<CompanionStageSlotRequest> = {},
) {
  return {
    id,
    priority,
    order,
    containerEl: ({ id } as unknown) as HTMLElement,
    canRender: true,
    modelUrl: '/bear.glb',
    animationName: 'celebrate',
    cameraDistance: 5.6,
    playback: { mode: 'once' as const, eventKey: id, startedAtMs: 0 },
    onModelReady: vi.fn(),
    onPlaybackComplete: vi.fn(),
    onError: vi.fn(),
    ...overrides,
  };
}

describe('selectActiveCompanionSlot', () => {
  it('returns null when no registered slots can render or have containers', () => {
    expect(selectActiveCompanionSlot([])).toBeNull();
    expect(
      selectActiveCompanionSlot([
        makeSlot('home', COMPANION_STAGE_PRIORITY.home, 1, { canRender: false }),
        makeSlot('prompt', COMPANION_STAGE_PRIORITY.prompt, 2, { containerEl: null }),
      ]),
    ).toBeNull();
  });

  it('prefers overlay over prompt and prompt over home by priority', () => {
    const home = makeSlot('home', COMPANION_STAGE_PRIORITY.home, 1);
    const prompt = makeSlot('prompt', COMPANION_STAGE_PRIORITY.prompt, 2);
    const overlay = makeSlot('overlay', COMPANION_STAGE_PRIORITY.overlay, 3);

    expect(selectActiveCompanionSlot([home, prompt])?.id).toBe('prompt');
    expect(selectActiveCompanionSlot([home, prompt, overlay])?.id).toBe('overlay');
    expect(selectActiveCompanionSlot([overlay, prompt, home])?.id).toBe('overlay');
  });

  it('ignores higher-priority slots that cannot render and falls back cleanly', () => {
    const home = makeSlot('home', COMPANION_STAGE_PRIORITY.home, 1);
    const prompt = makeSlot('prompt', COMPANION_STAGE_PRIORITY.prompt, 2, { canRender: true });
    const overlayDisabled = makeSlot('overlay', COMPANION_STAGE_PRIORITY.overlay, 3, { canRender: false });

    expect(selectActiveCompanionSlot([home, prompt, overlayDisabled])?.id).toBe('prompt');
  });

  it('tie-breaks equal-priority slots deterministically by latest registration order', () => {
    const first = makeSlot('prompt-a', COMPANION_STAGE_PRIORITY.prompt, 1);
    const second = makeSlot('prompt-b', COMPANION_STAGE_PRIORITY.prompt, 2);

    expect(selectActiveCompanionSlot([first, second])?.id).toBe('prompt-b');
    expect(selectActiveCompanionSlot([second, first])?.id).toBe('prompt-b');
  });

  it('compares idleAfterOnce when deciding whether active slot changed', () => {
    const containerEl = ({ id: 'prompt' } as unknown) as HTMLElement;
    const base = selectActiveCompanionSlot([
      makeSlot('prompt', COMPANION_STAGE_PRIORITY.prompt, 1, {
        containerEl,
        playback: { mode: 'once', eventKey: 'k1', startedAtMs: 0, idleAfterOnce: 'idle_breathe' },
      }),
    ]);
    const same = selectActiveCompanionSlot([
      makeSlot('prompt', COMPANION_STAGE_PRIORITY.prompt, 1, {
        containerEl,
        playback: { mode: 'once', eventKey: 'k1', startedAtMs: 0, idleAfterOnce: 'idle_breathe' },
      }),
    ]);
    const noIdle = selectActiveCompanionSlot([
      makeSlot('prompt', COMPANION_STAGE_PRIORITY.prompt, 1, {
        containerEl,
        playback: { mode: 'once', eventKey: 'k1', startedAtMs: 0 },
      }),
    ]);
    const otherIdle = selectActiveCompanionSlot([
      makeSlot('prompt', COMPANION_STAGE_PRIORITY.prompt, 1, {
        containerEl,
        playback: { mode: 'once', eventKey: 'k1', startedAtMs: 0, idleAfterOnce: 'idle' },
      }),
    ]);

    expect(base).not.toBeNull();
    expect(sameActiveCompanionSlot(base, { ...same!, onModelReady: base!.onModelReady, onPlaybackComplete: base!.onPlaybackComplete, onError: base!.onError })).toBe(true);
    expect(sameActiveCompanionSlot(base, { ...noIdle!, onModelReady: base!.onModelReady, onPlaybackComplete: base!.onPlaybackComplete, onError: base!.onError })).toBe(false);
    expect(sameActiveCompanionSlot(base, { ...otherIdle!, onModelReady: base!.onModelReady, onPlaybackComplete: base!.onPlaybackComplete, onError: base!.onError })).toBe(false);
  });
});

describe('grace-period stage failure & companionMode context integration', () => {
  it('propagates grace-period stage errors to companionResources.fail when activeSlot is null', () => {
    const failResource = vi.fn();
    const onError = vi.fn();

    reportCompanionStageError(null, 'https://example.test/bear.glb', new Error('lost'), failResource);
    expect(failResource).toHaveBeenCalledWith('https://example.test/bear.glb');

    reportCompanionStageError({ onError }, 'https://example.test/bear.glb', new Error('lost'), failResource);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(failResource).toHaveBeenCalledTimes(1);
  });

  function renderWithStage(
    mode: CompanionMode,
    stageFailed: boolean,
    element: ReturnType<typeof createElement>,
  ) {
    return renderToStaticMarkup(
      createElement(
        CompanionStageContext.Provider,
        {
          value: {
            activeSlotId: null,
            stageFailed,
            companionMode: mode,
            upsertSlot: () => undefined,
            removeSlot: () => undefined,
          },
        },
        element,
      ),
    );
  }

  it('forces still fallback when stageFailed is true and hides or freezes per companionMode', () => {
    const config = {
      id: 'bear-v1' as const,
      modelUrl: '/bear.glb',
      animationName: 'celebrate' as const,
      durationMs: 1400 as const,
    };
    const resource = { status: 'ready' as const, modelUrl: '/bear.glb' };
    const state = { ...createGameState(), phase: 'awaiting-answer' as const };

    const failedHome = renderWithStage(
      'animated',
      true,
      createElement(HomeCompanion, { config, resource, stillUrl: '/still.png' }),
    );
    expect(failedHome).toContain('data-companion-representation="still"');
    expect(failedHome).toContain('src="/still.png"');

    const staticPrompt = renderWithStage(
      'static',
      false,
      createElement(PromptCompanion, { config, resource, reducedMotion: false, stillUrl: '/still.png', state }),
    );
    expect(staticPrompt).toContain('data-companion-representation="still"');
    expect(staticPrompt).toContain('src="/still.png"');

    expect(
      renderWithStage(
        'off',
        false,
        createElement(HomeCompanion, { config, resource, stillUrl: '/still.png' }),
      ),
    ).toBe('');
    expect(
      renderWithStage(
        'off',
        false,
        createElement(PromptCompanion, { config, resource, reducedMotion: false, stillUrl: '/still.png', state }),
      ),
    ).toBe('');
  });
});
