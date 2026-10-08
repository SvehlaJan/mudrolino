import { describe, expect, it } from 'vitest';
import { buildCatalogLibraryManifest, resolveCatalogLibraryFile, resolveCatalogLibraryThumbnail } from './catalogLibraryServer';

describe('saved curated avatar catalog', () => {
  it('makes the rolled-cuff B04 current and keeps the rejected repairs as history without gait', () => {
    const manifest = buildCatalogLibraryManifest(process.cwd());
    const male = manifest.items!.find(item => item.id === 'B04')!.variants.find(variant => variant.base === 'male')!;
    // 2026-10-08: the rolled-cuff repair passes every gate B01 passes; see the detail/shell audit.
    expect(male.currentRevisionId).toBe('rolled-cuff-v1');
    expect(male.revisions.find(candidate => candidate.id === 'rolled-cuff-v1')).toMatchObject({ technicalReview: 'recorded-pass' });
    for (const id of ['side-keys-repair', 'detail-offset-1', 'detail-offset-2']) {
      const revision = male.revisions.find(candidate => candidate.id === id);
      expect(revision).toBeDefined();
      expect(revision).toMatchObject({ visualReview: 'pending', technicalReview: 'repair-needed', asset: { accepted: false, supportsGait: false } });
      expect(revision!.asset.sources.some(source => source.path.endsWith('/gate-report.json'))).toBe(true);
      expect(revision!.asset.sources.some(source => source.path.endsWith('/detail-own-shell-report.json'))).toBe(true);
      for (const source of revision!.asset.sources) expect(resolveCatalogLibraryFile(process.cwd(), source.url, manifest)).not.toBeNull();
    }
  });
  it('covers each logical design once, with exact recipes and honest per-base current source links', () => {
    const manifest = buildCatalogLibraryManifest(process.cwd()); const items = manifest.items!;
    expect(items).toHaveLength(43);
    expect(Object.fromEntries(['characters', 'wardrobe', 'faces-hair', 'animations'].map(collection => [collection, items.filter(item => item.collection === collection).length]))).toEqual({ characters: 9, wardrobe: 20, 'faces-hair': 12, animations: 2 }); expect(new Set(items.map(item => item.id)).size).toBe(43);
    for (const item of items) {
      for (const variant of item.variants) {
        const current = variant.revisions.find(revision => revision.id === variant.currentRevisionId);
        if (current) expect(current.asset.history).toBe(false);
        for (const revision of variant.revisions) {
          expect(manifest.assets.some(asset => asset.id === revision.asset.id)).toBe(true);
          expect(new Set(revision.asset.sources.map(source => source.path)).size).toBe(revision.asset.sources.length);
          expect(revision.visualReview).not.toBe('approved');
          if (revision.technicalReview === 'recorded-pass') expect(revision.technicalNote).toBeTruthy();
        }
      }
      for (const reference of [...item.references, ...item.variants.flatMap(variant => variant.references)]) {
        expect(resolveCatalogLibraryThumbnail(process.cwd(), reference.thumbnailUrl, manifest)).not.toBeNull();
        if (reference.provenance) expect(resolveCatalogLibraryFile(process.cwd(), reference.provenance.sourceUrl, manifest)).not.toBeNull();
      }
    }
    const hoodie = items.find(item => item.id === 'T02')!.variants.find(variant => variant.base === 'female')!;
    // The fuller hood on the +30% head is current; the rejected shallow hood stays as history.
    expect(hoodie.currentRevisionId).toBe('hood-v2');
    expect(hoodie.revisions.find(revision => revision.id === 'current')).toMatchObject({ visualReview: 'changes-requested', technicalReview: 'recorded-pass', asset: { id: 'file:assets/avatar/catalog-a/female/outfits/studies/T02-B01-F01/pieces/T02/outfit.glb', supportsGait: true } });
    expect(items.find(item => item.id === 'O02')!.relatedIds).toEqual(['T02', 'B02', 'F02']);
    // O02 is the exact recipe on the +30% head on both bases.
    const o02 = items.find(item => item.id === 'O02')!;
    expect(o02.variants.find(variant => variant.base === 'male')!.currentRevisionId).toBe('head130');
    expect(o02.variants.find(variant => variant.base === 'female')!.revisions[0]).toMatchObject({ id: 'head130', technicalReview: 'recorded-pass' });
    // The +30% head O01 is current on both bases; the older male assembly stays as history.
    const o01 = items.find(item => item.id === 'O01')!;
    for (const variant of o01.variants) expect(variant.currentRevisionId).toBe('head130');
    expect(o01.variants.find(variant => variant.base === 'male')!.revisions.map(revision => revision.asset.id)).toContain('outfit-T01-B01-F01');
    expect(items.find(item => item.id === 'capsule-T02-B01-F01')!.relatedIds).toEqual(expect.arrayContaining(['T02', 'B01', 'F01']));
    for (const clip of ['walk', 'run']) {
      const motion = items.find(item => item.id === clip)!; expect(motion.motion).toMatchObject({ clip, loop: true });
      expect(motion.variants.map(variant => variant.base)).toEqual(['male', 'female']);
      expect(motion.variants.every(variant => variant.revisions[0].asset.supportsGait)).toBe(true);
    }
  });
});
