import { AVATAR_STATE_VERSION } from './avatarConstants';

export type AvatarAnimationName = 'idle';

export interface AvatarConfig {
  modelId: 'base';
  outfitId: 'default';
  animation: AvatarAnimationName;
}

export interface AvatarProgressState {
  unlockedItemIds: string[];
}

export interface StoredAvatarState {
  version: typeof AVATAR_STATE_VERSION;
  config: AvatarConfig;
  progress: AvatarProgressState;
}
