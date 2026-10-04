import path from 'node:path';
import { existsSync, realpathSync } from 'node:fs';

export function resolveCatalogPreviewFixture(root, args) {
  const option = name => args.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3);
  const outfit = option('outfit') ?? 'T01-B01-F01-A01';
  if (!/^[A-Z0-9-]+$/.test(outfit)) throw new Error('Invalid outfit ID');
  function canonical(location) {
    let ancestor = location;
    while (!existsSync(ancestor)) {
      const parent = path.dirname(ancestor);
      if (parent === ancestor) throw new Error('No existing path ancestor');
      ancestor = parent;
    }
    return path.resolve(realpathSync(ancestor), path.relative(ancestor, location));
  }
  const escapes = relative => relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative);
  function inside(value, allowed) {
    const candidate = path.resolve(root, value);
    const relative = path.relative(path.resolve(root, allowed), candidate);
    const approved = canonical(path.resolve(root, allowed));
    if (escapes(relative) || escapes(path.relative(canonical(root), approved)) || escapes(path.relative(approved, canonical(candidate)))) throw new Error(`Path must stay under ${allowed}`);
    return candidate;
  }
  const outfitDir = inside(option('outfit-dir') ?? `assets/avatar/catalog-a/outfits/${outfit}`, 'assets/avatar');
  const outputDir = inside(option('output-dir') ?? `artifacts/verification/avatar-catalog/outfits/${outfit}`, 'artifacts/verification');
  const preview = new URL(option('preview-url') ?? 'http://127.0.0.1:3003');
  if (preview.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(preview.hostname) || preview.pathname !== '/' || preview.search || preview.hash || preview.username || preview.password) throw new Error('Preview URL must be a loopback HTTP origin');
  return { outfit, production: args.includes('--production'), previewUrl: preview.origin, outputDir, replacements: {
    '/avatar/modular/male-base-plain.glb': inside(path.join(outfitDir, 'body.glb'), 'assets/avatar'),
    '/avatar/modular/male-base-plain-walking.glb': inside('assets/avatar/catalog-a/foundation/catalog-body-walk.glb', 'assets/avatar'),
    '/avatar/modular/male-base-plain-running.glb': inside('assets/avatar/catalog-a/foundation/catalog-body-run.glb', 'assets/avatar'),
    '/avatar/garments/top_blue_tshirt_v1.glb': inside(path.join(outfitDir, 'garments.glb'), 'assets/avatar'),
  } };
}

export function assertCatalogPreviewEvidence(result, animation) {
  const required = ['/avatar/modular/male-base-plain.glb', '/avatar/garments/top_blue_tshirt_v1.glb'];
  if (animation === 'walk') required.push('/avatar/modular/male-base-plain-walking.glb');
  if (animation === 'run') required.push('/avatar/modular/male-base-plain-running.glb');
  const missing = required.filter(url => !result.completedCandidateGets.includes(url));
  if (missing.length) throw new Error(`Missing completed candidate GET: ${missing.join(', ')}`);
  if (!(result.canvas.width > 0 && result.canvas.height > 0)) throw new Error('Empty candidate canvas');
  if (animation !== 'idle' && result.renderSha256 === result.laterRenderSha256) throw new Error('Expected changing gait motion pixels');
}
