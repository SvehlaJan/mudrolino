import { AVATAR_STATE_VERSION, AVATAR_STORAGE_KEY } from './avatarConstants';
import {
  DEFAULT_AVATAR_SHOES,
  DEFAULT_AVATAR_TOP,
  isAvatarShoesItemId,
  isAvatarTopItemId,
} from './avatarCatalog';
import { AvatarAnimationName, AvatarBodyShapeConfig, StoredAvatarState } from './avatarTypes';

const DEFAULT_BODY_SHAPE: AvatarBodyShapeConfig = {
  scale: 1,
  build: 'average',
  height: 'average',
};

export function createDefaultAvatarState(): StoredAvatarState {
  return {
    version: AVATAR_STATE_VERSION,
    config: {
      baseVariant: 'male',
      animation: 'idle',
      slotSelections: {
        top: DEFAULT_AVATAR_TOP,
        shoes: DEFAULT_AVATAR_SHOES,
      },
      face: {
        mode: 'placeholder',
        assetUrl: null,
      },
      bodyShape: DEFAULT_BODY_SHAPE,
    },
    progress: {
      unlockedItemIds: [],
    },
  };
}

export const DEFAULT_AVATAR_STATE: StoredAvatarState = createDefaultAvatarState();

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function coerceAnimation(value: unknown): AvatarAnimationName {
  return value === 'success' ||
    value === 'failure' ||
    value === 'walk' ||
    value === 'run' ||
    value === 'idle'
    ? value
    : 'idle';
}

export function loadAvatarState(): StoredAvatarState {
  try {
    const raw = localStorage.getItem(AVATAR_STORAGE_KEY);
    if (!raw) return createDefaultAvatarState();

    const stored = JSON.parse(raw) as Record<string, unknown>;
    const config = stored.config as Record<string, unknown> | undefined;
    const progress = stored.progress as Record<string, unknown> | undefined;

    if (!config || !progress) return createDefaultAvatarState();

    const slotSelections = config.slotSelections as Record<string, unknown> | undefined;
    const face = config.face as Record<string, unknown> | undefined;
    const bodyShape = config.bodyShape as Record<string, unknown> | undefined;

    return {
      version: AVATAR_STATE_VERSION,
      config: {
        baseVariant: 'male',
        animation: coerceAnimation(config.animation),
        slotSelections: {
          top: isAvatarTopItemId(slotSelections?.top) ? slotSelections.top : DEFAULT_AVATAR_TOP,
          shoes: isAvatarShoesItemId(slotSelections?.shoes)
            ? slotSelections.shoes
            : DEFAULT_AVATAR_SHOES,
        },
        face: {
          mode: face?.mode === 'generated_decal' ? 'generated_decal' : 'placeholder',
          assetUrl: typeof face?.assetUrl === 'string' ? face.assetUrl : null,
        },
        bodyShape: {
          scale: typeof bodyShape?.scale === 'number' ? bodyShape.scale : DEFAULT_BODY_SHAPE.scale,
          build:
            bodyShape?.build === 'slim' || bodyShape?.build === 'sturdy'
              ? bodyShape.build
              : DEFAULT_BODY_SHAPE.build,
          height:
            bodyShape?.height === 'short' || bodyShape?.height === 'tall'
              ? bodyShape.height
              : DEFAULT_BODY_SHAPE.height,
        },
      },
      progress: {
        unlockedItemIds: isStringArray(progress.unlockedItemIds)
          ? [...progress.unlockedItemIds]
          : [],
      },
    };
  } catch {
    return createDefaultAvatarState();
  }
}

export function saveAvatarState(state: StoredAvatarState): void {
  try {
    localStorage.setItem(AVATAR_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Silent fail: private/incognito mode or storage quota exceeded.
  }
}
