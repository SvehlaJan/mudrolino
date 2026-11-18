import { realpathSync, mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync, renameSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildCatalogPreviewManifest, resolveCatalogPreviewFile } from './catalogPreviewServer';
const roots: string[] = [];
function fixture() {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'catalog-viewer-'))); roots.push(root);
  function file(relative: string, content: string | Buffer = 'fixture') { const path = join(root, 'assets/avatar/catalog-a', relative); mkdirSync(join(path, '..'), { recursive: true }); writeFileSync(path, content); }
  file('catalog-progress.json', JSON.stringify({ pieces: [{ id: 'F04', stage: 'candidate' }, { id: 'F02', stage: 'repair required' }, { id: 'A02', stage: 'not started' }] }));
  for (const relative of ['foundation/catalog-body.glb', 'foundation/catalog-body-walk.glb', 'foundation/catalog-body-run.glb', 'F04/F04.glb', 'F04/body-F04.glb', 'F02/F02.glb', 'F02/body-F02.glb']) file(relative);
  return { root, file };
}
afterEach(() => { vi.unstubAllEnvs(); for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });
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

describe('catalog library HTTP transport', () => {
  it('serves inventory, allowed native sources, GLB probes and small image thumbnails', async () => {
    const { root, file } = fixture();
    file('F04/F04.blend', 'native-source');
    const compressedProof=gzipSync('{"status":"failed"}\n');
    file('F04/fit-report.json.gz',compressedProof);
    file('F04/credentials-report.json.gz',gzipSync('{}'));
    const { default: sharp } = await import('sharp');
    const image = join(root, 'assets/avatar/concepts/new-reference.png'); mkdirSync(join(image, '..'), { recursive: true });
    await sharp({ create: { width: 900, height: 600, channels: 3, background: '#ff8800' } }).png().toFile(image);
    const { createServer } = await import('node:http');
    const { catalogPreviewPlugin } = await import('./catalogPreviewServer');
    let middleware: import('node:http').RequestListener | undefined;
    const plugin = catalogPreviewPlugin();
    if (typeof plugin.configureServer !== 'function') throw new Error('Missing dev middleware');
    plugin.configureServer.call({} as import('vite').MinimalPluginContextWithoutEnvironment, { config: { root }, middlewares: { use: (handler: import('node:http').RequestListener) => { middleware = handler; } } } as unknown as import('vite').ViteDevServer);
    const server = createServer((req, res) => middleware!(req, res));
    await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
    const address = server.address(); if (!address || typeof address === 'string') throw new Error('Missing server address');
    const base = `http://127.0.0.1:${address.port}`;
    try {
      const response = await fetch(`${base}/__avatar_catalog/library.json`); expect(response.status).toBe(200);
      const manifest = await response.json() as import('../../src/avatar/catalogLibrary').CatalogLibraryManifest;
      const reference = manifest.assets.find(a => a.id.endsWith('new-reference.png'))!.references[0];
      const concurrent = await Promise.all(Array.from({ length: 8 }, async () => {
        const result = await fetch(base + reference.thumbnailUrl); expect(result.status).toBe(200);
        return Buffer.from(await result.arrayBuffer());
      }));
      expect(concurrent.every(bytes => bytes.equals(concurrent[0]))).toBe(true);
      const thumbnail = await fetch(base + reference.thumbnailUrl); expect(thumbnail.headers.get('content-type')).toBe('image/png');
      expect((await sharp(Buffer.from(await thumbnail.arrayBuffer())).metadata()).width).toBe(320);
      const original = await fetch(base + reference.url, { method: 'HEAD' }); expect(original.status).toBe(200); expect(original.headers.get('content-type')).toBe('image/png'); expect(await original.text()).toBe('');
      const blend = manifest.assets.find(a => a.id === 'F04')!.sources.find(s => s.role === 'blend')!;
      expect(await (await fetch(base + blend.url)).text()).toBe('native-source');
      const proof=manifest.assets.find(a=>a.id==='F04')!.sources.find(source=>source.path.endsWith('fit-report.json.gz'))!;
      expect(proof).toBeDefined();
      const compressed=await fetch(base+proof.url); expect(compressed.headers.get('content-type')).toBe('application/gzip');
      expect(compressed.headers.get('content-encoding')).toBeNull(); expect(Buffer.from(await compressed.arrayBuffer())).toEqual(compressedProof);
      const compressedHead=await fetch(base+proof.url,{method:'HEAD'}); expect(compressedHead.headers.get('content-length')).toBe(String(compressedProof.length)); expect(await compressedHead.text()).toBe('');
      expect((await fetch(base+'/__avatar_catalog/files/assets/avatar/catalog-a/F04/credentials-report.json.gz')).status).toBe(404);
      const model = manifest.assets.find(a => a.id === 'F04')!.model!.modelUrl;
      const probe = await fetch(base + model, { headers: { Range: 'bytes=0-0' } }); expect(probe.status).toBe(206); expect(probe.headers.get('content-range')).toBe('bytes 0-0/7'); expect(await probe.text()).toBe('f');
      expect((await fetch(base + model, { headers: { Range: 'bytes=30-40' } })).status).toBe(416);
      expect((await fetch(base + blend.url, { method: 'POST' })).status).toBe(405);
      expect((await fetch(`${base}/__avatar_catalog/files/.env`)).status).toBe(404);

      let denied = 0;
      middleware!({ url: '/__avatar_catalog/library.json', method: 'GET', headers: { host: 'localhost' }, socket: { remoteAddress: '192.168.1.20' } } as unknown as import('node:http').IncomingMessage, { set statusCode(value: number) { denied = value; }, end() {} } as unknown as import('node:http').ServerResponse);
      expect(denied).toBe(403);
      denied = 0;
      middleware!({ url: '/__avatar_catalog/library.json', method: 'GET', headers: { host: 'untrusted.example' }, socket: { remoteAddress: '127.0.0.1' } } as unknown as import('node:http').IncomingMessage, { set statusCode(value: number) { denied = value; }, end() {} } as unknown as import('node:http').ServerResponse);
      expect(denied).toBe(403);
      expect((await fetch(`${base}/__avatar_catalog/assets/F04/F04.blend`)).status).toBe(404);
    } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
  });
});


it('serves inventoried models from the exact approved archived catalog root', () => {
  const {root}=fixture(); const archive=realpathSync(mkdtempSync(join(tmpdir(),'preview-archive-'))); roots.push(archive);
  mkdirSync(join(archive,'working/assets/avatar'),{recursive:true});
  renameSync(join(root,'assets/avatar/catalog-a'),join(archive,'working/assets/avatar/catalog-a'));
  symlinkSync(join(archive,'working/assets/avatar/catalog-a'),join(root,'assets/avatar/catalog-a'));
  writeFileSync(join(root,'assets/avatar/local-archive.json'),JSON.stringify({schemaVersion:1,archiveId:'fixture',sourceCommit:'a'.repeat(40),roots:['assets/avatar/catalog-a']}));
  writeFileSync(join(archive,'archive-manifest.json'),JSON.stringify({schemaVersion:1,archiveId:'fixture',sourceCommit:'a'.repeat(40),verified:true})); vi.stubEnv('MUDROLINO_ARCHIVE_ROOT',archive);
  const manifest=buildCatalogPreviewManifest(root);
  expect(resolveCatalogPreviewFile(root,manifest.entries[1].modelUrl)).toBe(join(archive,'working/assets/avatar/catalog-a/F04/body-F04.glb'));
  rmSync(join(root,'assets/avatar/catalog-a'));
  expect(()=>buildCatalogPreviewManifest(root)).toThrow(/archive|missing|link/i);
});
