import { realpathSync, mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { buildCatalogPreviewManifest, resolveCatalogPreviewFile } from './catalogPreviewServer';
const roots: string[] = [];
function fixture() {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'catalog-viewer-'))); roots.push(root);
  function file(relative: string, content = 'fixture') { const path = join(root, 'assets/avatar/catalog-a', relative); mkdirSync(join(path, '..'), { recursive: true }); writeFileSync(path, content); }
  file('catalog-progress.json', JSON.stringify({ pieces: [{ id: 'F04', stage: 'candidate' }, { id: 'F02', stage: 'repair required' }, { id: 'A02', stage: 'not started' }] }));
  for (const relative of ['foundation/catalog-body.glb', 'foundation/catalog-body-walk.glb', 'foundation/catalog-body-run.glb', 'F04/F04.glb', 'F04/body-F04.glb', 'F02/F02.glb', 'F02/body-F02.glb']) file(relative);
  return { root, file };
}
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });
describe('development catalog inventory', () => {
  it('exposes a head revision and its outfit as studies without replacing the fitting foundation', () => {
    const { root, file } = fixture();
    file('catalog-progress.json', JSON.stringify({ pieces: [], H01_style_study: { path: 'H01/style-revisions/reference-a', stage: 'candidate; expressions pending' } }));
    file('H01/style-revisions/reference-a/H01.glb'); file('H01/style-revisions/reference-a/outfit.glb');
    const entries = buildCatalogPreviewManifest(root).entries;
    expect(entries.map(e => e.id)).toEqual(['body', 'head-style-reference-a', 'study-h01-reference-a']);
    expect(entries[1].kind).toBe('head'); expect(entries[2].kind).toBe('study');
    expect(entries[2].status).toContain('expressions pending');
    expect(resolveCatalogPreviewFile(root, entries[1].modelUrl)).not.toBeNull();
    expect(resolveCatalogPreviewFile(root, '/__avatar_catalog/assets/H01/style-revisions/reference-a/rejected-initial/H01.glb')).toBeNull();
  });
  it('exposes authored models, preserves repair status and omits unbuilt concepts', () => {
    const { root } = fixture(); const manifest = buildCatalogPreviewManifest(root);
    expect(manifest.entries.map(e => e.id)).toEqual(['body', 'F04', 'F02']);
    expect(manifest.entries.find(e => e.id === 'F02')?.status).toBe('repair required');
    expect(manifest.animations.run).toContain('catalog-body-run.glb');
  });
  it('serves only inventoried models and rejects source files, traversal and escaping symlinks', () => {
    const { root, file } = fixture(); file('F04/F04.blend');
    const manifest = buildCatalogPreviewManifest(root); const model = manifest.entries[1];
    expect(resolveCatalogPreviewFile(root, model.modelUrl)).toBe(join(root, 'assets/avatar/catalog-a/F04/body-F04.glb'));
    expect(resolveCatalogPreviewFile(root, '/__avatar_catalog/assets/F04/F04.blend')).toBeNull();
    expect(resolveCatalogPreviewFile(root, '/__avatar_catalog/assets/../../.env')).toBeNull();
    const outside = join(root, 'outside.glb'); writeFileSync(outside, 'outside');
    rmSync(join(root, 'assets/avatar/catalog-a/F04/F04.glb')); symlinkSync(outside, join(root, 'assets/avatar/catalog-a/F04/F04.glb'));
    expect(resolveCatalogPreviewFile(root, model.garmentUrl!)).toBeNull();
  });
});
