import {
  AvatarBaseVariant,
  AvatarShoesItemId,
  AvatarSlot,
  AvatarTopItemId,
} from './avatarTypes';

export type AvatarCatalogItemId = AvatarTopItemId | AvatarShoesItemId;

interface AvatarCatalogItemBase<TId extends AvatarCatalogItemId, TSlot extends AvatarSlot> {
  id: TId;
  slot: TSlot;
  label: string;
  swatchClassName?: string;
  compatibleBaseVariants: AvatarBaseVariant[];
}

export type AvatarTopCatalogItem = AvatarCatalogItemBase<AvatarTopItemId, 'top'> & {
  source: { kind: 'embeddedMesh'; meshName: string };
};

export type AvatarShoesCatalogItem = AvatarCatalogItemBase<AvatarShoesItemId, 'shoes'> & {
  source:
    | { kind: 'externalGltf'; url: string; animationReady: boolean }
    | { kind: 'none' };
};

export type AvatarCatalogItem = AvatarTopCatalogItem | AvatarShoesCatalogItem;

export const DEFAULT_AVATAR_TOP: AvatarTopItemId = 'top_blue_tshirt';
export const DEFAULT_AVATAR_SHOES: AvatarShoesItemId = 'shoes_none';

export const AVATAR_TOP_ITEMS: AvatarTopCatalogItem[] = [
  {
    id: 'top_blue_tshirt',
    slot: 'top',
    label: 'Modré tričko',
    swatchClassName: 'bg-accent-blue',
    compatibleBaseVariants: ['male'],
    source: { kind: 'embeddedMesh', meshName: 'top_blue_tshirt' },
  },
  {
    id: 'top_green_hoodie',
    slot: 'top',
    label: 'Zelená mikina',
    swatchClassName: 'bg-success',
    compatibleBaseVariants: ['male'],
    source: { kind: 'embeddedMesh', meshName: 'top_green_hoodie' },
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

export function isAvatarTopItemId(value: unknown): value is AvatarTopItemId {
  return AVATAR_TOP_ITEMS.some((item) => item.id === value);
}

export function isAvatarShoesItemId(value: unknown): value is AvatarShoesItemId {
  return AVATAR_SHOES_ITEMS.some((item) => item.id === value);
}

export function getAvatarCatalogItem(id: AvatarCatalogItemId): AvatarCatalogItem | undefined {
  return [...AVATAR_TOP_ITEMS, ...AVATAR_SHOES_ITEMS].find((item) => item.id === id);
}

export function getAvatarTopMeshName(itemId: AvatarTopItemId): string {
  const source = getAvatarCatalogItem(itemId)?.source;
  return source?.kind === 'embeddedMesh' ? source.meshName : DEFAULT_AVATAR_TOP;
}
