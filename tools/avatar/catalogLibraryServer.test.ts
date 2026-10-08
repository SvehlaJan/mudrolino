import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, realpathSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { buildCatalogLibraryManifest, resolveCatalogLibraryFile, resolveCatalogLibraryThumbnail } from './catalogLibraryServer';
const roots: string[] = [];
const originalPng = Buffer.alloc(24); Buffer.from('89504e470d0a1a0a', 'hex').copy(originalPng); originalPng.writeUInt32BE(32, 16); originalPng.writeUInt32BE(32, 20);
const checksum = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');
function fixture() {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'catalog-library-'))); roots.push(root);
  const file = (relative: string, value: string | Buffer = 'fixture') => { const p = join(root, relative); mkdirSync(join(p, '..'), { recursive: true }); writeFileSync(p, value); };
  file('assets/avatar/catalog-a/catalog-progress.json', JSON.stringify({ pieces: [{ id: 'T02', stage: 'fit-verified candidate' }, { id: 'F02', stage: 'previous fit evidence; repair required' }, { id: 'A02', stage: 'not started' }], accepted_ids: [], fit_verified_ids: ['T02', 'F02'], female_phase: { stage: 'female reference only; fitted 3D pending', wardrobe_ids: ['T02'] } }));
  file('assets/avatar/catalog-a/T02/T02.glb'); file('assets/avatar/catalog-a/T02/body-T02.glb'); file('assets/avatar/catalog-a/T02/T02.blend'); file('assets/avatar/catalog-a/T02/retrospective.md');
  file('assets/avatar/catalog-a/F02/F02.glb'); file('assets/avatar/catalog-a/F02/body-F02.glb');
  file('assets/avatar/concepts/catalog-a/prompts-and-manifest.json', JSON.stringify({ boards: [{ title: 'Hoodie construction', items: ['T02 Orange hoodie'], file: 'hoodie.png', prompt: 'T02 worn hoodie' }] }));
  file('assets/avatar/concepts/catalog-a/hoodie.png', originalPng);
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
  it('lists a shared construction reference once when an outfit uses several matching pieces', () => {
    const { root, file } = fixture();
    file('assets/avatar/catalog-a/outfits/T02-B01-F02-A01/outfit.glb');
    file('assets/avatar/concepts/catalog-a/prompts-and-manifest.json', JSON.stringify({ boards: [
      { title: 'Shared outfit construction', items: ['T02 Orange hoodie', 'F02 Slip-ons'], file: 'hoodie.png', prompt: 'Shared construction sheet' },
    ] }));
    const outfit = buildCatalogLibraryManifest(root).assets.find(a => a.id === 'outfit-T02-B01-F02-A01')!;
    expect(outfit.references).toHaveLength(1);
    expect(outfit.references[0].prompt).toBe('Shared construction sheet');
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


describe('explicit model-study registration', () => {
  it('pairs isolated studies with design references and enables only declared compatible gait', () => {
    const { root, file } = fixture();
    file('assets/avatar/catalog-a/female/foundation/studies/h02-envelope/female-foundation.glb');
    file('assets/avatar/catalog-a/female/foundation/studies/h02-envelope/H02.glb');
    file('assets/avatar/catalog-a/female/foundation/studies/h02-envelope/female-foundation.blend');
    file('assets/avatar/catalog-a/female/foundation/studies/h02-envelope/study-report.json');
    file('assets/avatar/catalog-a/female/foundation/studies/h02-envelope/canonical-face-layout.json');
    file('tools/blender/catalog/repair_catalog_f02_corrective_sides.py');
    file('assets/avatar/catalog-a/catalog-progress.json', JSON.stringify({pieces:[], accepted_ids:[],model_studies:[
      {id:'female-foundation-h02-study',label:'Female foundation + H02 study',path:'female/foundation/studies/h02-envelope',model:'female-foundation.glb',kind:'study',base:'female',stage:'isolated foundation; wardrobe fit pending',reference_ids:['T02'],gait_compatible:true,builder:'tools/blender/catalog/repair_catalog_f02_corrective_sides.py'},
      {id:'female-h02-head-study',label:'H02 head study',path:'female/foundation/studies/h02-envelope',model:'H02.glb',kind:'head',base:'female',stage:'head study',reference_ids:['T02'],gait_compatible:true},
    ]}));
    const manifest = buildCatalogLibraryManifest(root);
    const foundation = manifest.assets.find(a=>a.id==='female-foundation-h02-study')!;
    expect(foundation).toMatchObject({base:'female',history:false,status:'candidate',fitVerified:false,accepted:false,supportsGait:true});
    expect(foundation.references.map(r=>r.label)).toContain('female hoodie');
    expect(foundation.sources.map(source=>source.path)).toEqual(expect.arrayContaining([
      'assets/avatar/catalog-a/female/foundation/studies/h02-envelope/canonical-face-layout.json',
      'tools/blender/catalog/repair_catalog_f02_corrective_sides.py',
    ]));
    expect(resolveCatalogLibraryFile(root,foundation.model!.modelUrl,manifest)).toBe(join(root,'assets/avatar/catalog-a/female/foundation/studies/h02-envelope/female-foundation.glb'));
    expect(manifest.assets.find(a=>a.id==='female-h02-head-study')?.supportsGait).toBe(false);
    expect(manifest.assets.filter(a=>a.model?.modelUrl===foundation.model!.modelUrl)).toHaveLength(1);
  });
  it('does not register missing exports or paths outside the declared study directory', () => {
    const { root, file }=fixture();
    file('assets/avatar/catalog-a/catalog-progress.json',JSON.stringify({pieces:[],model_studies:[
      {id:'missing-study',label:'Missing',path:'female/missing',model:'not-exported.glb',base:'female',stage:'pending'},
      {id:'escaping-study',label:'Escaping',path:'T02',model:'../F02/F02.glb',base:'male',stage:'candidate'},
    ]}));
    expect(buildCatalogLibraryManifest(root).assets.some(a=>['missing-study','escaping-study'].includes(a.id))).toBe(false);
  });
});


describe('curated design index', () => {
  function index() {
    return { schemaVersion: 1, items: [{ id: 'T02', label: 'Orange hoodie', collection: 'wardrobe', category: 'tops', description: 'Lowered hood and kangaroo pocket.', relatedIds: [], references: [{ id: 'hoodie-crop', label: 'Focused front/back', path: 'assets/avatar/catalog/references/T02/male.png', sourcePath: 'assets/avatar/concepts/catalog-a/hoodie.png', sourceSha256: checksum(originalPng), cropSha256: checksum('fixture'), prompt: 'T02 worn hoodie', crop: { left: 1, top: 2, width: 3, height: 4 } }], variants: [{ id: 'male', label: 'Male fit', base: 'male', references: [], currentRevisionId: 'current', revisions: [{ id: 'current', label: 'Current candidate', assetId: 'T02', visualReview: 'pending', technicalReview: 'recorded-pass', technicalNote: 'Source-bound historical fitting report; acceptance pending.' }, { id: 'earlier', label: 'Earlier export', assetId: 'file:assets/avatar/catalog-a/T02/revisions/old.glb', visualReview: 'changes-requested', technicalReview: 'not-verified' }] }] }] };
  }
  it('preserves legacy inventories without a curated index', () => {
    const { root } = fixture(); expect(buildCatalogLibraryManifest(root).items ?? []).toEqual([]);
  });
  it('hydrates explicit revisions and allows only linked crop/original/index files', () => {
    const { root, file } = fixture(); file('assets/avatar/catalog/references/T02/male.png');
    file('assets/avatar/catalog/catalog.json', JSON.stringify(index()));
    const manifest = buildCatalogLibraryManifest(root); const item = manifest.items![0];
    expect(item.variants[0].revisions.map(r => r.asset.id)).toEqual(['T02', 'file:assets/avatar/catalog-a/T02/revisions/old.glb']);
    expect(item.variants[0]).toMatchObject({ currentRevisionId: 'current', base: 'male' });
    expect(item.references[0].provenance).toMatchObject({ sourcePath: 'assets/avatar/concepts/catalog-a/hoodie.png', crop: { left: 1, top: 2, width: 3, height: 4 } });
    expect(resolveCatalogLibraryThumbnail(root, item.references[0].thumbnailUrl, manifest)).toBe(join(root, 'assets/avatar/catalog/references/T02/male.png'));
    expect(resolveCatalogLibraryFile(root, item.references[0].provenance!.sourceUrl, manifest)).toBe(join(root, 'assets/avatar/concepts/catalog-a/hoodie.png'));
    expect(resolveCatalogLibraryFile(root, '/__avatar_catalog/files/assets/avatar/catalog/catalog.json', manifest)).toBe(join(root, 'assets/avatar/catalog/catalog.json'));
    file('assets/avatar/catalog/references/unlinked.png');
    expect(resolveCatalogLibraryFile(root, '/__avatar_catalog/files/assets/avatar/catalog/references/unlinked.png', manifest)).toBeNull();
    const before = manifest.version; file('assets/avatar/catalog/references/T02/male.png', 'changed-crop');
    expect(() => buildCatalogLibraryManifest(root)).toThrow(/crop.*hash/i);
    const changed = index(); changed.items[0].references[0].cropSha256 = checksum('changed-crop'); file('assets/avatar/catalog/catalog.json', JSON.stringify(changed));
    expect(buildCatalogLibraryManifest(root).version).not.toBe(before);
  });
  it.each(['duplicate', 'missing-asset', 'wrong-current', 'unsafe-reference', 'invalid-review', 'malformed', 'crop-bounds', 'source-hash'])('rejects %s index data clearly', failure => {
    const { root, file } = fixture(); file('assets/avatar/catalog/references/T02/male.png'); const data = index();
    if (failure === 'duplicate') data.items.push(data.items[0]);
    if (failure === 'missing-asset') data.items[0].variants[0].revisions[0].assetId = 'not-present';
    if (failure === 'wrong-current') data.items[0].variants[0].currentRevisionId = 'not-present';
    if (failure === 'unsafe-reference') data.items[0].references[0].path = 'assets/avatar/../../private.png';
    if (failure === 'crop-bounds') data.items[0].references[0].crop.width = 999;
    if (failure === 'source-hash') data.items[0].references[0].sourceSha256 = 'a'.repeat(64);
    if (failure === 'invalid-review') data.items[0].variants[0].revisions[0].visualReview = 'inferred';
    file('assets/avatar/catalog/catalog.json', failure === 'malformed' ? '{bad' : JSON.stringify(data));
    expect(() => buildCatalogLibraryManifest(root)).toThrow(/catalog\.json/);
  });
  it('rejects curated reference symlinks outside the approved avatar roots', () => {
    const { root, file } = fixture(); file('outside.png'); file('assets/avatar/catalog/catalog.json', JSON.stringify(index()));
    mkdirSync(join(root, 'assets/avatar/catalog/references/T02'), { recursive: true });
    symlinkSync(join(root, 'outside.png'), join(root, 'assets/avatar/catalog/references/T02/male.png'));
    expect(() => buildCatalogLibraryManifest(root)).toThrow(/catalog\.json/);
  });
  it('allows explicit proven playback on current copies and preserves raw and older history', () => {
    const { root, file } = fixture(); file('assets/avatar/catalog/references/T02/male.png'); const data = index();
    const oldId = 'file:assets/avatar/catalog-a/T02/revisions/old.glb';
    Object.assign(data.items[0].variants[0].revisions[0], { assetId: oldId, gaitCompatible: true, renderKind: 'study' });
    file('assets/avatar/catalog/catalog.json', JSON.stringify(data));
    const manifest = buildCatalogLibraryManifest(root); const revisions = manifest.items![0].variants[0].revisions;
    expect(revisions[0].asset).toMatchObject({ history: false, supportsGait: true, model: { kind: 'study' } });
    expect(revisions[1].asset.history).toBe(true);
    expect(manifest.assets.find(a => a.id === oldId)).toMatchObject({ history: true, supportsGait: false, model: { kind: 'head' } });
  });
  it('keeps repair studies fully framed at rest while disabling explicit playback', () => {
    const { root, file } = fixture(); file('assets/avatar/catalog/references/T02/male.png'); const data = index();
    Object.assign(data.items[0].variants[0].revisions[0], { technicalReview: 'repair-needed', gaitCompatible: false, renderKind: 'study' });
    file('assets/avatar/catalog/catalog.json', JSON.stringify(data));
    const manifest = buildCatalogLibraryManifest(root);
    expect(manifest.items![0].variants[0].revisions[0].asset).toMatchObject({ supportsGait: false, model: { kind: 'study' } });
    Object.assign(data.items[0].variants[0].revisions[0], { gaitCompatible: true });
    file('assets/avatar/catalog/catalog.json', JSON.stringify(data));
    expect(() => buildCatalogLibraryManifest(root)).toThrow(/playback override/);
  });
  it('renders current shared motion assets on the catalog body with the actual clip source retained', () => {
    const { root, file } = fixture(); file('assets/avatar/catalog-a/foundation/catalog-body.glb');
    file('assets/avatar/catalog-a/foundation/catalog-body-walk.glb'); file('assets/avatar/catalog-a/foundation/catalog-body-run.glb');
    const manifest = buildCatalogLibraryManifest(root); const walk = manifest.assets.find(a => a.id.endsWith('/catalog-body-walk.glb'))!;
    expect(walk).toMatchObject({ animation: 'walk', supportsGait: true, model: { kind: 'body' } });
    expect(walk.model!.modelUrl).toContain('catalog-body.glb');
    expect(walk.sources.some(source => source.path.endsWith('/catalog-body-walk.glb'))).toBe(true);
  });
});
