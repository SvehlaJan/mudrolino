import type { CatalogPreviewEntry, CatalogPreviewManifest } from './catalogPreview';

export type CatalogCategory = 'characters' | 'tops' | 'bottoms' | 'footwear' | 'accessories' | 'outfits' | 'studies' | 'animations' | 'references';
export type CatalogBase = 'male' | 'female' | 'shared' | 'unspecified';
export type CatalogStage = 'reference' | 'pending' | 'candidate' | 'fit-verified' | 'repair-needed' | 'accepted' | 'runtime';
export interface CatalogReference {
  id: string;
  label: string;
  url: string;
  thumbnailUrl: string;
  prompt?: string;
  provenance?: { sourcePath: string; sourceUrl: string; crop?: { left: number; top: number; width: number; height: number } };
}
export interface CatalogSource {
  label: string;
  path: string;
  url: string;
  role: 'model' | 'blend' | 'script' | 'report' | 'metadata';
}
export interface CatalogLibraryAsset {
  id: string;
  label: string;
  category: CatalogCategory;
  base: CatalogBase;
  status: CatalogStage;
  statusDetail: string;
  fitVerified: boolean;
  accepted: boolean;
  history: boolean;
  previewUrl?: string;
  references: CatalogReference[];
  sources: CatalogSource[];
  model?: CatalogPreviewEntry;
  supportsGait?: boolean;
  animation?: 'walk' | 'run';
}
export type CatalogCollection = 'characters' | 'wardrobe' | 'faces-hair' | 'animations';
export interface CatalogItemRevision {
  id: string;
  label: string;
  asset: CatalogLibraryAsset;
  visualReview: 'pending' | 'changes-requested' | 'approved';
  technicalReview: 'not-verified' | 'recorded-pass' | 'repair-needed';
  reviewNote?: string;
  technicalNote?: string;
}
export interface CatalogItemVariant {
  id: string;
  label: string;
  base: CatalogBase;
  references: CatalogReference[];
  revisions: CatalogItemRevision[];
  currentRevisionId?: string;
}
export interface CatalogItem {
  id: string;
  label: string;
  collection: CatalogCollection;
  category: CatalogCategory;
  description: string;
  references: CatalogReference[];
  variants: CatalogItemVariant[];
  relatedIds: string[];
  motion?: { clip: 'walk' | 'run'; description: string; loop: boolean };
}
export interface CatalogLibraryManifest {
  version: string;
  generatedAt: string;
  assets: CatalogLibraryAsset[];
  items?: CatalogItem[];
  animations: CatalogPreviewManifest['animations'];
}
export interface CatalogLibraryFilters {
  query?: string;
  category?: string;
  base?: string;
  format?: string;
  status?: string;
  history?: boolean;
}

/** Match independent filters together; history is opt-in and fit is not acceptance. */
export function filterCatalogAssets(assets: CatalogLibraryAsset[], filters: CatalogLibraryFilters): CatalogLibraryAsset[] {
  const query = filters.query?.trim().toLocaleLowerCase() ?? '';
  return assets.filter(asset => {
    if (asset.history && !filters.history) return false;
    if (filters.category && asset.category !== filters.category) return false;
    if (filters.base && asset.base !== filters.base) return false;
    if (filters.status && asset.status !== filters.status) return false;
    if (filters.format === '2d' && asset.references.length === 0) return false;
    if (filters.format === '3d' && !asset.model) return false;
    return !query || [asset.id, asset.label, ...asset.sources.map(source => source.path), ...asset.references.map(reference => reference.label)]
      .some(value => value.toLocaleLowerCase().includes(query));
  });
}
