import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { CatalogItem, CatalogItemRevision, CatalogLibraryAsset, CatalogReference, CatalogSource } from '../../src/avatar/catalogLibrary';

export const catalogIndexPath = 'assets/avatar/catalog/catalog.json';
/**
 * Explicit on-disk schema (v1): {schemaVersion:1, items:CatalogItem[]}.
 * References replace url/thumbnailUrl with path, optional sourcePath/sourceSha256,
 * exact prompt and crop:{left,top,width,height}. Revisions replace asset with
 * assetId; optional renderKind:study selects whole-model framing independently
 * of gaitCompatible, which enables only source-proven playback (or disables it).
 * Identity, variant base, currentRevisionId and both review statuses
 * are explicit: no filename classification or inferred art approval occurs.
 * Both original/crop hashes and PNG bounds are checked before hydration.
 * Crop hashes/prompts are preserved in JSON by crop_catalog_references.mjs.
 */
export function hydrateCatalogIndex(value: unknown, assets: CatalogLibraryAsset[], safeFile: (relative: string) => string | null, fileUrl: (relative: string) => string, thumbnailUrl: (relative: string) => string, sources: (paths: string[]) => CatalogSource[]): CatalogItem[] {
  const fail = (message: string): never => { throw new Error(`Invalid avatar metadata ${catalogIndexPath}: ${message}`); };
  const object = (v: unknown, at: string): Record<string, unknown> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : fail(`${at} requires an object`);
  const text = (v: unknown, at: string): string => typeof v === 'string' && v.trim() ? v : fail(`${at} requires a non-empty string`);
  const array = (v: unknown, at: string): unknown[] => Array.isArray(v) ? v : fail(`${at} requires an array`);
  const choice = <T extends string>(v: unknown, choices: readonly T[], at: string): T => typeof v === 'string' && choices.includes(v as T) ? v as T : fail(`${at} must be ${choices.join('|')}`);
  const unique = (ids: string[], at: string) => { if (new Set(ids).size !== ids.length) fail(`duplicate ${at}`); };
  const image = (v: unknown, at: string) => {
    const relative = text(v, at);
    if (!/^assets\/avatar\/(concepts|catalog)\/.+\.(png|jpe?g|webp)$/i.test(relative) || !safeFile(relative)) fail(`${at} is missing or unsafe: ${relative}`);
    return relative;
  };
  const imageBytes = new Map<string, Buffer>();
  const bytesFor = (relative: string) => { if (!imageBytes.has(relative)) imageBytes.set(relative, readFileSync(safeFile(relative)!)); return imageBytes.get(relative)!; };
  const checksum = (relative: string) => createHash('sha256').update(bytesFor(relative)).digest('hex');
  const references = (v: unknown, at: string): CatalogReference[] => {
    const refs = array(v, at).map((r, i) => {
      const p = `${at}[${i}]`; const ref = object(r, p); const relative = image(ref.path, `${p}.path`);
      let provenance: CatalogReference['provenance'];
      if (ref.sourcePath !== undefined) {
        const sourcePath = image(ref.sourcePath, `${p}.sourcePath`);
        let crop: NonNullable<CatalogReference['provenance']>['crop'];
        if (ref.crop !== undefined) {
          const coords = object(ref.crop, `${p}.crop`);
          for (const key of ['left', 'top', 'width', 'height']) if (!Number.isSafeInteger(coords[key]) || Number(coords[key]) < (key === 'left' || key === 'top' ? 0 : 1)) fail(`${p}.crop.${key} is invalid`);
          crop = { left: Number(coords.left), top: Number(coords.top), width: Number(coords.width), height: Number(coords.height) };
          if (!/^[a-f0-9]{64}$/i.test(text(ref.sourceSha256, `${p}.sourceSha256`))) fail(`${p}.sourceSha256 must be SHA-256`); text(ref.prompt, `${p}.prompt`);
          if (checksum(sourcePath) !== ref.sourceSha256) fail(`${p}.original source hash changed`);
          if (!/^[a-f0-9]{64}$/i.test(text(ref.cropSha256, `${p}.cropSha256`)) || checksum(relative) !== ref.cropSha256) fail(`${p}.crop source hash changed`);
          const bytes = bytesFor(sourcePath);
          if (bytes.length < 24 || bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') fail(`${p}.crop requires an original PNG source`);
          if (crop.left + crop.width > bytes.readUInt32BE(16) || crop.top + crop.height > bytes.readUInt32BE(20)) fail(`${p}.crop bounds exceed original source dimensions`);
        }
        provenance = { sourcePath, sourceUrl: fileUrl(sourcePath), ...(crop ? { crop } : {}) };
      } else if (ref.crop !== undefined) fail(`${p}.crop requires sourcePath`);
      return { id: text(ref.id, `${p}.id`), label: text(ref.label, `${p}.label`), url: fileUrl(relative), thumbnailUrl: thumbnailUrl(relative), ...(ref.prompt === undefined ? {} : { prompt: text(ref.prompt, `${p}.prompt`) }), ...(provenance ? { provenance } : {}) };
    });
    unique(refs.map(r => r.id), at); return refs;
  };
  const data = object(value, 'index'); if (data.schemaVersion !== 1) fail('schemaVersion must be 1');
  const items = array(data.items, 'items').map((v, i): CatalogItem => {
    const at = `items[${i}]`; const item = object(v, at);
    const variants = array(item.variants, `${at}.variants`).map((v, j) => {
      const p = `${at}.variants[${j}]`; const variant = object(v, p);
      const refs = references(variant.references, `${p}.references`);
      const revisions = array(variant.revisions, `${p}.revisions`).map((v, k): CatalogItemRevision => {
        const q = `${p}.revisions[${k}]`; const revision = object(v, q); const assetId = text(revision.assetId, `${q}.assetId`);
        const rawAsset = assets.find(asset => asset.id === assetId); if (!rawAsset) fail(`${q}.assetId missing explicit asset link: ${assetId}`);
        const visualReview = choice(revision.visualReview, ['pending', 'changes-requested', 'approved'] as const, `${q}.visualReview`);
        const technicalReview = choice(revision.technicalReview, ['not-verified', 'recorded-pass', 'repair-needed'] as const, `${q}.technicalReview`);
        const reviewNote = revision.reviewNote === undefined ? undefined : text(revision.reviewNote, `${q}.reviewNote`);
        const technicalNote = revision.technicalNote === undefined ? undefined : text(revision.technicalNote, `${q}.technicalNote`);
        if (technicalReview === 'recorded-pass' && !technicalNote) fail(`${q}.recorded-pass requires a source-bound technicalNote`);
        if (revision.gaitCompatible !== undefined && typeof revision.gaitCompatible !== 'boolean') fail(`${q}.gaitCompatible must be boolean`);
        if (revision.renderKind !== undefined && revision.renderKind !== 'study') fail(`${q}.renderKind must be study`);
        if (revision.gaitCompatible && (!rawAsset!.model || technicalReview !== 'recorded-pass')) fail(`${q}.playback override requires a model and recorded source-bound technical proof`);
        if (revision.renderKind && !rawAsset!.model) fail(`${q}.renderKind requires a model`);
        const sourcePaths = revision.sourcePaths === undefined ? [] : array(revision.sourcePaths, `${q}.sourcePaths`).map(v => text(v, `${q}.sourcePaths`));
        const extraSources = sources(sourcePaths);
        if (sourcePaths.some(relative => !extraSources.some(source => source.path === relative))) fail(`${q}.sourcePaths contains a missing or unsafe source`);
        const revisionSources = [...new Map([...rawAsset!.sources, ...extraSources, { path: catalogIndexPath, label: 'Curated catalog metadata', role: 'metadata' as const, url: fileUrl(catalogIndexPath) }].map(source => [source.path, source])).values()];
        const asset = { ...rawAsset!, ...(revision.id === variant.currentRevisionId ? { history: false } : {}), ...(revision.gaitCompatible !== undefined ? { supportsGait: revision.gaitCompatible === true } : {}), ...(revision.renderKind ? { model: { ...rawAsset!.model!, kind: 'study' as const } } : {}), references: [...rawAsset!.references], sources: revisionSources };
        return { id: text(revision.id, `${q}.id`), label: text(revision.label, `${q}.label`), asset, visualReview, technicalReview, ...(reviewNote ? { reviewNote } : {}), ...(technicalNote ? { technicalNote } : {}) };
      });
      unique(revisions.map(r => r.id), `${p}.revisions`);
      const currentRevisionId = variant.currentRevisionId === undefined ? undefined : text(variant.currentRevisionId, `${p}.currentRevisionId`);
      if (currentRevisionId && !revisions.some(r => r.id === currentRevisionId)) fail(`${p}.currentRevisionId does not match a revision`);
      return { id: text(variant.id, `${p}.id`), label: text(variant.label, `${p}.label`), base: choice(variant.base, ['male', 'female', 'shared', 'unspecified'] as const, `${p}.base`), references: refs, revisions, ...(currentRevisionId ? { currentRevisionId } : {}) };
    });
    unique(variants.map(v => v.id), `${at}.variants`);
    const relatedIds = array(item.relatedIds, `${at}.relatedIds`).map(v => text(v, `${at}.relatedIds`)); unique(relatedIds, `${at}.relatedIds`);
    let motion: CatalogItem['motion'];
    if (item.motion !== undefined) { const m = object(item.motion, `${at}.motion`); if (typeof m.loop !== 'boolean') fail(`${at}.motion.loop must be boolean`); motion = { clip: choice(m.clip, ['walk', 'run'] as const, `${at}.motion.clip`), description: text(m.description, `${at}.motion.description`), loop: m.loop as boolean }; }
    return { id: text(item.id, `${at}.id`), label: text(item.label, `${at}.label`), collection: choice(item.collection, ['characters', 'wardrobe', 'faces-hair', 'animations'] as const, `${at}.collection`), category: choice(item.category, ['characters', 'tops', 'bottoms', 'footwear', 'accessories', 'outfits', 'studies', 'animations', 'references'] as const, `${at}.category`), description: text(item.description, `${at}.description`), references: references(item.references, `${at}.references`), variants, relatedIds, ...(motion ? { motion } : {}) };
  });
  unique(items.map(i => i.id), 'item IDs');
  const itemIds = new Set(items.map(i => i.id)); for (const item of items) for (const related of item.relatedIds) if (!itemIds.has(related)) fail(`${item.id}.relatedIds contains missing item ${related}`);
  return items;
}

export function catalogItemReferences(items: CatalogItem[]): CatalogReference[] {
  return items.flatMap(item => [...item.references, ...item.variants.flatMap(variant => [...variant.references, ...variant.revisions.flatMap(revision => revision.asset.references)])]);
}
export function catalogItemAssets(items: CatalogItem[]): CatalogLibraryAsset[] {
  return items.flatMap(item => item.variants.flatMap(variant => variant.revisions.map(revision => revision.asset)));
}
