import { describe, expect, it, vi } from 'vitest';
import {
  COMPANION_STAGE_PRIORITY,
  selectActiveCompanionSlot,
  type CompanionStageSlotRequest,
} from './companionStage';

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
});
