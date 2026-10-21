#!/usr/bin/env node
// Upload tooling only. Never import this module from the application.
import { createHash, randomUUID } from 'node:crypto';
import { readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const candidateDir = 'assets/avatar/catalog-a/companions/bear-v1';
const manifestPath = 'src/avatar/companions/bear-v1.json';
const summaryPath = `${candidateDir}/verification-summary.json`;
const reportPaths = {
  native: `${candidateDir}/native-dance-report.json`,
  structure: `${candidateDir}/structure-material-report.json`,
  gltf: `${candidateDir}/gltf-validation.json`,
  runtime: `${candidateDir}/runtime-report.json`,
  browser: `${candidateDir}/browser-report.json`,
};
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const validHash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const requireProof = (condition, message) => { if (!condition) throw new Error(message); };
const positiveInteger = value => Number.isSafeInteger(value) && value > 0;
const near = (a, b, tolerance = .00001) => Number.isFinite(a) && Math.abs(a - b) <= tolerance;

function requireCelebrate(bytes) {
  requireProof(bytes.length >= 20 && bytes.readUInt32LE(0) === 0x46546c67
    && bytes.readUInt32LE(4) === 2 && bytes.readUInt32LE(8) === bytes.length
    && bytes.readUInt32LE(16) === 0x4e4f534a, 'Invalid GLB bytes');
  const end = 20 + bytes.readUInt32LE(12);
  requireProof(end <= bytes.length, 'Invalid GLB JSON bytes');
  const gltf = JSON.parse(bytes.subarray(20, end).toString('utf8'));
  requireProof(gltf.animations?.length === 1 && gltf.animations[0].name === 'celebrate',
    'GLB must contain exactly one celebrate animation');
}

async function validateLocalProof(rootDir) {
  // Retain exact snapshots so edits during a network operation also invalidate publication.
  const snapshots = new Map();
  const read = async file => {
    const bytes = await readFile(path.join(rootDir, file));
    snapshots.set(file, sha256(bytes));
    return bytes;
  };
  const checked = async (descriptor, expectedPath) => {
    requireProof(descriptor?.path === expectedPath && validHash(descriptor.sha256), `Invalid proof descriptor: ${expectedPath}`);
    const bytes = await read(expectedPath);
    requireProof(sha256(bytes) === descriptor.sha256, `Proof hash mismatch: ${expectedPath}`);
    return bytes;
  };
  const summary = JSON.parse(await read(summaryPath));
  requireProof(summary?.schemaVersion === 1 && summary.id === 'bear-v1', 'Invalid verification-summary schema');
  requireProof(summary.technical?.status === 'passed', 'Technical proof has not passed');
  const candidate = summary.candidate;
  const model = await checked(candidate?.model, `${candidateDir}/outfit-lod.glb`);
  requireProof(positiveInteger(candidate.model.bytes) && candidate.model.bytes === model.length, 'Model bytes differ from summary');
  requireCelebrate(model);
  await checked(candidate.source, `${candidateDir}/outfit-lod.blend`);
  requireProof(candidate.still?.sourcePath === `${candidateDir}/bear-still.png`
    && candidate.still?.bundledPath === 'src/avatar/companions/bear-still.png', 'Invalid still paths');
  await checked({ path: candidate.still.sourcePath, sha256: candidate.still.sha256 }, candidate.still.sourcePath);
  await checked({ path: candidate.still.bundledPath, sha256: candidate.still.sha256 }, candidate.still.bundledPath);
  requireProof(summary.animation?.name === 'celebrate' && summary.animation.durationMs === 1400, 'Invalid celebrate duration');

  const reports = {};
  for (const [name, file] of Object.entries(reportPaths)) {
    reports[name] = JSON.parse(await checked(summary.technical.checks?.[name], file));
  }
  const { native, structure, gltf, runtime, browser } = reports;
  const modelHash = candidate.model.sha256;
  requireProof(native.status === 'passed' && native.profile === 'native-dance-contacts'
    && native.blend === candidate.source.path && native.blend_sha256 === candidate.source.sha256
    && native.sample_count === 169 && validHash(native.runtime_samples_sha256), 'Native proof does not bind the current source and full dance');
  requireProof(structure.status === 'passed' && structure.glb === candidate.model.path && structure.glb_sha256 === modelHash
    && structure.blend_sha256 === candidate.source.sha256 && Array.isArray(structure.errors) && !structure.errors.length,
  'Structure proof does not bind the current candidate');
  requireProof(gltf.asset === candidate.model.path && gltf.glb_sha256 === modelHash
    && gltf.bytes === model.length && gltf.errors === 0 && gltf.warnings === 0,
  'glTF proof does not bind the current candidate or contains errors or warnings');
  requireProof(runtime.status === 'passed' && runtime.glb === candidate.model.path && runtime.glb_sha256 === modelHash
    && runtime.clip === 'celebrate' && near(runtime.duration, 1.4)
    && positiveInteger(runtime.triangles) && runtime.triangles <= 95000
    && positiveInteger(runtime.gzip_bytes) && runtime.gzip_bytes <= 2100000
    && runtime.substeps === 4 && runtime.frame_count === 169
    && runtime.source_samples_sha256 === native.runtime_samples_sha256
    && Number.isFinite(runtime.maximum_motion_m) && runtime.maximum_motion_m > 0
    && Array.isArray(runtime.frames) && runtime.frames.length === 169
    && runtime.frames.every((frame, index) => near(frame.frame, index / 4) && near(frame.seconds, index / 120)),
  'Runtime proof does not bind the current celebrate clip and full sampled motion');
  requireProof(browser.status === 'passed' && browser.glb === candidate.model.path && browser.glb_sha256 === modelHash
    && browser.moving === true && Array.isArray(browser.results) && browser.results.length === 30
    && browser.results.every(row => row.framed === true && row.source_sha256 === modelHash
      && Array.isArray(row.errors) && !row.errors.length && Array.isArray(row.failed) && !row.failed.length
      && Array.isArray(row.completed_gets) && row.completed_gets.length > 0
      && row.completed_gets.every(hash => hash === modelHash)), 'Browser proof is incomplete, stale or contains rendering failures');

  requireProof(summary.artReview?.status === 'approved' && summary.artReview.approvedModelSha256 === modelHash
    && typeof summary.artReview.date === 'string' && /^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(summary.artReview.date)
    && Number.isFinite(Date.parse(summary.artReview.date)), 'Exact model revision requires recorded user art approval');
  requireProof(summary.storage?.private === 'stored', 'Private source storage must be complete before public publication');
  return { model, modelHash, snapshots };
}

function checkedPublicUrl(value, pathname) {
  let url;
  try { url = new URL(value); } catch { throw new Error('Blob did not return a valid public URL'); }
  requireProof(url.protocol === 'https:' && /^[a-z0-9-]+\.public\.blob\.vercel-storage\.com$/.test(url.hostname)
    && !url.username && !url.password && !url.port && !url.search && !url.hash && url.pathname === `/${pathname}`,
  'Blob URL must identify the immutable public candidate path');
  return url.href;
}

/**
 * The publication tool needs only a URL from head/put, rather than every SDK
 * method and response field. Keeping that boundary explicit also lets tests use
 * honest offline implementations without pretending to be the entire SDK.
 * @typedef {{url: string}} PublicationBlob
 * @typedef {{
 *   head: (pathname: string, options: {token: string}) => Promise<PublicationBlob>,
 *   put: (pathname: string, body: Buffer, options: {
 *     token: string, access: 'public', addRandomSuffix: false, allowOverwrite: false,
 *     contentType: string, cacheControlMaxAge: number
 *   }) => Promise<PublicationBlob>,
 *   BlobNotFoundError: new () => Error
 * }} PublicationBlobSdk
 */

/**
 * Validate first, publish immutable bytes, verify a credential-free public GET, then
 * atomically replace the runtime manifest. SDK and fetch injection keeps tests offline.
 * Art approval is an evidence record in the summary, never a CLI switch.
 * @param {{
 *   rootDir?: string,
 *   env?: NodeJS.ProcessEnv,
 *   loadBlobSdk?: () => Promise<PublicationBlobSdk>,
 *   fetchImpl?: typeof fetch
 * }} [options]
 */
export async function publishBearCompanion({
  rootDir = fileURLToPath(new URL('../../', import.meta.url)),
  env = process.env,
  loadBlobSdk = () => import('@vercel/blob'),
  fetchImpl = globalThis.fetch,
} = {}) {
  const { model, modelHash, snapshots } = await validateLocalProof(rootDir);
  const token = env.BLOB_READ_WRITE_TOKEN;
  requireProof(typeof token === 'string' && token.trim().length > 0, 'BLOB_READ_WRITE_TOKEN is required for publication');
  const fullManifestPath = path.join(rootDir, manifestPath);
  const previousManifest = await readFile(fullManifestPath);
  const pathname = `avatars/bear-v1/${modelHash}.glb`;
  let sdk;
  try { sdk = await loadBlobSdk(); } catch { throw new Error('Upload SDK unavailable; install @vercel/blob as a development dependency'); }
  let blob;
  try {
    blob = await sdk.head(pathname, { token });
  } catch (error) {
    // Resolve existing immutable objects first. Only a typed 404 permits an upload;
    // access errors, unavailable stores and network failures leave the manifest intact.
    if (!sdk.BlobNotFoundError || !(error instanceof sdk.BlobNotFoundError)) {
      throw new Error('Immutable Blob lookup failed; runtime manifest unchanged');
    }
    try {
      blob = await sdk.put(pathname, model, {
        token, access: 'public', addRandomSuffix: false, allowOverwrite: false,
        contentType: 'model/gltf-binary', cacheControlMaxAge: 31536000,
      });
    } catch {
      // A competing publication can win between head and put. A later invocation
      // can reuse that object after full public-download verification.
      throw new Error('Blob upload failed; runtime manifest unchanged');
    }
  }
  const url = checkedPublicUrl(blob?.url, pathname);
  let response;
  try { response = await fetchImpl(url, { redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(60000) }); }
  catch { throw new Error('Public Blob download failed; runtime manifest unchanged'); }
  requireProof(response.ok, 'Public Blob download rejected; runtime manifest unchanged');
  const downloaded = Buffer.from(await response.arrayBuffer());
  requireProof(downloaded.length === model.length && sha256(downloaded) === modelHash,
    'Public Blob download hash/bytes mismatch; runtime manifest unchanged');
  for (const [file, expectedHash] of snapshots) {
    requireProof(sha256(await readFile(path.join(rootDir, file))) === expectedHash,
      `Local proof changed during publication: ${file}`);
  }
  requireProof((await readFile(fullManifestPath)).equals(previousManifest), 'Runtime manifest changed during publication');
  const manifest = {
    schemaVersion: 1, id: 'bear-v1', accepted: true, modelUrl: url, sha256: modelHash,
    bytes: model.length, animationName: 'celebrate', durationMs: 1400,
  };
  const temporaryPath = `${fullManifestPath}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporaryPath, `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' });
    await rename(temporaryPath, fullManifestPath);
  } finally {
    await unlink(temporaryPath).catch(error => { if (error.code !== 'ENOENT') throw error; });
  }
  return manifest;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    requireProof(process.argv.length === 2, 'This CLI accepts no arguments; approval must be recorded in verification-summary.json');
    console.log(JSON.stringify(await publishBearCompanion(), null, 2));
  } catch (error) {
    // Never print SDK errors or credential-bearing environment values.
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    console.error(token ? error.message.split(token).join('[redacted]') : error.message);
    process.exitCode = 1;
  }
}
