import { AvatarBaseVariant, AvatarSlot, AvatarTopItemId } from './avatarTypes';

export interface AvatarCatalogItem {
  id: AvatarTopItemId;
  slot: AvatarSlot;
  label: string;
  meshName: string;
  compatibleBaseVariants: AvatarBaseVariant[];
}

export const DEFAULT_AVATAR_TOP: AvatarTopItemId = 'top_blue_tshirt';

export const AVATAR_TOP_ITEMS: AvatarCatalogItem[] = [
  {
    id: 'top_blue_tshirt',
    slot: 'top',
    label: 'Modré tričko',
    meshName: 'top_blue_tshirt',
    compatibleBaseVariants: ['male'],
  },
  {
    id: 'top_green_hoodie',
    slot: 'top',
    label: 'Zelená mikina',
    meshName: 'top_green_hoodie',
    compatibleBaseVariants: ['male'],
  },
];

export function isAvatarTopItemId(value: unknown): value is AvatarTopItemId {
  return AVATAR_TOP_ITEMS.some((item) => item.id === value);
}

export function getAvatarTopMeshName(itemId: AvatarTopItemId): string {
  return AVATAR_TOP_ITEMS.find((item) => item.id === itemId)?.meshName ?? DEFAULT_AVATAR_TOP;
}
