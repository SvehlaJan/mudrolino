import { createReadStream, existsSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';
import sharp from 'sharp';
import type { CatalogLibraryManifest } from '../../src/avatar/catalogLibrary';
import { buildCatalogLibraryManifest, resolveCatalogLibraryFile, resolveCatalogLibraryThumbnail } from './catalogLibraryServer';
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

const mimeTypes: Record<string, string> = { '.glb': 'model/gltf-binary', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.json': 'application/json', '.md': 'text/markdown; charset=utf-8', '.py': 'text/plain; charset=utf-8', '.ts': 'text/plain; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.blend': 'application/octet-stream' };
export function catalogPreviewPlugin(): Plugin {
  return { name: 'avatar-catalog-inspection', apply: 'serve', configureServer(server) {
    // Concurrent image requests share an inventory; the next five-second poll
    // discovers new exports without repeating filesystem scans for every card.
    let library: { manifest: CatalogLibraryManifest; expires: number } | undefined;
    const getLibrary = () => {
      if (!library || library.expires <= Date.now()) library = { manifest: buildCatalogLibraryManifest(server.config.root), expires: Date.now() + 1000 };
      return library.manifest;
    };
    const thumbnails = new Map<string, Buffer>();
    const pendingThumbnails = new Map<string, Promise<Buffer>>();
    let thumbnailBytes = 0;
    const thumbnail = async (file: string) => {
      const stat = statSync(file); const key = `${file}:${stat.mtimeMs}:${stat.ctimeMs}:${stat.size}`;
      const cached = thumbnails.get(key);
      if (cached) { thumbnails.delete(key); thumbnails.set(key, cached); return cached; }
      const pending = pendingThumbnails.get(key); if (pending) return pending;
      const conversion = sharp(file, { limitInputPixels: 50_000_000 }).resize({ width: 320, withoutEnlargement: true }).png().toBuffer().then(bytes => {
        while (thumbnails.size >= 64 || thumbnailBytes + bytes.length > 16 * 1024 * 1024) {
          const oldest = thumbnails.keys().next().value; if (!oldest) break;
          thumbnailBytes -= thumbnails.get(oldest)!.length; thumbnails.delete(oldest);
        }
        if (bytes.length <= 16 * 1024 * 1024) { thumbnails.set(key, bytes); thumbnailBytes += bytes.length; }
        return bytes;
      }).finally(() => pendingThumbnails.delete(key));
      pendingThumbnails.set(key, conversion);
      return conversion;
    };
    server.middlewares.use((req, res, next) => {
      const url = new URL(req.url ?? '/', 'http://localhost').pathname;
      if (!url.startsWith(prefix)) return next();
      const libraryRoute = url === `${prefix}library.json` || url.startsWith(`${prefix}files/`) || url.startsWith(`${prefix}thumbs/`);
      // Native sources and tooling are a local workbench feature even when Vite
      // binds to 0.0.0.0. Do not expose these payloads to other network clients.
      const remote = req.socket.remoteAddress;
      let localHost = false;
      try { localHost = ['localhost', '127.0.0.1', '[::1]', '::1'].includes(new URL(`http://${req.headers.host ?? ''}`).hostname); } catch { /* Invalid Host is denied. */ }
      if (libraryRoute && (!localHost || !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(remote ?? ''))) { res.statusCode = 403; res.end('Avatar library is available on localhost only'); return; }
      if (!['GET', 'HEAD'].includes(req.method ?? '')) { res.statusCode = 405; res.setHeader('Allow', 'GET, HEAD'); res.end(); return; }
      res.setHeader('Cache-Control', 'no-store');
      void (async () => {
        if (url === `${prefix}manifest.json` || url === `${prefix}library.json`) {
          const manifest = url.endsWith('/library.json') ? getLibrary() : buildCatalogPreviewManifest(server.config.root);
          res.setHeader('Content-Type', 'application/json'); res.end(req.method === 'HEAD' ? undefined : JSON.stringify(manifest)); return;
        }
        const isThumbnail = url.startsWith(`${prefix}thumbs/`);
        const file = isThumbnail ? resolveCatalogLibraryThumbnail(server.config.root, url, getLibrary()) : url.startsWith(`${prefix}files/`) ? resolveCatalogLibraryFile(server.config.root, url, getLibrary()) : resolveCatalogPreviewFile(server.config.root, url);
        if (!file) { res.statusCode = 404; res.end('Catalog asset unavailable'); return; }
        if (isThumbnail) {
          const bytes = await thumbnail(file); res.setHeader('Content-Type', 'image/png'); res.setHeader('Content-Length', bytes.length); res.end(req.method === 'HEAD' ? undefined : bytes); return;
        }
        const size = statSync(file).size; res.setHeader('Content-Type', mimeTypes[path.extname(file).toLowerCase()] ?? 'application/octet-stream'); res.setHeader('Accept-Ranges', 'bytes');
        if (req.headers.range) {
          const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
          const suffix = range && !range[1] && range[2] ? Number(range[2]) : undefined;
          const start = suffix !== undefined ? Math.max(0, size - suffix) : range?.[1] ? Number(range[1]) : NaN;
          const end = suffix !== undefined ? size - 1 : range?.[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
          if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start >= size || end < start || suffix === 0) { res.statusCode = 416; res.setHeader('Content-Range', `bytes */${size}`); res.end(); return; }
          res.statusCode = 206; res.setHeader('Content-Range', `bytes ${start}-${end}/${size}`); res.setHeader('Content-Length', end - start + 1);
          if (req.method === 'HEAD') res.end(); else createReadStream(file, { start, end }).on('error', () => res.destroy()).pipe(res);
        } else {
          res.setHeader('Content-Length', size); if (req.method === 'HEAD') res.end(); else createReadStream(file).on('error', () => res.destroy()).pipe(res);
        }
      })().catch(error => {
        if (res.headersSent) { res.destroy(); return; }
        res.statusCode = 500; res.setHeader('Content-Type', 'application/json'); res.end(req.method === 'HEAD' ? undefined : JSON.stringify({ error: error instanceof Error ? error.message : 'Avatar inventory unavailable' }));
      });
    });
  } };
}
