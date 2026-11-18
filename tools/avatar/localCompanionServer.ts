import { createHash } from 'node:crypto';
import { readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import type { Plugin } from 'vite';
import { resolveAuthoringRoot } from './localArchive.mjs';

const modelUrl = '/__avatar_fixture/bear-v1.glb';
const modelPath = 'assets/avatar/catalog-a/companions/bear-v2/revisions/celebration-v7/web-v1/model.glb';

/**
 * Development only: serves the approved bear from this checkout, so VITE_AVATAR_LOCAL_COMPANION
 * can show the companion before it is published. Only the revision recorded in the asset
 * manifest is served; a stale or half-restored model is refused rather than shown as the bear.
 */
export function localCompanionPlugin(): Plugin {
  return { name: 'avatar-local-companion', apply: 'serve', configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (new URL(req.url ?? '/', 'http://localhost').pathname !== modelUrl) return next();
      if (!['GET', 'HEAD'].includes(req.method ?? '')) { res.statusCode = 405; res.setHeader('Allow', 'GET, HEAD'); res.end(); return; }
      res.setHeader('Cache-Control', 'no-store');
      void (async () => {
        const root = server.config.root;
        let approved: string;
        try { approved = resolveAuthoringRoot(root, 'assets/avatar/catalog-a', {required:true})!; }
        catch (error) {
          res.statusCode = 503; res.end(error instanceof Error ? error.message : 'Local avatar archive unavailable'); return;
        }
        const manifest = JSON.parse(await readFile(path.join(root, 'assets/avatar/asset-manifest.json'), 'utf8')) as {
          files?: Record<string, { sha256?: string }>;
        };
        const model = await realpath(path.join(root, modelPath));
        if (!model.startsWith(approved + path.sep)) { res.statusCode = 404; res.end('Local bear is outside the approved avatar root'); return; }
        const bytes = await readFile(model);
        if (createHash('sha256').update(bytes).digest('hex') !== manifest.files?.[modelPath]?.sha256) {
          res.statusCode = 409; res.end('Local bear differs from the revision in asset-manifest.json'); return;
        }
        res.setHeader('Content-Type', 'model/gltf-binary'); res.setHeader('Content-Length', bytes.length);
        res.end(req.method === 'HEAD' ? undefined : bytes);
      })().catch(() => {
        if (res.headersSent) { res.destroy(); return; }
        res.statusCode = 404; res.end(`Local bear unavailable: ${modelPath}`);
      });
    });
  } };
}
