import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { publishBearCompanion } from './publish_bear_companion.mjs';

const base = 'assets/avatar/catalog-a/companions/bear-v1';
const manifestPath = 'src/avatar/companions/bear-v1.json';
const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const roots: string[] = [];
class BlobNotFoundError extends Error {}

async function fixture() {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'publish-bear-'));
  roots.push(rootDir);
  const write = async (file: string, bytes: string | Buffer) => {
    await mkdir(path.dirname(path.join(rootDir, file)), { recursive: true });
    await writeFile(path.join(rootDir, file), bytes);
  };
  const json = Buffer.from(JSON.stringify({ asset: { version: '2.0' }, animations: [{ name: 'celebrate' }] }).padEnd(128, ' '));
  const model = Buffer.alloc(20 + json.length);
  model.writeUInt32LE(0x46546c67, 0); model.writeUInt32LE(2, 4); model.writeUInt32LE(model.length, 8);
  model.writeUInt32LE(json.length, 12); model.writeUInt32LE(0x4e4f534a, 16); json.copy(model, 20);
  const sha = hash(model), sourceSha = hash('native bear'), stillSha = hash('still');
  await write(`${base}/outfit-lod.glb`, model);
  await write(`${base}/outfit-lod.blend`, 'native bear');
  await write(`${base}/bear-still.png`, 'still');
  await write('src/avatar/companions/bear-still.png', 'still');
  const reports = {
    native: { status: 'passed', blend: `${base}/outfit-lod.blend`, blend_sha256: sourceSha,
      profile: 'native-dance-contacts', sample_count: 169, runtime_samples_sha256: hash('samples') },
    structure: { status: 'passed', glb: `${base}/outfit-lod.glb`, glb_sha256: sha,
      blend_sha256: sourceSha, errors: [] },
    gltf: { asset: `${base}/outfit-lod.glb`, glb_sha256: sha, bytes: model.length, errors: 0, warnings: 0 },
    runtime: { status: 'passed', glb: `${base}/outfit-lod.glb`, glb_sha256: sha, clip: 'celebrate', duration: 1.399999976,
      triangles: 93127, gzip_bytes: 1673364, substeps: 4, frame_count: 169, source_samples_sha256: hash('samples'),
      maximum_motion_m: .12, frames: Array.from({ length: 169 }, (_, frame) => ({ frame: frame / 4, seconds: frame / 120 })) },
    browser: { status: 'passed', glb: `${base}/outfit-lod.glb`, glb_sha256: sha, moving: true,
      results: Array.from({ length: 30 }, (_, i) => ({ label: `pose-${i}`, framed: true, source_sha256: sha,
        errors: [] as string[], failed: [] as string[], completed_gets: [sha] })) },
  };
  const names = { native: 'native-dance-report', structure: 'structure-material-report', gltf: 'gltf-validation', runtime: 'runtime-report', browser: 'browser-report' };
  const checks = Object.fromEntries(await Promise.all(Object.entries(reports).map(async ([name, report]) => {
    const file = `${base}/${names[name as keyof typeof names]}.json`, text = JSON.stringify(report);
    await write(file, text);
    return [name, { path: file, sha256: hash(text) }];
  })));
  const summary = {
    schemaVersion: 1, id: 'bear-v1', candidate: {
      model: { path: `${base}/outfit-lod.glb`, sha256: sha, bytes: model.length },
      source: { path: `${base}/outfit-lod.blend`, sha256: sourceSha },
      still: { sourcePath: `${base}/bear-still.png`, bundledPath: 'src/avatar/companions/bear-still.png', sha256: stillSha },
    }, animation: { name: 'celebrate', durationMs: 1400 }, technical: { status: 'passed', checks },
    artReview: { status: 'approved', approvedModelSha256: sha as string | null, date: '2026-10-20' as string | null },
    storage: { private: 'stored' },
  };
  const saveSummary = () => write(`${base}/verification-summary.json`, JSON.stringify(summary));
  const saveReport = async (name: keyof typeof reports) => {
    const text = JSON.stringify(reports[name]);
    await write(checks[name].path, text);
    checks[name].sha256 = hash(text);
  };
  await saveSummary();
  const previous = '{"accepted":false,"modelUrl":null}\n';
  await write(manifestPath, previous);
  const url = `https://teststore.public.blob.vercel-storage.com/avatars/bear-v1/${sha}.glb`;
  const put = vi.fn(async () => ({ url }));
  const head = vi.fn<() => Promise<{ url: string }>>(async () => { throw new BlobNotFoundError(); });
  const loadBlobSdk = vi.fn(async () => ({ put, head, BlobNotFoundError }));
  const fetchImpl = vi.fn(async () => new Response(model, { status: 200 }));
  const options = { rootDir, env: { BLOB_READ_WRITE_TOKEN: 'test-upload-only-token' }, loadBlobSdk, fetchImpl };
  const manifest = () => readFile(path.join(rootDir, manifestPath), 'utf8');
  return { options, summary, saveSummary, saveReport, reports, put, head, loadBlobSdk, fetchImpl, model, sha, url, write, manifest, previous };
}

afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });

describe('bear publication', () => {
  it.each(['stale model hash', 'different byte count'] as const)('rejects glTF proof with %s even when its report hash is current', async reason => {
    const f = await fixture();
    if (reason === 'stale model hash') f.reports.gltf.glb_sha256 = hash('other model');
    else f.reports.gltf.bytes = f.model.length + 1;
    await f.saveReport('gltf');
    await f.saveSummary();
    await expect(publishBearCompanion(f.options)).rejects.toThrow(/glTF/);
    expect(f.loadBlobSdk).not.toHaveBeenCalled();
    expect(await f.manifest()).toBe(f.previous);
  });
  it('uploads immutable approved bytes and commits the manifest only after verifying public download', async () => {
    const f = await fixture();
    f.fetchImpl.mockImplementationOnce(async () => {
      expect(await f.manifest()).toBe(f.previous);
      return new Response(f.model);
    });
    const result = await publishBearCompanion(f.options);
    expect(f.put).toHaveBeenCalledWith(`avatars/bear-v1/${f.sha}.glb`, f.model, {
      token: 'test-upload-only-token', access: 'public', addRandomSuffix: false, allowOverwrite: false,
      contentType: 'model/gltf-binary', cacheControlMaxAge: 31536000,
    });
    expect(f.fetchImpl).toHaveBeenCalledWith(f.url, expect.objectContaining({ redirect: 'error' }));
    expect(JSON.parse(await f.manifest())).toEqual({ schemaVersion: 1, id: 'bear-v1', accepted: true,
      modelUrl: f.url, sha256: f.sha, bytes: f.model.length, animationName: 'celebrate', durationMs: 1400 });
    expect(result).toEqual(JSON.parse(await f.manifest()));
  });

  it.each(['pending art', 'wrong art revision', 'missing approval date', 'failed technical', 'private storage pending', 'missing token'])('refuses %s before importing the upload SDK', async reason => {
    const f = await fixture();
    const messages: Record<string, RegExp> = {
      'pending art': /art approval/, 'wrong art revision': /art approval/, 'missing approval date': /art approval/,
      'failed technical': /Technical proof/, 'private storage pending': /Private source storage/, 'missing token': /BLOB_READ_WRITE_TOKEN/,
    };
    if (reason === 'pending art') f.summary.artReview.status = 'pending';
    if (reason === 'wrong art revision') f.summary.artReview.approvedModelSha256 = hash('concept B');
    if (reason === 'missing approval date') f.summary.artReview.date = null;
    if (reason === 'failed technical') f.summary.technical.status = 'failed';
    if (reason === 'private storage pending') f.summary.storage.private = 'pending';
    if (reason === 'missing token') f.options.env.BLOB_READ_WRITE_TOKEN = '';
    await f.saveSummary();
    await expect(publishBearCompanion(f.options)).rejects.toThrow(messages[reason]);
    expect(f.loadBlobSdk).not.toHaveBeenCalled();
    expect(await f.manifest()).toBe(f.previous);
  });

  it.each(['outfit-lod.glb', 'outfit-lod.blend', 'bear-still.png', 'runtime-report.json'])('rejects changed %s without network access', async file => {
    const f = await fixture();
    await f.write(`${base}/${file}`, 'changed after proof');
    await expect(publishBearCompanion(f.options)).rejects.toThrow(/hash|bytes/);
    expect(f.loadBlobSdk).not.toHaveBeenCalled();
    expect(await f.manifest()).toBe(f.previous);
  });

  it('rejects a bundled still that differs from the verified source still', async () => {
    const f = await fixture();
    await f.write('src/avatar/companions/bear-still.png', 'unrelated still');
    await expect(publishBearCompanion(f.options)).rejects.toThrow(/hash/);
    expect(f.loadBlobSdk).not.toHaveBeenCalled();
  });

  it.each(['native', 'structure', 'gltf', 'runtime', 'browser'] as const)('rejects a hash-valid but insufficient %s report', async name => {
    const f = await fixture();
    const content = JSON.stringify({ status: 'passed' });
    await f.write(f.summary.technical.checks[name].path, content);
    f.summary.technical.checks[name].sha256 = hash(content);
    await f.saveSummary();
    await expect(publishBearCompanion(f.options)).rejects.toThrow();
    expect(f.loadBlobSdk).not.toHaveBeenCalled();
    expect(await f.manifest()).toBe(f.previous);
  });

  it.each(['wrong GLB', 'long clip', 'over budget', 'gzip budget', 'nonfinite duration', 'missing frames', 'stale samples', 'browser errors', 'failed request', 'missing browser views', 'unframed', 'stale browser', 'stale source', 'gltf warnings', 'arbitrary report path'])('rejects %s even with current report hashes', async reason => {
    const f = await fixture();
    if (reason === 'wrong GLB') f.reports.runtime.glb_sha256 = hash('other');
    if (reason === 'long clip') f.reports.runtime.duration = 2;
    if (reason === 'over budget') f.reports.runtime.triangles = 95001;
    if (reason === 'gzip budget') f.reports.runtime.gzip_bytes = 2100001;
    if (reason === 'nonfinite duration') f.reports.runtime.duration = Number.NaN;
    if (reason === 'stale samples') f.reports.runtime.source_samples_sha256 = hash('stale samples');
    if (reason === 'missing frames') f.reports.runtime.frames = [];
    if (reason === 'browser errors') f.reports.browser.results[0].errors.push('WebGL failure');
    if (reason === 'failed request') f.reports.browser.results[0].failed.push('404');
    if (reason === 'missing browser views') f.reports.browser.results.pop();
    if (reason === 'unframed') f.reports.browser.results[0].framed = false;
    if (reason === 'stale browser') f.reports.browser.results[0].source_sha256 = hash('old');
    if (reason === 'stale source') f.reports.native.blend_sha256 = hash('old');
    if (reason === 'gltf warnings') f.reports.gltf.warnings = 1;
    await Promise.all((Object.keys(f.reports) as (keyof typeof f.reports)[]).map(f.saveReport));
    if (reason === 'arbitrary report path') {
      await f.write(`${base}/fake-report.json`, JSON.stringify(f.reports.native));
      f.summary.technical.checks.native.path = `${base}/fake-report.json`;
    }
    await f.saveSummary();
    await expect(publishBearCompanion(f.options)).rejects.toThrow();
    expect(f.loadBlobSdk).not.toHaveBeenCalled();
  });

  it('refuses bytes whose GLB does not contain exactly one celebrate animation', async () => {
    const f = await fixture();
    const bytes = Buffer.from(f.model);
    const json = JSON.parse(bytes.subarray(20).toString());
    json.animations[0].name = 'idle';
    bytes.write(JSON.stringify(json).padEnd(bytes.length - 20, ' '), 20);
    const sha = hash(bytes);
    await f.write(`${base}/outfit-lod.glb`, bytes);
    f.summary.candidate.model.sha256 = sha;
    f.summary.artReview.approvedModelSha256 = sha;
    await f.saveSummary();
    await expect(publishBearCompanion(f.options)).rejects.toThrow(/celebrate/);
    expect(f.loadBlobSdk).not.toHaveBeenCalled();
  });

  it('reuses an existing immutable object only after downloading and checking its hash', async () => {
    const f = await fixture();
    f.head.mockResolvedValue({ url: f.url });
    await publishBearCompanion(f.options);
    expect(f.head).toHaveBeenCalledWith(`avatars/bear-v1/${f.sha}.glb`, { token: 'test-upload-only-token' });
    expect(f.fetchImpl).toHaveBeenCalledOnce();
    expect(f.put).not.toHaveBeenCalled();
    expect(JSON.parse(await f.manifest()).modelUrl).toBe(f.url);
  });

  it.each(['lookup denied', 'upload denied', 'download rejected', 'download network failure', 'wrong download', 'unsafe URL', 'changed local proof', 'existing mismatch'])('leaves manifest unchanged after %s', async reason => {
    const f = await fixture();
    if (reason === 'lookup denied') f.head.mockRejectedValue(new Error('access denied'));
    if (reason === 'download network failure') f.fetchImpl.mockRejectedValue(new Error('network down'));
    if (reason === 'upload denied') f.put.mockRejectedValue(new Error('token test-upload-only-token rejected'));
    if (reason === 'download rejected') f.fetchImpl.mockResolvedValue(new Response('denied', { status: 403 }));
    if (reason === 'wrong download' || reason === 'existing mismatch') f.fetchImpl.mockResolvedValue(new Response('different model'));
    if (reason === 'unsafe URL') f.put.mockResolvedValue({ url: 'http://example.com/model.glb' });
    if (reason === 'changed local proof') f.fetchImpl.mockImplementationOnce(async () => {
      await f.write(`${base}/verification-summary.json`, '{}');
      return new Response(f.model);
    });
    if (reason === 'existing mismatch') f.head.mockResolvedValue({ url: f.url });
    await expect(publishBearCompanion(f.options)).rejects.toThrow();
    expect(await f.manifest()).toBe(f.previous);
  });

  it('rejects multiple animations even when one is celebrate', async () => {
    const f = await fixture();
    const content = JSON.stringify({ asset: { version: '2.0' }, animations: [{ name: 'celebrate' }, { name: 'idle' }] });
    const json = Buffer.from(content.padEnd(Math.ceil(content.length / 4) * 4, ' '));
    const model = Buffer.alloc(20 + json.length);
    model.writeUInt32LE(0x46546c67, 0); model.writeUInt32LE(2, 4); model.writeUInt32LE(model.length, 8);
    model.writeUInt32LE(json.length, 12); model.writeUInt32LE(0x4e4f534a, 16); json.copy(model, 20);
    f.summary.candidate.model.sha256 = hash(model);
    f.summary.candidate.model.bytes = model.length;
    await f.write(`${base}/outfit-lod.glb`, model);
    await f.saveSummary();
    await expect(publishBearCompanion(f.options)).rejects.toThrow(/exactly one celebrate/);
    expect(f.loadBlobSdk).not.toHaveBeenCalled();
  });

  it('does not disclose rejected upload credentials', async () => {
    const f = await fixture();
    f.put.mockRejectedValue(new Error('test-upload-only-token invalid'));
    await expect(publishBearCompanion(f.options)).rejects.toThrow('Blob upload failed; runtime manifest unchanged');
  });

  it('refuses CLI approval arguments', async () => {
    const cli = fileURLToPath(new URL('./publish_bear_companion.mjs', import.meta.url));
    await expect(promisify(execFile)(process.execPath, [cli, '--approve'], {
      env: { ...process.env, BLOB_READ_WRITE_TOKEN: '' },
    })).rejects.toMatchObject({ code: 1, stdout: '', stderr: expect.stringContaining('accepts no arguments') });
  });

});
