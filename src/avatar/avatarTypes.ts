export type AvatarSlot = 'top' | 'bottom' | 'shoes' | 'hair' | 'accessory';

export interface AvatarExternalAsset {
  id: string;
  slot: AvatarSlot;
  url: string;
  animationReady: boolean;
  animationWarning?: string;
}

export interface ResolvedAvatarAssets {
  baseUrl: string;
  animationUrl?: string;
  animationName: string | null;
  preserveHipsPosition: boolean;
  externalAssets: AvatarExternalAsset[];
  requiredUrls: string[];
  animationWarnings: string[];
}

export interface AvatarBodyShapeConfig {
  scale: number;
  build: 'average' | 'slim' | 'sturdy';
  height: 'average' | 'short' | 'tall';
}

export interface AvatarGarmentFit {
  targetBone: string;
  boneWorld: { x: number; y: number; z: number };
  meshCenter: { x: number; y: number; z: number };
  meshBounds: { zMin: number; zMax: number };
}

export interface AvatarSceneData {
  bones: Record<string, { x: number; y: number; z: number }>;
  garments: Record<string, AvatarGarmentFit>;
}

export interface AvatarInspectionControls {
  paused: boolean;
  progress?: number;
  view: 'front' | 'side' | 'back' | 'three-quarter';
}
