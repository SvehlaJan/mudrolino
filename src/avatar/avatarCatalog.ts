import {
  AvatarAccessoryItemId,
  AvatarBaseVariant,
  AvatarShoesItemId,
  AvatarSlot,
  AvatarTopItemId,
} from './avatarTypes';

export type AvatarCatalogItemId = AvatarTopItemId | AvatarShoesItemId | AvatarAccessoryItemId;

interface AvatarCatalogItemBase<TId extends AvatarCatalogItemId, TSlot extends AvatarSlot> {
  id: TId;
  slot: TSlot;
  label: string;
  swatchClassName?: string;
  compatibleBaseVariants: AvatarBaseVariant[];
}

export type AvatarTopCatalogItem = AvatarCatalogItemBase<AvatarTopItemId, 'top'> & {
  source: { kind: 'none' };
};

export type AvatarShoesCatalogItem = AvatarCatalogItemBase<AvatarShoesItemId, 'shoes'> & {
  source:
    | { kind: 'externalGltf'; url: string; animationReady: boolean }
    | { kind: 'none' };
};

export type AvatarAccessoryCatalogItem = AvatarCatalogItemBase<AvatarAccessoryItemId, 'accessory'> & {
  source:
    | { kind: 'externalGltf'; url: string; animationReady: boolean }
    | { kind: 'none' };
};

export type AvatarCatalogItem = AvatarTopCatalogItem | AvatarShoesCatalogItem | AvatarAccessoryCatalogItem;

export const DEFAULT_AVATAR_TOP: AvatarTopItemId = 'top_none';
export const DEFAULT_AVATAR_SHOES: AvatarShoesItemId = 'shoes_none';
export const DEFAULT_AVATAR_ACCESSORY: AvatarAccessoryItemId = 'accessory_none';

export const AVATAR_TOP_ITEMS: AvatarTopCatalogItem[] = [
  {
    id: 'top_none',
    slot: 'top',
    label: 'No top',
    compatibleBaseVariants: ['male'],
    source: { kind: 'none' },
  },
];

export const AVATAR_SHOES_ITEMS: AvatarShoesCatalogItem[] = [
  {
    id: 'shoes_none',
    slot: 'shoes',
    label: 'Bare feet',
    compatibleBaseVariants: ['male'],
    source: { kind: 'none' },
  },
  {
    id: 'shoes_blue_sneakers_v1',
    slot: 'shoes',
    label: 'Blue sneakers',
    swatchClassName: 'bg-accent-blue',
    compatibleBaseVariants: ['male'],
    source: {
      kind: 'externalGltf',
      url: '/avatar/garments/shoes_blue_sneakers_v1.glb',
      animationReady: false,
    },
  },
];

export const AVATAR_ACCESSORY_ITEMS: AvatarAccessoryCatalogItem[] = [
  {
    id: 'accessory_none',
    slot: 'accessory',
    label: 'No accessory',
    compatibleBaseVariants: ['male'],
    source: { kind: 'none' },
  },
  {
    id: 'hat_red_cap_v1',
    slot: 'accessory',
    label: 'Red cap',
    swatchClassName: 'bg-error',
    compatibleBaseVariants: ['male'],
    source: {
      kind: 'externalGltf',
      url: '/avatar/garments/hat_red_cap_v1.glb',
      animationReady: true,
    },
  },
];

export function isAvatarTopItemId(value: unknown): value is AvatarTopItemId {
  return AVATAR_TOP_ITEMS.some((item) => item.id === value);
}

export function isAvatarShoesItemId(value: unknown): value is AvatarShoesItemId {
  return AVATAR_SHOES_ITEMS.some((item) => item.id === value);
}

export function isAvatarAccessoryItemId(value: unknown): value is AvatarAccessoryItemId {
  return AVATAR_ACCESSORY_ITEMS.some((item) => item.id === value);
}

export function getAvatarCatalogItem(id: AvatarCatalogItemId): AvatarCatalogItem | undefined {
  return [...AVATAR_TOP_ITEMS, ...AVATAR_SHOES_ITEMS, ...AVATAR_ACCESSORY_ITEMS].find(
    (item) => item.id === id,
  );
}
