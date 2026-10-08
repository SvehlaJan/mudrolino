import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import path from 'node:path';
import type { CatalogBase, CatalogCategory, CatalogItem, CatalogLibraryAsset, CatalogLibraryManifest, CatalogReference, CatalogSource } from '../../src/avatar/catalogLibrary';
import type { CatalogPreviewEntry } from '../../src/avatar/catalogPreview';
import { buildCatalogPreviewManifest } from './catalogPreviewServer';
import { catalogIndexPath, catalogItemAssets, catalogItemReferences, hydrateCatalogIndex } from './catalogIndex';

const prefix = '/__avatar_catalog/';
const catalogRoot = 'assets/avatar/catalog-a';
const imagePattern = /\.(png|jpe?g|webp)$/i;
const sourcePattern = /\.(glb|blend|json|md|py|mjs|js|ts)$/i;
function isSource(relative: string): boolean {
  const name = path.posix.basename(relative);
  if (/secret|credential|password|token|api[-_]?key|private[-_]key/i.test(name)) return false;
  if (/\.json$/i.test(name)) return /report|proof|metadata|diagnos|summary|audit|fit|sweep|study|regression|guard|preserv|correct|readiness|coverage|deformation|budget|manifest|prompts|catalog-progress|^export-validation\.json$|^canonical-face-layout\.json$/i.test(name);
  if (/\.md$/i.test(name)) return /^(retrospective|gallery|readme)(?:[-_].*)?\.md$/i.test(name);
  if (/\.(py|mjs|js|ts)$/i.test(name)) return /^(build|prepare|assemble|verify|render|fit|diagnose|capture|summarize|catalog|repair)[_-]/i.test(name) && relative.startsWith('tools/');
  return /\.(glb|blend)$/i.test(name);
}
const roots = ['assets/avatar', 'public/avatar', 'tools/avatar', 'tools/blender', 'artifacts/verification'];
const slash = (p: string) => p.split(path.sep).join('/');
const fileUrl = (relative: string) => `${prefix}files/${relative.split('/').map(encodeURIComponent).join('/')}`;
const thumbnailUrl = (relative: string) => `${prefix}thumbs/${relative.split('/').map(encodeURIComponent).join('/')}`;
const names: Record<string, string> = { T01: 'Blue crew tee', T02: 'Orange hoodie', T03: 'Raglan tee', T04: 'Navy zip hoodie', T05: 'Blue sweatshirt', T06: 'Ivory henley', B01: 'Navy trousers', B02: 'Blue joggers', B03: 'Navy shorts', B04: 'Ivory trousers', F01: 'Strap sneakers', F02: 'Slip-ons', F03: 'High-tops', F04: 'Orange ankle boots', A01: 'Orange cap', A02: 'Navy beanie', A03: 'Round glasses', A04: 'Soft-square glasses', A05: 'Orange backpack', A06: 'Ivory loop scarf', H01: 'Original head', H02: 'Long smooth hair', H03: 'Rounded curls', H04: 'Short crop', H05: 'Silver waves and glasses', H06: 'Bald and glasses' };
type Metadata = Record<string, unknown>;
function object(value: unknown): Metadata { return value && typeof value === 'object' && !Array.isArray(value) ? value as Metadata : {}; }
function strings(value: unknown): string[] { return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []; }
function inside(root: string, target: string) { return target.startsWith(root + path.sep); }
function safeFile(root: string, relative: string): string | null {
  if (relative.split('/').some(part => !part || part === '.' || part === '..' || part.startsWith('.'))) return null;
  const boundary = roots.find(r => relative.startsWith(`${r}/`));
  if (!boundary) return null;
  try {
    const repo = realpathSync(root); const approved = realpathSync(path.join(root, boundary)); const real = realpathSync(path.join(root, relative));
    return inside(repo, approved) && inside(approved, real) && statSync(real).isFile() ? real : null;
  } catch { return null; }
}
function scan(root: string, relative: string): string[] {
  const directory = path.join(root, relative);
  if (!existsSync(directory)) return [];
  if (!inside(realpathSync(root), realpathSync(directory))) return [];
  const found: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name.startsWith('.') || entry.name === '__pycache__' || entry.isSymbolicLink()) continue;
    const p = `${relative}/${entry.name}`;
    if (entry.isDirectory()) found.push(...scan(root, p)); else if (entry.isFile()) found.push(p);
  }
  return found;
}
function json(root: string, relative: string, required = false): Metadata {
  const p = safeFile(root, relative); if (!p) return {};
  try {
    const data: unknown = JSON.parse(readFileSync(p, 'utf8'));
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('expected an object');
    return data as Metadata;
  } catch (error) {
    if (required) throw new Error(`Invalid avatar metadata ${relative}: ${String(error)}`);
    return {};
  }
}
function category(id: string): CatalogCategory { return id.startsWith('T') ? 'tops' : id.startsWith('B') ? 'bottoms' : id.startsWith('F') ? 'footwear' : id.startsWith('A') ? 'accessories' : 'characters'; }
function baseFor(id: string): CatalogBase { return ['H02', 'H03', 'H05'].includes(id) ? 'female' : 'male'; }
function role(relative: string): CatalogSource['role'] { return relative.endsWith('.glb') ? 'model' : relative.endsWith('.blend') ? 'blend' : /\.(py|mjs|js|ts)$/.test(relative) ? 'script' : /progress|manifest|prompts/.test(relative) ? 'metadata' : 'report'; }

export function buildCatalogLibraryManifest(root: string): CatalogLibraryManifest {
  const files = [...scan(root, 'assets/avatar'), ...scan(root, 'public/avatar'), ...scan(root, 'tools/blender/catalog'), ...scan(root, 'tools/avatar')];
  const progressPath = `${catalogRoot}/catalog-progress.json`;
  if (existsSync(path.join(root, progressPath)) && !safeFile(root, progressPath)) throw new Error(`Unsafe avatar metadata ${progressPath}: file escapes the approved avatar root`);
  const progress = json(root, progressPath, true);
  const pieces = progress.pieces ?? [];
  if (!Array.isArray(pieces) || pieces.some(p => typeof object(p).id !== 'string' || typeof object(p).stage !== 'string')) throw new Error(`Invalid avatar metadata ${progressPath}: pieces require id and stage`);
  for (const key of ['accepted_ids', 'fit_verified_ids']) if (progress[key] !== undefined && (!Array.isArray(progress[key]) || strings(progress[key]).length !== (progress[key] as unknown[]).length)) throw new Error(`Invalid avatar metadata ${progressPath}: ${key} must be a string array`);
  const accepted = new Set(strings(progress.accepted_ids)); const fit = new Set(strings(progress.fit_verified_ids));
  const assets: CatalogLibraryAsset[] = [];
  const sources = (paths: string[]): CatalogSource[] => [...new Set(paths)].filter(p => isSource(p) && safeFile(root, p)).sort().map(p => ({ path: p, label: path.basename(p), role: role(p), url: fileUrl(p) }));
  const neighbors = (relative: string) => files.filter(p => path.posix.dirname(p) === path.posix.dirname(relative) && sourcePattern.test(p));
  const referencedPaths = (data: unknown): string[] => {
    if (typeof data === 'string') {
      const candidate = data.startsWith('artifacts/') ? data : slash(path.posix.normalize(`${catalogRoot}/${data}`));
      return safeFile(root, candidate) && sourcePattern.test(candidate) ? [candidate] : [];
    }
    if (Array.isArray(data)) return data.flatMap(referencedPaths);
    return Object.values(object(data)).flatMap(referencedPaths);
  };
  const commonSources = [progressPath, ...files.filter(p => p.startsWith('tools/blender/catalog/') && /prepare_catalog_body|prepare_catalog_motion|assemble_catalog_outfit/.test(p))];
  const referenceMetadata = new Map<string, { label?: string; prompt?: string; ids: string[]; manifest: string }>();
  for (const manifest of files.filter(p => p.startsWith('assets/avatar/concepts/') && p.endsWith('.json'))) {
    const data = json(root, manifest); const directory = path.posix.dirname(manifest);
    const rows: unknown[] = [...(Array.isArray(data.boards) ? data.boards : []), ...(Array.isArray(data.sheets) ? data.sheets : []), ...(Array.isArray(data.outputs) ? data.outputs : []), ...(Array.isArray(data.images) ? data.images : []), object(data.base)];
    for (const row of rows) {
      const meta = object(row); const name = typeof meta.file === 'string' ? meta.file : typeof meta.output === 'string' ? meta.output : undefined;
      if (!name || !imagePattern.test(name)) continue;
      const relative = path.posix.normalize(`${directory}/${name}`);
      if (!safeFile(root, relative)) continue;
      const previous = referenceMetadata.get(relative);
      const text = [meta.id, meta.title, meta.prompt, ...strings(meta.items)].filter(v => typeof v === 'string').join(' ');
      referenceMetadata.set(relative, { label: typeof meta.title === 'string' ? meta.title : previous?.label, prompt: typeof meta.prompt === 'string' ? meta.prompt : previous?.prompt, ids: [...new Set([...(previous?.ids ?? []), ...(text.match(/\b[TBFAH]\d{2}\b/g) ?? [])])], manifest });
    }
  }
  const references = files.filter(p => p.startsWith('assets/avatar/concepts/') && imagePattern.test(p) && !p.includes('/review/')).map(p => {
    const meta = referenceMetadata.get(p); const female = /female/i.test(p); const history = /\/(drafts?|rejected[^/]*|history)\//i.test(p);
    const ref: CatalogReference = { id: `reference:${p}`, label: meta?.label ?? path.basename(p, path.extname(p)).replace(/[-_]/g, ' '), url: fileUrl(p), thumbnailUrl: thumbnailUrl(p), ...(meta?.prompt ? { prompt: meta.prompt } : {}) };
    assets.push({ id: ref.id, label: ref.label, category: 'references', base: female ? 'female' : p.includes('/catalog-a/') ? 'male' : 'unspecified', status: 'reference', statusDetail: female ? 'Female 2D reference; female 3D foundation and fitted catalog pending' : history ? 'Earlier concept reference' : '2D design reference; no model implied', fitVerified: false, accepted: false, history, references: [ref], previewUrl: ref.thumbnailUrl, sources: sources([p, ...(meta ? [meta.manifest] : []), ...neighbors(p)]) });
    return { ref, female, history, ids: meta?.ids ?? [] };
  });
  const matchingRefs = (id: string, female: boolean) => references.filter(r => !r.history && r.female === female && r.ids.includes(id)).map(r => r.ref);
  const preview = buildCatalogPreviewManifest(root);
  const currentModels = new Set(preview.entries.flatMap(e => [e.modelUrl, ...(e.garmentUrl ? [e.garmentUrl] : [])]).map(url => `${catalogRoot}/${url.slice(`${prefix}assets/`.length)}`));
  const animationPaths = new Set(Object.values(preview.animations).map(url => `${catalogRoot}/${url.slice(`${prefix}assets/`.length)}`));
  animationPaths.forEach(relative => currentModels.add(relative));
  const modelPaths = (model: CatalogPreviewEntry) => [model.modelUrl, ...(model.garmentUrl ? [model.garmentUrl] : [])].map(url => `${catalogRoot}/${url.slice(`${prefix}assets/`.length)}`);
  for (const raw of pieces) {
    const piece = object(raw); const id = piece.id as string; const detail = piece.stage as string;
    const model = preview.entries.find(e => e.id === id); const repair = /repair|contamination/i.test(detail);
    const fitVerified = !repair && (fit.has(id) || (progress.fit_verified_ids === undefined && /fit-verified/i.test(detail)));
    const refs = matchingRefs(id, false);
    const ownFiles = files.filter(p => p.startsWith(`${catalogRoot}/${id}/`) && path.posix.dirname(p) === `${catalogRoot}/${id}`);
    const scripts = files.filter(p => p.startsWith('tools/') && (new RegExp(`(?:_|-)${id.toLowerCase()}(?:\\.|_|-)`, 'i').test(path.basename(p)) || (id === 'H01' && /build_catalog_head(?:\.|_)/.test(path.basename(p)))));
    assets.push({ id, label: `${id} · ${names[id] ?? id}`, category: category(id), base: baseFor(id), status: repair ? 'repair-needed' : accepted.has(id) ? 'accepted' : fitVerified ? 'fit-verified' : model ? 'candidate' : 'pending', statusDetail: detail, fitVerified, accepted: accepted.has(id), history: false, references: refs, previewUrl: refs[0]?.thumbnailUrl, sources: sources([...commonSources, ...ownFiles, ...scripts, ...referencedPaths(piece)]), ...(model ? { model, supportsGait: model.kind !== 'head' } : {}) });
  }
  const female = object(progress.female_phase);
  if (Object.keys(female).length) {
    const ids = strings(female.wardrobe_ids);
    for (const id of ['body', ...ids]) {
      const refs = id === 'body' ? references.filter(r => r.female && !r.history).map(r => r.ref) : matchingRefs(id, true);
      assets.push({ id: `female-${id}`, label: id === 'body' ? 'Female foundation' : `${id} · ${names[id] ?? id} · female fit`, category: id === 'body' ? 'characters' : category(id), base: 'female', status: 'pending', statusDetail: typeof female.stage === 'string' ? female.stage : 'Female 2D references available; fitted 3D model pending', fitVerified: false, accepted: false, history: false, references: refs, previewUrl: refs[0]?.thumbnailUrl, sources: sources([progressPath, ...referencedPaths(female)]) });
    }
  }
  // Explicit studies connect reproducible isolated exports to reference IDs.
  // They remain candidates; compatibility enables gait but never implies acceptance.
  const studies = progress.model_studies ?? [];
  if (!Array.isArray(studies) || studies.some(value => ['id', 'label', 'path', 'model', 'stage'].some(key => typeof object(value)[key] !== 'string'))) throw new Error(`Invalid avatar metadata ${progressPath}: model_studies require id, label, path, model and stage`);
  for (const value of studies) {
    const study = object(value); const id = study.id as string;
    const directory = path.posix.normalize(`${catalogRoot}/${study.path}`);
    const relative = path.posix.normalize(`${directory}/${study.model}`);
    if (!directory.startsWith(`${catalogRoot}/`) || !relative.startsWith(`${directory}/`) || !relative.endsWith('.glb') || !files.includes(relative) || !safeFile(root, relative) || assets.some(asset => asset.id === id)) continue;
    const base: CatalogBase = ['male', 'female', 'shared'].includes(String(study.base)) ? study.base as CatalogBase : 'unspecified';
    const head = study.kind === 'head'; const gait = !head && study.gait_compatible === true;
    const refs = [...new Map(strings(study.reference_ids).flatMap(referenceId => matchingRefs(referenceId, base === 'female')).map(reference => [reference.id, reference])).values()];
    const detail = study.stage as string;
    const model: CatalogPreviewEntry = { id, label: study.label as string, kind: head ? 'head' : 'study', status: detail, modelUrl: fileUrl(relative) };
    const builder = typeof study.builder === 'string' && study.builder.startsWith('tools/') ? [study.builder] : [];
    assets.push({ id, label: model.label, category: head ? 'characters' : 'studies', base, status: study.repair_needed === true ? 'repair-needed' : 'candidate', statusDetail: detail, fitVerified: false, accepted: false, history: study.history === true, references: refs, previewUrl: refs[0]?.thumbnailUrl, sources: sources([progressPath, ...files.filter(file => file.startsWith(`${directory}/`) && sourcePattern.test(file)), ...builder]), model, supportsGait: gait });
    currentModels.add(relative);
  }
  for (const model of preview.entries.filter(e => !assets.some(a => a.id === e.id))) {
    const paths = modelPaths(model); const repair = /repair|contamination/i.test(model.status);
    const refs = model.kind === 'head' || model.id === 'study-h01-reference-a' ? matchingRefs('H01', false) : model.id === 'body' ? references.filter(r => !r.female && /character/i.test(r.ref.label)).map(r => r.ref) : [...new Set(model.label.match(/\b[TBFAH]\d{2}\b/g) ?? [])].flatMap(id => matchingRefs(id, false));
    assets.push({ id: model.id, label: model.label, category: model.kind === 'outfit' ? 'outfits' : model.kind === 'study' ? 'studies' : 'characters', base: model.kind === 'body' ? 'shared' : 'male', status: repair ? 'repair-needed' : 'candidate', statusDetail: model.status, fitVerified: false, accepted: false, history: /superseded|earlier boot outfit/i.test(model.status), references: [...new Map(refs.map(ref => [ref.id, ref])).values()], previewUrl: refs[0]?.thumbnailUrl, model, supportsGait: model.kind !== 'head', sources: sources([...commonSources, ...paths, ...paths.flatMap(neighbors), ...files.filter(p => p.startsWith('tools/blender/catalog/') && /build_catalog_head_style_study/.test(p) && /head|h01/.test(model.id)), ...referencedPaths(progress[model.id === 'study-f04' ? 'F04_core_outfit_study' : 'H01_style_study'])]) });
  }
  for (const relative of files.filter(p => p.endsWith('.glb') && (!currentModels.has(p) || animationPaths.has(p)))) {
    const runtime = relative.startsWith('public/avatar/'); const animation = /walk|run|idle|jump|animation/i.test(path.basename(relative));
    const history = !runtime && !animationPaths.has(relative) && (/\/(?:[^/]*revisions|rejected[^/]*|drafts?|history)\//i.test(relative) || (relative.startsWith(`${catalogRoot}/`) && !/\/([TBFAH]\d{2})\/(?:body-)?\1\.glb$/.test(relative)));
    const model: CatalogPreviewEntry = { id: `file:${relative}`, label: path.basename(relative, '.glb'), kind: 'head', status: runtime ? 'Runtime export' : history ? 'Historical export; current fitting/acceptance not implied' : 'Discovered export; fitting/acceptance not implied', modelUrl: fileUrl(relative) };
    const clip: 'walk' | 'run' | undefined = animationPaths.has(relative) ? relative.endsWith('-walk.glb') ? 'walk' : relative.endsWith('-run.glb') ? 'run' : undefined : undefined;
    const body = preview.entries.find(entry => entry.id === 'body');
    if (clip && body) { model.kind = 'body'; model.modelUrl = body.modelUrl; }
    const images = files.filter(p => path.posix.dirname(p) === path.posix.dirname(relative) && imagePattern.test(p)).map(p => ({ id: `reference:${p}`, label: path.basename(p), url: fileUrl(p), thumbnailUrl: thumbnailUrl(p) }));
    assets.push({ id: model.id, label: model.label, category: animation ? 'animations' : /outfit/i.test(relative) ? 'outfits' : /head|\/H\d{2}\//.test(relative) ? 'characters' : 'studies', base: animationPaths.has(relative) ? 'shared' : /female/i.test(relative) ? 'female' : /male/i.test(relative) ? 'male' : 'unspecified', status: runtime ? 'runtime' : 'candidate', statusDetail: model.status, fitVerified: false, accepted: false, history, references: images, previewUrl: images[0]?.thumbnailUrl, model, supportsGait: Boolean(clip && body), ...(clip ? { animation: clip } : {}), sources: sources([relative, ...neighbors(relative)]) });
  }
  // Prefer known captures for model cards, retaining the original design sheets
  // as inspector references. Captures are explicit inventory entries, not a
  // generic request path into the verification directory.
  for (const asset of assets.filter(a => a.model)) {
    const model = asset.model!;
    const modelRelative = model.modelUrl.startsWith(`${prefix}assets/`) ? `${catalogRoot}/${model.modelUrl.slice(`${prefix}assets/`.length)}` : decodeURIComponent(model.modelUrl.slice(`${prefix}files/`.length));
    const parent = path.posix.dirname(modelRelative);
    const styleCaptures = files.filter(p => p.startsWith(`${catalogRoot}/style-review/`) && path.posix.basename(p) === `${asset.id}-front-review.png`).sort().reverse();
    const captures = [`${parent}/rest-front-review.png`, `${parent}/front-review.png`, `${parent}/three-quarter-review.png`, `artifacts/verification/avatar-catalog/${asset.id}/rest-front-review.png`, `artifacts/verification/avatar-catalog/${asset.id}/front-review.png`, ...styleCaptures];
    const capture = captures.find(p => safeFile(root, p));
    if (capture) asset.previewUrl = thumbnailUrl(capture);
  }
  assets.sort((a, b) => Number(a.history) - Number(b.history) || a.id.localeCompare(b.id));
  let items: CatalogItem[] = [];
  if (existsSync(path.join(root, catalogIndexPath))) {
    if (!safeFile(root, catalogIndexPath)) throw new Error(`Unsafe avatar metadata ${catalogIndexPath}`);
    items = hydrateCatalogIndex(json(root, catalogIndexPath, true), assets, relative => safeFile(root, relative), fileUrl, thumbnailUrl, sources);
  }
  const itemReferences = catalogItemReferences(items);
  const revisionAssets = catalogItemAssets(items);
  const linkedFiles = new Set([...assets, ...revisionAssets].flatMap(a => [...a.sources.map(s => s.path), ...a.references.map(r => decodeURIComponent(r.url.slice(`${prefix}files/`.length))), ...(a.previewUrl ? [decodeURIComponent(a.previewUrl.slice(`${prefix}thumbs/`.length))] : [])]));
  for (const reference of itemReferences) { linkedFiles.add(decodeURIComponent(reference.url.slice(`${prefix}files/`.length))); if (reference.provenance) linkedFiles.add(reference.provenance.sourcePath); }
  if (items.length) linkedFiles.add(catalogIndexPath);
  for (const relative of currentModels) if (safeFile(root, relative)) linkedFiles.add(relative);
  const stamped = (url: string) => {
    const relative = url.startsWith(`${prefix}assets/`) ? `${catalogRoot}/${url.slice(`${prefix}assets/`.length)}` : decodeURIComponent(url.replace(/^\/__avatar_catalog\/(?:files|thumbs)\//, ''));
    const real = safeFile(root, relative); if (!real) return url;
    const stat = statSync(real); const stamp = createHash('sha256').update(`${stat.mtimeMs}:${stat.ctimeMs}:${stat.size}`).digest('hex').slice(0, 12);
    return `${url}?v=${stamp}`;
  };
  for (const reference of itemReferences) { reference.url = stamped(reference.url); reference.thumbnailUrl = stamped(reference.thumbnailUrl); if (reference.provenance) reference.provenance.sourceUrl = stamped(reference.provenance.sourceUrl); }
  for (const asset of [...assets, ...revisionAssets]) {
    asset.references = asset.references.map(r => ({ ...r, url: stamped(r.url), thumbnailUrl: stamped(r.thumbnailUrl) }));
    asset.sources = asset.sources.map(source => ({ ...source, url: stamped(source.url) }));
    if (asset.previewUrl) asset.previewUrl = stamped(asset.previewUrl);
    if (asset.model) asset.model = { ...asset.model, modelUrl: stamped(asset.model.modelUrl), ...(asset.model.garmentUrl ? { garmentUrl: stamped(asset.model.garmentUrl) } : {}) };
  }
  const animations = { walk: stamped(preview.animations.walk), run: stamped(preview.animations.run) };
  const revision = createHash('sha256').update(JSON.stringify({ assets, items, animations }));
  for (const relative of [...linkedFiles].sort()) {
    const real = safeFile(root, relative); if (!real) continue; const stat = statSync(real); revision.update(`${relative}:${stat.size}:${stat.mtimeMs}:${stat.ctimeMs}`);
  }
  return { version: revision.digest('hex').slice(0, 24), generatedAt: new Date().toISOString(), assets, items, animations };
}

function pathname(url: string): string | null {
  try { return new URL(url, 'http://localhost').pathname; } catch { return null; }
}
export function resolveCatalogLibraryFile(root: string, url: string, manifest = buildCatalogLibraryManifest(root)): string | null {
  const request = pathname(url);
  if (!request?.startsWith(`${prefix}files/`)) return null;
  const allowed = [...catalogItemReferences(manifest.items ?? []).flatMap(r => [r.url, ...(r.provenance ? [r.provenance.sourceUrl] : [])]), ...[...manifest.assets, ...catalogItemAssets(manifest.items ?? [])].flatMap(a => [...a.sources.map(s => s.url), ...a.references.map(r => r.url), ...(a.previewUrl ? [a.previewUrl.replace(`${prefix}thumbs/`, `${prefix}files/`)] : []), ...(a.model ? [a.model.modelUrl, ...(a.model.garmentUrl ? [a.model.garmentUrl] : [])] : [])])];
  if (!allowed.some(candidate => pathname(candidate) === request)) return null;
  try { return safeFile(root, decodeURIComponent(request.slice(`${prefix}files/`.length))); } catch { return null; }
}
export function resolveCatalogLibraryThumbnail(root: string, url: string, manifest = buildCatalogLibraryManifest(root)): string | null {
  const request = pathname(url);
  const allowed = [...catalogItemReferences(manifest.items ?? []).map(r => r.thumbnailUrl), ...[...manifest.assets, ...catalogItemAssets(manifest.items ?? [])].flatMap(a => [...a.references.map(r => r.thumbnailUrl), ...(a.previewUrl ? [a.previewUrl] : [])])];
  return request?.startsWith(`${prefix}thumbs/`) && allowed.some(candidate => pathname(candidate) === request) ? resolveCatalogLibraryFile(root, request.replace(`${prefix}thumbs/`, `${prefix}files/`), manifest) : null;
}
