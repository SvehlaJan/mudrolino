import { getAvatarCatalogItem } from './avatarCatalog';
import {
  AVATAR_MODULAR_MALE_MODEL_URL,
  AVATAR_MODULAR_MALE_RUNNING_MODEL_URL,
  AVATAR_MODULAR_MALE_WALKING_MODEL_URL,
} from './avatarConstants';
import { AvatarAnimationName, AvatarConfig, AvatarSlot } from './avatarTypes';

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
  embeddedMeshNames: string[];
  externalAssets: AvatarExternalAsset[];
  requiredUrls: string[];
  animationWarnings: string[];
}

export function getAnimationSource(animation: AvatarAnimationName) {
  if (animation === 'walk') {
    return {
      animationUrl: AVATAR_MODULAR_MALE_WALKING_MODEL_URL,
      animationName: 'walk_test',
      preserveHipsPosition: true,
    };
  }

  if (animation === 'run') {
    return {
      animationUrl: AVATAR_MODULAR_MALE_RUNNING_MODEL_URL,
      animationName: 'run_test',
      preserveHipsPosition: true,
    };
  }

  return {
    animationUrl: undefined,
    animationName: animation,
    preserveHipsPosition: false,
  };
}

export function resolveAvatarAssets(config: AvatarConfig): ResolvedAvatarAssets {
  const selectedItems = [
    getAvatarCatalogItem(config.slotSelections.top),
    getAvatarCatalogItem(config.slotSelections.shoes),
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));

  const embeddedMeshNames = selectedItems.flatMap((item) =>
    item.source.kind === 'embeddedMesh' ? [item.source.meshName] : [],
  );

  const externalAssets = selectedItems.flatMap((item): AvatarExternalAsset[] =>
    item.source.kind === 'externalGltf'
      ? [
          {
            id: item.id,
            slot: item.slot,
            url: item.source.url,
            animationReady: item.source.animationReady,
            animationWarning: item.source.animationReady
              ? undefined
              : `${item.label} is enabled for animation debugging but is not production-ready.`,
          },
        ]
      : [],
  );

  const animation = getAnimationSource(config.animation);
  const animationWarnings =
    config.animation === 'idle'
      ? []
      : externalAssets.flatMap((asset) => asset.animationWarning ?? []);

  const requiredUrls = [
    AVATAR_MODULAR_MALE_MODEL_URL,
    ...(animation.animationUrl ? [animation.animationUrl] : []),
    ...externalAssets.map((asset) => asset.url),
  ];

  return {
    baseUrl: AVATAR_MODULAR_MALE_MODEL_URL,
    animationUrl: animation.animationUrl,
    animationName: animation.animationName,
    preserveHipsPosition: animation.preserveHipsPosition,
    embeddedMeshNames,
    externalAssets,
    requiredUrls,
    animationWarnings,
  };
}
