import { AVATAR_STATE_VERSION } from './avatarConstants';

export type AvatarBaseVariant = 'male';
export type AvatarSlot = 'top' | 'bottom' | 'shoes' | 'hair' | 'accessory';
export type AvatarAnimationName = 'idle' | 'walk' | 'run' | 'success' | 'failure';
export type AvatarTopItemId = 'top_blue_tshirt' | 'top_green_hoodie';
export type AvatarShoesItemId = 'shoes_none' | 'shoes_blue_sneakers_v1';

export interface AvatarSlotSelections {
  top: AvatarTopItemId;
  shoes: AvatarShoesItemId;
}

export interface AvatarFaceConfig {
  mode: 'placeholder' | 'generated_decal';
  assetUrl: string | null;
}

export interface AvatarBodyShapeConfig {
  scale: number;
  build: 'average' | 'slim' | 'sturdy';
  height: 'average' | 'short' | 'tall';
}

export interface AvatarConfig {
  baseVariant: AvatarBaseVariant;
  animation: AvatarAnimationName;
  slotSelections: AvatarSlotSelections;
  face: AvatarFaceConfig;
  bodyShape: AvatarBodyShapeConfig;
}

export interface AvatarProgressState {
  unlockedItemIds: string[];
}

export interface StoredAvatarState {
  version: typeof AVATAR_STATE_VERSION;
  config: AvatarConfig;
  progress: AvatarProgressState;
}
