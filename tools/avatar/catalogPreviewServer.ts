import { createReadStream, existsSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';
import type { CatalogPreviewEntry, CatalogPreviewManifest } from '../../src/avatar/catalogPreview';

const prefix = '/__avatar_catalog/';
const urlFor = (relative: string) => `${prefix}assets/${relative}`;
const names: Record<string, string> = { T01: 'Blue crew tee', T02: 'Orange hoodie', T03: 'Raglan tee', T04: 'Navy zip hoodie', T05: 'Blue sweatshirt', T06: 'Ivory henley', B01: 'Navy trousers', B02: 'Blue joggers', B03: 'Navy shorts', B04: 'Ivory trousers', F01: 'Strap sneakers', F02: 'Slip-ons', F03: 'High-tops', F04: 'Orange ankle boots', A01: 'Orange cap', H01: 'Original head' };
export function buildCatalogPreviewManifest(root: string): CatalogPreviewManifest {
  const catalog = path.join(root, 'assets/avatar/catalog-a');
  const progressPath = path.join(catalog, 'catalog-progress.json');
  const progress = existsSync(progressPath) ? JSON.parse(readFileSync(progressPath, 'utf8')) : { pieces: [] };
  const entries: CatalogPreviewEntry[] = [];
  const exists = (relative: string) => existsSync(path.join(catalog, relative));
  if (exists('foundation/catalog-body.glb')) entries.push({ id: 'body', label: 'Body + H01 head', kind: 'body', status: 'Shared fitting foundation; final style pending', modelUrl: urlFor('foundation/catalog-body.glb') });
  for (const piece of progress.pieces) {
    const relative = `${piece.id}/${piece.id}.glb`;
    if (!exists(relative)) continue;
    if (piece.id.startsWith('H')) {
      entries.push({ id: piece.id, label: `${piece.id} · ${names[piece.id] ?? 'Head'}`, kind: 'head', status: piece.stage, modelUrl: urlFor(relative) });
    } else if (exists(`${piece.id}/body-${piece.id}.glb`)) {
      const slot = piece.id.startsWith('T') ? 'top' : piece.id.startsWith('B') ? 'bottom' : piece.id.startsWith('F') ? 'shoes' : 'accessory';
      entries.push({ id: piece.id, label: `${piece.id} · ${names[piece.id] ?? piece.id}`, kind: 'piece', status: piece.stage, slot, modelUrl: urlFor(`${piece.id}/body-${piece.id}.glb`), garmentUrl: urlFor(relative) });
    }
  }
  if (exists('outfits')) for (const dir of readdirSync(path.join(catalog, 'outfits'), { withFileTypes: true })) {
    if (!dir.isDirectory() || !exists(`outfits/${dir.name}/outfit.glb`)) continue;
    const repairs = dir.name.split('-').filter(id => ['B03', 'B04', 'F02'].includes(id));
    entries.push({ id: `outfit-${dir.name}`, label: dir.name, kind: 'outfit', modelUrl: urlFor(`outfits/${dir.name}/outfit.glb`), status: repairs.length ? `Needs repair: ${repairs.join(', ')}; earlier fitting evidence retained` : dir.name.includes('F04') ? 'Earlier boot outfit; use the latest study for corrected fitting' : 'Fitting candidate; final acceptance pending' });
  }
  const study = progress.F04_core_outfit_study;
  if (study && exists(`${study.path}/outfit.glb`)) entries.push({ id: 'study-f04', label: 'Latest orange boots + navy trousers + sweatshirt', kind: 'study', status: study.stage, modelUrl: urlFor(`${study.path}/outfit.glb`) });
  const headStudy = progress.H01_style_study;
  if (headStudy && exists(`${headStudy.path}/H01.glb`)) entries.push({ id: 'head-style-reference-a', label: 'H01 · Reference A face refinement study', kind: 'head', status: headStudy.stage, modelUrl: urlFor(`${headStudy.path}/H01.glb`) });
  if (headStudy && exists(`${headStudy.path}/outfit.glb`)) entries.push({ id: 'study-h01-reference-a', label: 'Reference A face study + sweatshirt/trousers/boots', kind: 'study', status: headStudy.stage, modelUrl: urlFor(`${headStudy.path}/outfit.glb`) });
  return { entries, animations: { walk: urlFor('foundation/catalog-body-walk.glb'), run: urlFor('foundation/catalog-body-run.glb') } };
}

export function resolveCatalogPreviewFile(root: string, url: string): string | null {
  const manifest = buildCatalogPreviewManifest(root);
  const allowed = [...manifest.entries.flatMap(e => [e.modelUrl, ...(e.garmentUrl ? [e.garmentUrl] : [])]), ...Object.values(manifest.animations)];
  if (!allowed.includes(url)) return null;
  const catalog = path.join(root, 'assets/avatar/catalog-a');
  const file = path.join(catalog, url.slice(`${prefix}assets/`.length));
  if (!existsSync(file)) return null;
  const resolved = realpathSync(file);
  return resolved.startsWith(realpathSync(catalog) + path.sep) && statSync(resolved).isFile() ? resolved : null;
}

export function catalogPreviewPlugin(): Plugin {
  return { name: 'avatar-catalog-inspection', apply: 'serve', configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const url = new URL(req.url ?? '/', 'http://localhost').pathname;
      if (!url.startsWith(prefix)) return next();
      if (!['GET', 'HEAD'].includes(req.method ?? '')) { res.statusCode = 405; res.end(); return; }
      res.setHeader('Cache-Control', 'no-store');
      if (url === `${prefix}manifest.json`) {
        res.setHeader('Content-Type', 'application/json');
        res.end(req.method === 'HEAD' ? undefined : JSON.stringify(buildCatalogPreviewManifest(server.config.root))); return;
      }
      const file = resolveCatalogPreviewFile(server.config.root, url);
      if (!file) { res.statusCode = 404; res.end('Catalog asset unavailable'); return; }
      const size = statSync(file).size;
      res.setHeader('Content-Type', 'model/gltf-binary'); res.setHeader('Accept-Ranges', 'bytes');
      if (req.headers.range) {
        if (req.headers.range !== 'bytes=0-0' || size === 0) { res.statusCode = 416; res.setHeader('Content-Range', `bytes */${size}`); res.end(); return; }
        res.statusCode = 206; res.setHeader('Content-Range', `bytes 0-0/${size}`); res.setHeader('Content-Length', 1);
        if (req.method === 'HEAD') res.end(); else createReadStream(file, { start: 0, end: 0 }).on('error', () => res.destroy()).pipe(res);
      } else {
        res.setHeader('Content-Length', size);
        if (req.method === 'HEAD') res.end(); else createReadStream(file).on('error', () => res.destroy()).pipe(res);
      }
    });
  } };
}
