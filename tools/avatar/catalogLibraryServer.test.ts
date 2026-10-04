import { mkdtempSync, mkdirSync, writeFileSync, rmSync, realpathSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { buildCatalogLibraryManifest, resolveCatalogLibraryFile, resolveCatalogLibraryThumbnail } from './catalogLibraryServer';
const roots: string[] = [];
function fixture() {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'catalog-library-'))); roots.push(root);
  const file = (relative: string, value = 'fixture') => { const p = join(root, relative); mkdirSync(join(p, '..'), { recursive: true }); writeFileSync(p, value); };
  file('assets/avatar/catalog-a/catalog-progress.json', JSON.stringify({ pieces: [{ id: 'T02', stage: 'fit-verified candidate' }, { id: 'F02', stage: 'previous fit evidence; repair required' }, { id: 'A02', stage: 'not started' }], accepted_ids: [], fit_verified_ids: ['T02', 'F02'], female_phase: { stage: 'female reference only; fitted 3D pending', wardrobe_ids: ['T02'] } }));
  file('assets/avatar/catalog-a/T02/T02.glb'); file('assets/avatar/catalog-a/T02/body-T02.glb'); file('assets/avatar/catalog-a/T02/T02.blend'); file('assets/avatar/catalog-a/T02/retrospective.md');
  file('assets/avatar/catalog-a/F02/F02.glb'); file('assets/avatar/catalog-a/F02/body-F02.glb');
  file('assets/avatar/concepts/catalog-a/prompts-and-manifest.json', JSON.stringify({ boards: [{ title: 'Hoodie construction', items: ['T02 Orange hoodie'], file: 'hoodie.png', prompt: 'T02 worn hoodie' }] }));
  file('assets/avatar/concepts/catalog-a/hoodie.png');
  file('assets/avatar/concepts/catalog-a-female/prompts-and-manifest.json', JSON.stringify({ base: { output: 'woman.png', prompt: 'T02 female reference' }, sheets: [{ file: 'female-hoodie.png', prompt: 'T02 female hoodie' }], outputs: [{ file: 'woman.png' }, { file: 'female-hoodie.png' }] }));
  file('assets/avatar/concepts/catalog-a-female/woman.png'); file('assets/avatar/concepts/catalog-a-female/female-hoodie.png'); file('assets/avatar/concepts/catalog-a-female/drafts/earlier.png');
  file('assets/avatar/catalog-a/T02/revisions/old.glb'); file('public/avatar/modular/male-base.glb'); file('tools/blender/catalog/build_catalog_t02.py');
  return { root, file };
}
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });
describe('live avatar library', () => {
  it('keeps pending and separate fit/acceptance facts with repair precedence', () => {
    const { root } = fixture(); const assets = buildCatalogLibraryManifest(root).assets;
    expect(assets.find(a => a.id === 'A02')?.status).toBe('pending');
    expect(assets.find(a => a.id === 'T02')).toMatchObject({ status: 'fit-verified', accepted: false, fitVerified: true, history: false });
    expect(assets.find(a => a.id === 'F02')).toMatchObject({ status: 'repair-needed', fitVerified: false });
  });
  it('associates real references, prompts and sources and keeps female milestones honest', () => {
    const { root } = fixture(); const assets = buildCatalogLibraryManifest(root).assets;
    const top = assets.find(a => a.id === 'T02')!;
    expect(top.references).toHaveLength(1); expect(top.references[0].prompt).toBe('T02 worn hoodie');
    expect(top.sources.map(s => s.role)).toEqual(expect.arrayContaining(['blend', 'script', 'report', 'model', 'metadata']));
    expect(assets.find(a => a.id === 'female-T02')).toMatchObject({ base: 'female', status: 'pending', accepted: false });
    expect(assets.find(a => a.id === 'female-T02')?.references).toHaveLength(2);
    expect(assets.filter(a => a.category === 'references' && a.base === 'female')).toHaveLength(3);
  });
  it('discovers GLBs, drafts and additions under stable file identities and changes revisions', () => {
    const { root, file } = fixture(); const before = buildCatalogLibraryManifest(root);
    expect(before.assets.find(a => a.id.endsWith('revisions/old.glb'))?.history).toBe(true);
    expect(before.assets.find(a => a.id.endsWith('drafts/earlier.png'))?.history).toBe(true);
    expect(before.assets.find(a => a.id.endsWith('public/avatar/modular/male-base.glb'))).toMatchObject({ status: 'runtime', supportsGait: false });
    expect(buildCatalogLibraryManifest(root).version).toBe(before.version);
    file('assets/avatar/concepts/new-reference.png');
    expect(buildCatalogLibraryManifest(root).version).not.toBe(before.version);
    expect(buildCatalogLibraryManifest(root).assets.some(a => a.id.endsWith('concepts/new-reference.png'))).toBe(true);
  });
  it('serves only inventory sources and reference thumbnails and rejects secrets/traversal/symlinks', () => {
    const { root, file } = fixture(); const manifest = buildCatalogLibraryManifest(root); const top = manifest.assets.find(a => a.id === 'T02')!;
    for (const source of top.sources) expect(resolveCatalogLibraryFile(root, source.url)).toBe(join(root, source.path));
    expect(resolveCatalogLibraryThumbnail(root, top.references[0].thumbnailUrl)).toBe(join(root, 'assets/avatar/concepts/catalog-a/hoodie.png'));
    for (const url of ['/__avatar_catalog/files/.env', '/__avatar_catalog/files/assets/avatar/../../../.env', '/__avatar_catalog/files/assets/avatar/catalog-a/secret.json']) expect(resolveCatalogLibraryFile(root, url)).toBeNull();
    file('outside.png'); rmSync(join(root, 'assets/avatar/concepts/catalog-a/hoodie.png')); symlinkSync(join(root, 'outside.png'), join(root, 'assets/avatar/concepts/catalog-a/hoodie.png'));
    expect(resolveCatalogLibraryFile(root, top.references[0].url)).toBeNull();
    expect(resolveCatalogLibraryThumbnail(root, top.references[0].thumbnailUrl)).toBeNull();
  });
  it('keeps newly discovered female canonical models visible and uses real model review thumbnails', () => {
    const { root, file } = fixture();
    file('assets/avatar/catalog-female/T02/T02.glb');
    file('assets/avatar/catalog-a/T02/rest-front-review.png');
    const manifest = buildCatalogLibraryManifest(root);
    const discovered = manifest.assets.find(a => a.id.endsWith('catalog-female/T02/T02.glb'))!;
    expect(discovered).toMatchObject({ history: false, base: 'female', status: 'candidate' });
    expect(discovered.statusDetail).toBe('Discovered export; fitting/acceptance not implied');
    expect(discovered.model?.status).toBe(discovered.statusDetail);
    const top = manifest.assets.find(a => a.id === 'T02')!;
    expect(top.previewUrl).toContain('rest-front-review.png');
    expect(resolveCatalogLibraryThumbnail(root, top.previewUrl!, manifest)).toBe(join(root, 'assets/avatar/catalog-a/T02/rest-front-review.png'));
  });
  it('refreshes changed model/image URLs without changing unrelated models and resolves stamped paths', () => {
    const { root, file } = fixture();
    const before = buildCatalogLibraryManifest(root);
    file('assets/avatar/catalog-a/T02/body-T02.glb', 'new-model-export');
    file('assets/avatar/concepts/catalog-a/hoodie.png', 'new-reference-export');
    const after = buildCatalogLibraryManifest(root);
    const oldTop = before.assets.find(a => a.id === 'T02')!; const top = after.assets.find(a => a.id === 'T02')!;
    expect(top.model!.modelUrl).not.toBe(oldTop.model!.modelUrl);
    expect(top.references[0].thumbnailUrl).not.toBe(oldTop.references[0].thumbnailUrl);
    expect(after.assets.find(a => a.id === 'F02')!.model!.modelUrl).toBe(before.assets.find(a => a.id === 'F02')!.model!.modelUrl);
    expect(resolveCatalogLibraryFile(root, top.references[0].url, after)).toBe(join(root, 'assets/avatar/concepts/catalog-a/hoodie.png'));
    expect(resolveCatalogLibraryThumbnail(root, top.references[0].thumbnailUrl.split('?')[0], after)).not.toBeNull();
  });
  it('denies secret-looking neighbors and inventories shared gait clips as current animation assets', () => {
    const { root, file } = fixture();
    file('assets/avatar/catalog-a/T02/credentials.json', '{"private":"credential"}');
    file('assets/avatar/catalog-a/foundation/catalog-body-walk.glb'); file('assets/avatar/catalog-a/foundation/catalog-body-run.glb');
    const manifest = buildCatalogLibraryManifest(root);
    expect(manifest.assets.find(a => a.id === 'T02')!.sources.some(s => s.path.endsWith('credentials.json'))).toBe(false);
    expect(resolveCatalogLibraryFile(root, '/__avatar_catalog/files/assets/avatar/catalog-a/T02/credentials.json', manifest)).toBeNull();
    expect(manifest.assets.find(a => a.id.endsWith('foundation/catalog-body-walk.glb'))).toMatchObject({ category: 'animations', history: false, base: 'shared' });
  });
  it('refreshes only the changed shared animation URL and marks explicitly superseded boot outfits as history', () => {
    const { root, file } = fixture();
    file('assets/avatar/catalog-a/foundation/catalog-body-walk.glb'); file('assets/avatar/catalog-a/foundation/catalog-body-run.glb');
    file('assets/avatar/catalog-a/outfits/T05-B01-F04/outfit.glb');
    file('assets/avatar/catalog-a/F04/fitting-revisions/latest/outfit.glb');
    file('assets/avatar/catalog-a/catalog-progress.json', JSON.stringify({ pieces: [], F04_core_outfit_study: { path: 'F04/fitting-revisions/latest', stage: 'Current fitting candidate' } }));
    const before = buildCatalogLibraryManifest(root);
    expect(before.assets.find(a => a.id === 'outfit-T05-B01-F04')?.history).toBe(true);
    expect(before.assets.find(a => a.id === 'study-f04')?.history).toBe(false);
    file('assets/avatar/catalog-a/foundation/catalog-body-walk.glb', 'new-walk-export');
    const after = buildCatalogLibraryManifest(root);
    expect(after.animations.walk).not.toBe(before.animations.walk);
    expect(after.animations.run).toBe(before.animations.run);
  });
  it('handles missing optional metadata and gives a clear malformed progress error', () => {
    const { root, file } = fixture(); rmSync(join(root, 'assets/avatar/concepts/catalog-a/prompts-and-manifest.json'));
    expect(buildCatalogLibraryManifest(root).assets.length).toBeGreaterThan(0);
    file('assets/avatar/catalog-a/catalog-progress.json', '{bad');
    expect(() => buildCatalogLibraryManifest(root)).toThrow(/catalog-progress.json/);
    file('assets/avatar/catalog-a/catalog-progress.json', JSON.stringify({ pieces: [{}] }));
    expect(() => buildCatalogLibraryManifest(root)).toThrow(/pieces/);
  });
});
