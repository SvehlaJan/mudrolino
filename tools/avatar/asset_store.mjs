// Keep the avatar 3D files (.blend sources, study and runtime .glb exports) out of git.
// They live in a private Cloudflare R2 bucket, content-addressed as sha256/<hash>; the
// committed manifest (assets/avatar/asset-manifest.json) maps each repo path to its hash
// and records relative symlinks, so any checkout can be restored and verified.
//
//   npm run assets:manifest   rebuild the manifest from the files on disk
//   npm run assets:verify     compare the files on disk with the manifest
//   npm run assets:push       upload objects the bucket lacks (--dry-run to preview)
//   npm run assets:pull       download missing or changed files (--prefix=path, --dry-run)
//
// Credentials come from the environment (.env): R2_ACCOUNT_ID, R2_ACCESS_KEY_ID,
// R2_SECRET_ACCESS_KEY and R2_BUCKET. Reports in git already pin many of these hashes.
// R2 speaks the S3 API; the three calls used here (list, put, get) are signed with
// SigV4 by hand, so the tool adds no dependency (the F02 proof pins package-lock.json).
import { createHash, createHmac } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, readlinkSync, renameSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/** @typedef {{ sha256: string, size: number }} AssetEntry */
/** @typedef {{ files: Record<string, AssetEntry>, links: Record<string, string> }} AssetState */
/** @typedef {AssetState & { schemaVersion: number, store: string }} AssetManifest */

export const MANIFEST_PATH = 'assets/avatar/asset-manifest.json';
export const ROOTS = ['assets/avatar'];
export const EXTENSIONS = ['.blend', '.glb', '.gltf', '.fbx', '.obj'];

export function objectKey(sha256) {
  if (!/^[0-9a-f]{64}$/.test(sha256)) throw new Error(`Not a SHA-256: ${sha256}`);
  return `sha256/${sha256}`;
}

/** @param {string | Buffer} data */
const sha256Hex = data => createHash('sha256').update(data).digest('hex');

/** @param {string} file */
export function sha256File(file) {
  return sha256Hex(readFileSync(file));
}

/**
 * Every 3D file under the roots: regular files with hash and size, symlinks with their target.
 * @param {string} repo
 * @param {string[]} [roots]
 * @returns {AssetState}
 */
export function collectAssets(repo, roots = ROOTS) {
  /** @type {Record<string, AssetEntry>} */
  const files = {};
  /** @type {Record<string, string>} */
  const links = {};
  /** @param {string} relative */
  const walk = relative => {
    for (const entry of readdirSync(path.join(repo, relative), { withFileTypes: true })) {
      const child = path.posix.join(relative, entry.name);
      if (entry.isDirectory()) walk(child);
      else if (EXTENSIONS.includes(path.extname(entry.name).toLowerCase())) {
        const absolute = path.join(repo, child);
        if (lstatSync(absolute).isSymbolicLink()) links[child] = readlinkSync(absolute);
        else files[child] = { sha256: sha256File(absolute), size: statSync(absolute).size };
      }
    }
  };
  for (const root of roots) if (existsSync(path.join(repo, root))) walk(root);
  return { files, links };
}

/** @template T @param {Record<string, T>} object @returns {Record<string, T>} */
const sorted = object => Object.fromEntries(Object.keys(object).sort().map(key => [key, object[key]]));

/** @param {AssetState} state @returns {AssetManifest} */
export function buildManifest({ files, links }) {
  return { schemaVersion: 1, store: 'sha256/<hash> in the R2 bucket named by R2_BUCKET', files: sorted(files), links: sorted(links) };
}

/**
 * Files the bucket must receive: one upload per distinct hash it does not hold yet.
 * @param {AssetManifest} manifest
 * @param {(sha256: string) => boolean} remoteHas
 */
export function planPush(manifest, remoteHas) {
  const uploads = new Map();
  for (const [file, { sha256, size }] of Object.entries(manifest.files)) {
    if (!remoteHas(sha256) && !uploads.has(sha256)) uploads.set(sha256, { file, sha256, size });
  }
  return [...uploads.values()];
}

/**
 * What to download (missing or changed) and which symlinks to (re)create under `prefix`.
 * @param {AssetManifest} manifest
 * @param {AssetState} local
 * @param {string} [prefix]
 */
export function planPull(manifest, local, prefix = '') {
  /** @param {string} file */
  const inScope = file => file.startsWith(prefix);
  const downloads = Object.entries(manifest.files)
    .filter(([file, entry]) => inScope(file) && local.files[file]?.sha256 !== entry.sha256)
    .map(([file, entry]) => ({ file, ...entry, reason: local.files[file] ? 'changed' : 'missing' }));
  const links = Object.entries(manifest.links).filter(([file, target]) => inScope(file) && local.links[file] !== target);
  return { downloads, links };
}

/**
 * Disk against manifest: missing and changed entries fail; unlisted files need a new manifest.
 * @param {AssetManifest} manifest
 * @param {AssetState} local
 */
export function compare(manifest, local) {
  const missing = Object.keys(manifest.files).filter(file => !local.files[file]);
  const changed = Object.keys(manifest.files).filter(file => local.files[file] && local.files[file].sha256 !== manifest.files[file].sha256);
  const unlisted = Object.keys(local.files).filter(file => !manifest.files[file]);
  const links = Object.keys(manifest.links).filter(file => local.links[file] !== manifest.links[file]);
  return { missing, changed, unlisted, links };
}

/** @param {string} value RFC 3986 encoding, as SigV4 requires. */
const encode = value => encodeURIComponent(value).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

/**
 * AWS Signature Version 4 headers for one request (path-style URL).
 * @param {{ method: string, host: string, path: string, query?: Record<string, string>, headers?: Record<string, string>,
 *   payloadHash: string, accessKeyId: string, secretAccessKey: string, region: string, date: Date }} request
 * @returns {Record<string, string>}
 */
export function signRequest({ method, host, path: requestPath, query = {}, headers = {}, payloadHash, accessKeyId, secretAccessKey, region, date }) {
  const amzDate = date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const day = amzDate.slice(0, 8);
  /** @type {Record<string, string>} */
  const signed = { host, 'x-amz-content-sha256': payloadHash, 'x-amz-date': amzDate };
  for (const [name, value] of Object.entries(headers)) signed[name.toLowerCase()] = value;
  const names = Object.keys(signed).sort();
  const canonicalQuery = Object.keys(query).sort().map(key => `${encode(key)}=${encode(query[key])}`).join('&');
  const canonicalPath = requestPath.split('/').map(encode).join('/');
  const canonical = [method, canonicalPath, canonicalQuery, names.map(name => `${name}:${signed[name].trim()}\n`).join(''), names.join(';'), payloadHash].join('\n');
  const scope = `${day}/${region}/s3/aws4_request`;
  /** @param {string | Buffer} key @param {string} data */
  const hmac = (key, data) => createHmac('sha256', key).update(data).digest();
  const signingKey = ['s3', 'aws4_request'].reduce(hmac, hmac(hmac(`AWS4${secretAccessKey}`, day), region));
  const signature = createHmac('sha256', signingKey).update(['AWS4-HMAC-SHA256', amzDate, scope, sha256Hex(canonical)].join('\n')).digest('hex');
  return { ...signed, authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${names.join(';')}, Signature=${signature}` };
}

function r2() {
  const missing = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET'].filter(name => !process.env[name]);
  if (missing.length) throw new Error(`Set ${missing.join(', ')} (see .env.example)`);
  const host = `${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, bucket = /** @type {string} */ (process.env.R2_BUCKET);
  /**
   * @param {string} method @param {string} key @param {{ query?: Record<string, string>, body?: Buffer, payloadHash?: string }} [options]
   */
  return async (method, key, { query = {}, body, payloadHash = sha256Hex('') } = {}) => {
    const requestPath = `/${bucket}${key ? `/${key}` : ''}`;
    const headers = signRequest({ method, host, path: requestPath, query, payloadHash, region: 'auto', date: new Date(),
      accessKeyId: /** @type {string} */ (process.env.R2_ACCESS_KEY_ID), secretAccessKey: /** @type {string} */ (process.env.R2_SECRET_ACCESS_KEY) });
    const search = new URLSearchParams(query).toString();
    const response = await fetch(`https://${host}${requestPath}${search ? `?${search}` : ''}`, { method, headers, body });
    if (!response.ok) throw new Error(`${method} ${key || bucket}: ${response.status} ${(await response.text()).slice(0, 200)}`);
    return response;
  };
}

/** @param {ReturnType<typeof r2>} request */
async function remoteKeys(request) {
  const keys = new Set();
  /** @type {string | undefined} */
  let token;
  do {
    /** @type {Record<string, string>} */
    const query = { 'list-type': '2', prefix: 'sha256/' };
    if (token) query['continuation-token'] = token;
    const xml = await (await request('GET', '', { query })).text();
    for (const match of xml.matchAll(/<Key>([^<]+)<\/Key>/g)) keys.add(match[1]);
    token = /<IsTruncated>true<\/IsTruncated>/.test(xml) ? xml.match(/<NextContinuationToken>([^<]+)<\/NextContinuationToken>/)?.[1] : undefined;
  } while (token);
  return keys;
}

/** @template T @param {T[]} items @param {number} size @param {(item: T) => Promise<void>} work */
async function inBatches(items, size, work) {
  for (let i = 0; i < items.length; i += size) await Promise.all(items.slice(i, i + size).map(work));
}

/** @param {number} bytes */
const megabytes = bytes => `${(bytes / 1e6).toFixed(1)} MB`;

/** @param {string[]} argv */
async function main(argv) {
  const [command, ...flags] = argv;
  const dryRun = flags.includes('--dry-run');
  const prefix = flags.find(flag => flag.startsWith('--prefix='))?.slice('--prefix='.length) ?? '';
  const repo = process.cwd();
  const readManifest = () => JSON.parse(readFileSync(path.join(repo, MANIFEST_PATH), 'utf8'));

  if (command === 'manifest') {
    const manifest = buildManifest(collectAssets(repo));
    writeFileSync(path.join(repo, MANIFEST_PATH), `${JSON.stringify(manifest, null, 2)}\n`);
    const total = Object.values(manifest.files).reduce((sum, entry) => sum + entry.size, 0);
    console.log(`${Object.keys(manifest.files).length} files (${megabytes(total)}), ${Object.keys(manifest.links).length} links -> ${MANIFEST_PATH}`);
  } else if (command === 'verify') {
    const result = compare(readManifest(), collectAssets(repo));
    console.log(JSON.stringify({ missing: result.missing.length, changed: result.changed.length, unlisted: result.unlisted.length, links: result.links.length }));
    for (const [label, list] of Object.entries(result)) for (const file of list.slice(0, 10)) console.log(`${label}: ${file}`);
    if (result.missing.length || result.changed.length || result.links.length) process.exitCode = 1;
  } else if (command === 'push') {
    const manifest = readManifest();
    const stale = compare(manifest, collectAssets(repo));
    if (stale.changed.length || stale.unlisted.length) throw new Error('Files on disk differ from the manifest; run `npm run assets:manifest` first');
    const request = r2();
    const have = await remoteKeys(request);
    const uploads = planPush(manifest, sha256 => have.has(objectKey(sha256)));
    console.log(`${uploads.length} objects to upload (${megabytes(uploads.reduce((sum, u) => sum + u.size, 0))}); ${have.size} already stored`);
    if (dryRun) return;
    let done = 0;
    await inBatches(uploads, 4, async ({ file, sha256 }) => {
      const body = readFileSync(path.join(repo, file));
      if (sha256Hex(body) !== sha256) throw new Error(`${file} changed since the manifest`);
      await request('PUT', objectKey(sha256), { body, payloadHash: sha256 });
      done += 1;
      if (done % 25 === 0 || done === uploads.length) console.log(`uploaded ${done}/${uploads.length}`);
    });
  } else if (command === 'pull') {
    const manifest = readManifest();
    const plan = planPull(manifest, collectAssets(repo), prefix);
    console.log(`${plan.downloads.length} files to download (${megabytes(plan.downloads.reduce((sum, d) => sum + d.size, 0))}), ${plan.links.length} links to create`);
    if (dryRun) return;
    const request = r2();
    let done = 0;
    await inBatches(plan.downloads, 4, async ({ file, sha256 }) => {
      const target = path.join(repo, file), partial = `${target}.download`;
      mkdirSync(path.dirname(target), { recursive: true });
      const body = Buffer.from(await (await request('GET', objectKey(sha256))).arrayBuffer());
      if (sha256Hex(body) !== sha256) throw new Error(`Hash mismatch for ${file}`);
      writeFileSync(partial, body);
      renameSync(partial, target);
      done += 1;
      if (done % 25 === 0 || done === plan.downloads.length) console.log(`downloaded ${done}/${plan.downloads.length}`);
    });
    for (const [file, link] of plan.links) {
      const target = path.join(repo, file);
      mkdirSync(path.dirname(target), { recursive: true });
      rmSync(target, { force: true });
      symlinkSync(link, target);
    }
  } else {
    console.log('Usage: asset_store.mjs manifest | verify | push [--dry-run] | pull [--prefix=path] [--dry-run]');
    process.exitCode = 2;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1; });
}
