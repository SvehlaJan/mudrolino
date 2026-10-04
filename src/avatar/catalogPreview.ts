import type { ResolvedAvatarAssets } from './avatarAssetResolver';
import type { AvatarSlot } from './avatarTypes';

export interface CatalogPreviewEntry {
  id: string;
  label: string;
  kind: 'body' | 'head' | 'piece' | 'outfit' | 'study';
  status: string;
  modelUrl: string;
  garmentUrl?: string;
  slot?: AvatarSlot;
}
export interface CatalogPreviewManifest {
  entries: CatalogPreviewEntry[];
  animations: { walk: string; run: string };
}
export type CatalogAnimation = 'rest' | 'walk' | 'run';
export function resolveCatalogPreview(entry: CatalogPreviewEntry, animation: CatalogAnimation, clips: CatalogPreviewManifest['animations']): ResolvedAvatarAssets {
  const animationUrl = animation === 'rest' || entry.kind === 'head' ? undefined : clips[animation];
  const externalAssets = entry.garmentUrl && entry.slot ? [{ id: entry.id, slot: entry.slot, url: entry.garmentUrl, animationReady: true }] : [];
  return { baseUrl: entry.modelUrl, animationUrl, animationName: animationUrl ? animation : null, preserveHipsPosition: true,
    externalAssets, requiredUrls: [entry.modelUrl, ...(animationUrl ? [animationUrl] : []), ...externalAssets.map(a => a.url)], animationWarnings: [] };
}
