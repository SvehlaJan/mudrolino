import { AVATAR_STATE_VERSION, AVATAR_STORAGE_KEY } from './avatarConstants';
import { StoredAvatarState } from './avatarTypes';

export function createDefaultAvatarState(): StoredAvatarState {
  return {
    version: AVATAR_STATE_VERSION,
    config: {
      modelId: 'base',
      outfitId: 'default',
      animation: 'idle',
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

export function loadAvatarState(): StoredAvatarState {
  try {
    const raw = localStorage.getItem(AVATAR_STORAGE_KEY);
    if (!raw) return createDefaultAvatarState();

    const stored = JSON.parse(raw) as Record<string, unknown>;
    const config = stored.config as Record<string, unknown> | undefined;
    const progress = stored.progress as Record<string, unknown> | undefined;

    if (stored.version !== AVATAR_STATE_VERSION || !config || !progress) {
      return createDefaultAvatarState();
    }

    return {
      version: AVATAR_STATE_VERSION,
      config: {
        modelId: config.modelId === 'base' ? 'base' : DEFAULT_AVATAR_STATE.config.modelId,
        outfitId: config.outfitId === 'default' ? 'default' : DEFAULT_AVATAR_STATE.config.outfitId,
        animation: config.animation === 'idle' ? 'idle' : DEFAULT_AVATAR_STATE.config.animation,
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
