import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
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

const generatedBase = 'assets/avatar/catalog-a/companions/bear-v2';
const generatedBones = ['Head', 'Hips', 'LeftArm', 'LeftFoot', 'LeftForeArm', 'LeftHand', 'LeftLeg', 'LeftShoulder',
  'LeftToeBase', 'LeftUpLeg', 'RightArm', 'RightFoot', 'RightForeArm', 'RightHand', 'RightLeg', 'RightShoulder',
  'RightToeBase', 'RightUpLeg', 'Spine', 'Spine01', 'Spine02', 'head_end', 'headfront', 'neck'];
async function generatedFixture() {
  const f = await fixture();
  const modelPath = `${generatedBase}/revisions/celebration-v4/web-v1/model.glb`;
  const sourcePath = `${generatedBase}/revisions/celebration-v4/celebration.blend`;
  const stillPath = `${generatedBase}/revisions/celebration-v4/still-v2/bear-still.png`;
  const sourceSha = hash('generated native bear');
  await f.write(modelPath, f.model);
  await f.write(sourcePath, 'generated native bear');
  await f.write(stillPath, 'still');
  const contractPath = `${generatedBase}/revisions/celebration-v4/web-v1/runtime-contract.json`;
  const contract = { glbSha256: f.sha, boneNames: generatedBones, meshNames: ['Bear_fixed_outfit'], clipName: 'celebrate',
    durationSeconds: 1.4, maxTriangles: 95000, maxGzipBytes: 2100000, minMotionM: .02, maxFloorPenetrationM: .007,
    stationaryRootBone: 'Hips' };
  const contractText = JSON.stringify(contract);
  await f.write(contractPath, contractText);
  const reports = {
    native: { status: 'passed', blend: sourcePath, blend_sha256: sourceSha, glb: modelPath, glb_sha256: f.sha,
      samples_sha256: '', positions_sha256: hash('positions'), frame_count: 169, maximum_vertex_error_m: .000001,
      frames: Array.from({ length: 169 }, (_, i) => ({ frame: i / 4, maximum_vertex_error_m: .000001 })) },
    clearance: { status: 'passed', profile: 'generated-fixed-outfit-arm-clearance', blend: sourcePath,
      blend_sha256: sourceSha, frame_count: 169, maximum_new_arm_torso_leg_pairs: 0, source_bind_contacts: 48,
      frames: Array.from({ length: 169 }, (_, i) => ({ frame: i / 4, new_arm_torso_leg_pairs: 0 })) },
    optimization: { status: 'passed', output: modelPath, glb_sha256: f.sha, bytes: f.model.length, errors: 0, warnings: 0 },
    runtime: { status: 'passed', failures: [] as string[], glb: modelPath, glb_sha256: f.sha, clip: 'celebrate', duration: 1.399999976,
      contract: contractPath, contract_sha256: hash(contractText), thresholds: structuredClone(contract),
      bones: [...generatedBones].reverse(), meshes: [{ name: 'Bear_fixed_outfit' }], maximum_weight_error: .000001,
      triangles: 51311, bytes: f.model.length, gzip_bytes: 1909368, fps: 30, substeps: 4, frame_count: 169,
      positions_sha256: hash('positions'), maximum_skin_motion_m: .3, maximum_endpoint_error_m: .000001,
      maximum_endpoint_bone_matrix_error: .000001, maximum_root_xy_drift_m: .00000001, maximum_floor_penetration_m: 0,
      frames: Array.from({ length: 169 }, (_, i) => ({ frame: i / 4, seconds: i / 120 })) },
    browser: { ...f.reports.browser, glb: modelPath },
    still: { status: 'rendered', source: sourcePath, source_sha256: sourceSha, frame: 0, width: 352, height: 400,
      maximum_css_slot: [176, 200], minimum_pixel_ratio: 2, camera: { distance: 5.6 },
      reviews: { still: { path: stillPath, sha256: hash('still') } } },
  };
  const filenames = { native: 'native-runtime-parity', clearance: 'arm-clearance-audit', optimization: 'optimization-report',
    runtime: 'runtime-report', browser: 'browser-report', still: 'still-report' };
  const checks = Object.fromEntries(Object.entries(filenames).map(([name, file]) => [name,
    { path: `${generatedBase}/${file}.json`, sha256: '' }]));
  const summary = { schemaVersion: 2, id: 'bear-v2', profile: 'generated-fixed-outfit', candidate: {
    model: { path: modelPath, sha256: f.sha, bytes: f.model.length }, source: { path: sourcePath, sha256: sourceSha },
    still: { sourcePath: stillPath, bundledPath: 'src/avatar/companions/bear-still.png', sha256: hash('still') },
  }, animation: { name: 'celebrate', durationMs: 1400 }, technical: { status: 'passed', checks },
  artReview: { ...f.summary.artReview }, storage: { private: 'stored' } };
  const saveSummary = () => f.write(`${generatedBase}/verification-summary.json`, JSON.stringify(summary));
  const saveReports = async () => {
    // Rebind parity to the exact current runtime bytes, so threshold tests exercise their own gate.
    reports.native.samples_sha256 = hash(JSON.stringify(reports.runtime));
    for (const [name, report] of Object.entries(reports)) {
      const text = JSON.stringify(report);
      await f.write(checks[name].path, text);
      checks[name].sha256 = hash(text);
    }
    await saveSummary();
  };
  await saveReports();
  return { ...f, options: { ...f.options, candidateId: 'bear-v2' }, summary, reports, saveReports, saveSummary, checks, contract };
}

describe('generated fixed-outfit bear publication', () => {
  it('requires explicit selection and publishes under the existing product namespace after public verification', async () => {
    const f = await generatedFixture();
    await f.write(`${base}/verification-summary.json`, '{}');
    f.fetchImpl.mockImplementationOnce(async () => {
      expect(await f.manifest()).toBe(f.previous);
      return new Response(f.model);
    });
    const result = await publishBearCompanion(f.options);
    expect(result.id).toBe('bear-v1');
    expect(result.modelUrl).toBe(f.url);
    expect(f.put).toHaveBeenCalledWith(`avatars/bear-v1/${f.sha}.glb`, f.model,
      expect.objectContaining({ allowOverwrite: false, addRandomSuffix: false }));
    expect(JSON.parse(await f.manifest())).toEqual(result);
  });

  it('keeps bear-v1 as the default even when generated evidence exists', async () => {
    const f = await generatedFixture();
    await f.write(`${base}/verification-summary.json`, '{}');
    const { candidateId: _candidateId, ...options } = f.options;
    void _candidateId;
    await expect(publishBearCompanion(options)).rejects.toThrow(/schema/);
    expect(f.loadBlobSdk).not.toHaveBeenCalled();
  });

  it.each(['unknown', '', '../bear-v2'])('refuses candidate selection %j', async candidateId => {
    const f = await generatedFixture();
    await expect(publishBearCompanion({ ...f.options, candidateId })).rejects.toThrow(/candidate/);
    expect(f.loadBlobSdk).not.toHaveBeenCalled();
  });

  it.each(['schema', 'profile', 'id', 'pending art', 'wrong art', 'private pending', 'stale native source',
    'stale native model', 'native frames', 'native frame list', 'native error', 'native frame error', 'native frame time',
    'positions mismatch', 'stale clearance source', 'clearance profile', 'clearance frames', 'clearance frame list',
    'clearance contacts', 'clearance frame contacts', 'optimizer model', 'optimizer bytes', 'optimizer errors', 'optimizer warnings',
    'runtime model', 'runtime bytes', 'runtime duration', 'runtime clip', 'runtime triangles', 'runtime gzip', 'runtime substeps',
    'runtime count', 'runtime frame list', 'runtime frame time', 'runtime motion', 'runtime drift', 'runtime floor',
    'runtime endpoint', 'runtime bone endpoint', 'runtime failures', 'browser model', 'browser count', 'browser errors',
    'browser failed', 'browser stale GET', 'browser framing', 'still source', 'still image', 'still dimensions', 'still height', 'still density',
    'still CSS width', 'still CSS height', 'still CSS length', 'still CSS missing', 'still camera distance', 'still camera missing'])
  ('refuses hash-valid generated evidence with %s before network access', async reason => {
    const f = await generatedFixture();
    const { native, clearance, optimization, runtime, browser, still } = f.reports;
    if (reason === 'schema') f.summary.schemaVersion = 1;
    if (reason === 'profile') f.summary.profile = 'native-dance-contacts';
    if (reason === 'id') f.summary.id = 'bear-v1';
    if (reason === 'pending art') f.summary.artReview.status = 'pending';
    if (reason === 'wrong art') f.summary.artReview.approvedModelSha256 = hash('different revision');
    if (reason === 'private pending') f.summary.storage.private = 'pending';
    if (reason === 'stale native source') native.blend_sha256 = hash('stale');
    if (reason === 'stale native model') native.glb_sha256 = hash('stale');
    if (reason === 'native frames') native.frame_count = 168;
    if (reason === 'native frame list') native.frames.pop();
    if (reason === 'native error') native.maximum_vertex_error_m = .000031;
    if (reason === 'native frame error') native.frames[50].maximum_vertex_error_m = .000031;
    if (reason === 'native frame time') native.frames[50].frame = 0;
    if (reason === 'positions mismatch') native.positions_sha256 = hash('stale');
    if (reason === 'stale clearance source') clearance.blend_sha256 = hash('stale');
    if (reason === 'clearance profile') clearance.profile = 'native-dance-contacts';
    if (reason === 'clearance frames') clearance.frame_count = 168;
    if (reason === 'clearance frame list') clearance.frames.pop();
    if (reason === 'clearance contacts') clearance.maximum_new_arm_torso_leg_pairs = 1;
    if (reason === 'clearance frame contacts') clearance.frames[50].new_arm_torso_leg_pairs = 1;
    if (reason === 'optimizer model') optimization.glb_sha256 = hash('stale');
    if (reason === 'optimizer bytes') optimization.bytes++;
    if (reason === 'optimizer errors') optimization.errors = 1;
    if (reason === 'optimizer warnings') optimization.warnings = 1;
    if (reason === 'runtime model') runtime.glb_sha256 = hash('stale');
    if (reason === 'runtime bytes') runtime.bytes++;
    if (reason === 'runtime duration') runtime.duration = 2;
    if (reason === 'runtime clip') runtime.clip = 'idle';
    if (reason === 'runtime triangles') runtime.triangles = 95001;
    if (reason === 'runtime gzip') runtime.gzip_bytes = 2100001;
    if (reason === 'runtime substeps') runtime.substeps = 1;
    if (reason === 'runtime count') runtime.frame_count = 168;
    if (reason === 'runtime frame list') runtime.frames.pop();
    if (reason === 'runtime frame time') runtime.frames[50].seconds = 0;
    if (reason === 'runtime motion') runtime.maximum_skin_motion_m = .02;
    if (reason === 'runtime drift') runtime.maximum_root_xy_drift_m = .000011;
    if (reason === 'runtime floor') runtime.maximum_floor_penetration_m = .0071;
    if (reason === 'runtime endpoint') runtime.maximum_endpoint_error_m = .000011;
    if (reason === 'runtime bone endpoint') runtime.maximum_endpoint_bone_matrix_error = .000011;
    if (reason === 'runtime failures') runtime.failures.push('failed pose');
    if (reason === 'browser model') browser.glb_sha256 = hash('stale');
    if (reason === 'browser count') browser.results.pop();
    if (reason === 'browser errors') browser.results[0].errors.push('WebGL failure');
    if (reason === 'browser failed') browser.results[0].failed.push('404');
    if (reason === 'browser stale GET') browser.results[0].completed_gets = [hash('stale')];
    if (reason === 'browser framing') browser.results[0].framed = false;
    if (reason === 'still source') still.source_sha256 = hash('stale');
    if (reason === 'still image') still.reviews.still.sha256 = hash('stale');
    if (reason === 'still dimensions') still.width = 320;
    if (reason === 'still height') still.height = 368;
    if (reason === 'still density') still.minimum_pixel_ratio = 1;
    if (reason === 'still CSS width') still.maximum_css_slot[0] = 160;
    if (reason === 'still CSS height') still.maximum_css_slot[1] = 184;
    if (reason === 'still CSS length') still.maximum_css_slot.push(1);
    if (reason === 'still CSS missing') Reflect.deleteProperty(still, 'maximum_css_slot');
    if (reason === 'still camera distance') still.camera.distance = 6;
    if (reason === 'still camera missing') Reflect.deleteProperty(still, 'camera');
    await f.saveReports();
    await expect(publishBearCompanion(f.options)).rejects.toThrow();
    expect(f.loadBlobSdk).not.toHaveBeenCalled();
    expect(await f.manifest()).toBe(f.previous);
  });

  it('refuses native parity from a different runtime report even with current descriptor hashes', async () => {
    const f = await generatedFixture();
    f.reports.native.samples_sha256 = hash('stale samples');
    const text = JSON.stringify(f.reports.native);
    await f.write(f.checks.native.path, text);
    f.checks.native.sha256 = hash(text);
    await f.saveSummary();
    await expect(publishBearCompanion(f.options)).rejects.toThrow(/Native/);
    expect(f.loadBlobSdk).not.toHaveBeenCalled();
  });

  it.each(['contract bones', 'contract mesh', 'contract root', 'contract model', 'contract budget',
    'threshold bones', 'threshold root', 'threshold budget', 'actual bones', 'duplicate bone', 'actual mesh', 'extra mesh', 'weights'])
  ('refuses a generated runtime with %s', async reason => {
    const f = await generatedFixture();
    const { runtime } = f.reports;
    if (reason === 'contract bones') f.contract.boneNames = ['Root'];
    if (reason === 'contract mesh') f.contract.meshNames = ['Other'];
    if (reason === 'contract root') f.contract.stationaryRootBone = 'Root';
    if (reason === 'contract model') f.contract.glbSha256 = hash('different');
    if (reason === 'contract budget') f.contract.maxTriangles = 100000;
    if (reason === 'threshold bones') runtime.thresholds.boneNames = ['Root'];
    if (reason === 'threshold root') runtime.thresholds.stationaryRootBone = 'Root';
    if (reason === 'threshold budget') runtime.thresholds.maxTriangles = 100000;
    if (reason === 'actual bones') runtime.bones.pop();
    if (reason === 'duplicate bone') runtime.bones[0] = runtime.bones[1];
    if (reason === 'actual mesh') runtime.meshes[0].name = 'Other';
    if (reason === 'extra mesh') runtime.meshes.push({ name: 'Bear_fixed_outfit' });
    if (reason === 'weights') runtime.maximum_weight_error = .000011;
    const text = JSON.stringify(f.contract);
    await f.write(runtime.contract, text);
    runtime.contract_sha256 = hash(text);
    await f.saveReports();
    await expect(publishBearCompanion(f.options)).rejects.toThrow(/contract|Runtime/);
    expect(f.loadBlobSdk).not.toHaveBeenCalled();
  });

  it('refuses changed contract bytes even when the runtime report is current', async () => {
    const f = await generatedFixture();
    await f.write(f.reports.runtime.contract, '{}');
    await expect(publishBearCompanion(f.options)).rejects.toThrow(/hash/);
    expect(f.loadBlobSdk).not.toHaveBeenCalled();
  });

  it.each(['model', 'source', 'still', 'runtime'] as const)('refuses changed %s bytes', async name => {
    const f = await generatedFixture();
    const file = name === 'still' ? f.summary.candidate.still.sourcePath
      : name === 'runtime' ? f.checks.runtime.path : f.summary.candidate[name].path;
    await f.write(file, 'changed');
    await expect(publishBearCompanion(f.options)).rejects.toThrow(/hash/);
    expect(f.loadBlobSdk).not.toHaveBeenCalled();
  });

  it.each(['../bear-v1/outfit-lod.glb', 'revisions/../../bear-v1/outfit-lod.glb', '/tmp/model.glb', 'revisions\\model.glb'])
  ('refuses escaped generated model path %s', async suffix => {
    const f = await generatedFixture();
    f.summary.candidate.model.path = suffix.startsWith('/') ? suffix : `${generatedBase}/${suffix}`;
    await f.saveSummary();
    await expect(publishBearCompanion(f.options)).rejects.toThrow(/path/);
    expect(f.loadBlobSdk).not.toHaveBeenCalled();
  });

  it.each(['model', 'source', 'still', 'report'] as const)('refuses %s symlinks outside the generated candidate tree', async name => {
    const f = await generatedFixture();
    const local = name === 'still' ? f.summary.candidate.still.sourcePath
      : name === 'report' ? f.checks.runtime.path : f.summary.candidate[name].path;
    const destination = `${base}/escape-${name}`;
    const bytes = await readFile(path.join(f.options.rootDir, local));
    await f.write(destination, bytes);
    await rm(path.join(f.options.rootDir, local));
    await symlink(path.join(f.options.rootDir, destination), path.join(f.options.rootDir, local));
    await expect(publishBearCompanion(f.options)).rejects.toThrow(/path/);
    expect(f.loadBlobSdk).not.toHaveBeenCalled();
  });

  it('refuses an arbitrary generated proof path', async () => {
    const f = await generatedFixture();
    f.checks.native.path = `${generatedBase}/unreviewed-native.json`;
    await f.saveReports();
    await expect(publishBearCompanion(f.options)).rejects.toThrow(/descriptor/);
    expect(f.loadBlobSdk).not.toHaveBeenCalled();
  });

  it('retains the generated proof snapshots throughout the public GET', async () => {
    const f = await generatedFixture();
    f.fetchImpl.mockImplementationOnce(async () => {
      await f.write(f.checks.still.path, '{}');
      return new Response(f.model);
    });
    await expect(publishBearCompanion(f.options)).rejects.toThrow(/changed during publication/);
    expect(await f.manifest()).toBe(f.previous);
  });
});
