import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { buildManifest, collectAssets, compare, objectKey, planPull, planPush, signRequest } from './asset_store.mjs';

let repo: string;
afterEach(() => rmSync(repo, { recursive: true, force: true }));

function fixture() {
  repo = mkdtempSync(path.join(tmpdir(), 'asset-store-'));
  const dir = path.join(repo, 'assets/avatar/catalog-a/T01');
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'T01.blend'), 'source');
  writeFileSync(path.join(dir, 'T01.glb'), 'export');
  writeFileSync(path.join(dir, 'copy.glb'), 'export');
  writeFileSync(path.join(dir, 'report.json'), '{}');
  symlinkSync('T01.blend', path.join(dir, 'link.blend'));
  return collectAssets(repo);
}

describe('avatar asset store', () => {
  it('collects 3D files with hashes, keeps symlinks as links and skips other files', () => {
    const local = fixture();
    expect(Object.keys(local.files)).toEqual(expect.arrayContaining(['assets/avatar/catalog-a/T01/T01.blend', 'assets/avatar/catalog-a/T01/T01.glb']));
    expect(Object.keys(local.files)).not.toContain('assets/avatar/catalog-a/T01/report.json');
    expect(local.files['assets/avatar/catalog-a/T01/T01.glb']).toEqual({ sha256: local.files['assets/avatar/catalog-a/T01/copy.glb'].sha256, size: 6 });
    expect(local.links).toEqual({ 'assets/avatar/catalog-a/T01/link.blend': 'T01.blend' });
    const manifest = buildManifest(local);
    expect(Object.keys(manifest.files)).toEqual([...Object.keys(manifest.files)].sort());
  });
  it('uploads each distinct hash once and only when the bucket lacks it', () => {
    const manifest = buildManifest(fixture());
    const glb = manifest.files['assets/avatar/catalog-a/T01/T01.glb'].sha256;
    const plan = planPush(manifest, () => false);
    expect(plan).toHaveLength(2);
    expect(planPush(manifest, sha => sha === glb).map(upload => upload.file)).toEqual(['assets/avatar/catalog-a/T01/T01.blend']);
    expect(objectKey(glb)).toBe(`sha256/${glb}`);
    expect(() => objectKey('../escape')).toThrow();
  });
  it('pulls only missing or changed files and links within the prefix', () => {
    const manifest = buildManifest(fixture());
    const local = { files: { ...manifest.files }, links: {} as Record<string, string> };
    delete local.files['assets/avatar/catalog-a/T01/T01.blend'];
    local.files['assets/avatar/catalog-a/T01/T01.glb'] = { sha256: '0'.repeat(64), size: 1 };
    const plan = planPull(manifest, local);
    expect(plan.downloads.map(d => [d.file, d.reason])).toEqual([
      ['assets/avatar/catalog-a/T01/T01.blend', 'missing'], ['assets/avatar/catalog-a/T01/T01.glb', 'changed']]);
    expect(plan.links).toEqual([['assets/avatar/catalog-a/T01/link.blend', 'T01.blend']]);
    expect(planPull(manifest, local, 'assets/avatar/catalog-a/B01').downloads).toEqual([]);
  });
  it('signs requests exactly like the AWS SigV4 reference examples', () => {
    const base = { host: 'examplebucket.s3.amazonaws.com', accessKeyId: 'AKIAIOSFODNN7EXAMPLE', secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      region: 'us-east-1', date: new Date('2013-05-24T00:00:00Z'), payloadHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' };
    const getObject = signRequest({ ...base, method: 'GET', path: '/test.txt', headers: { Range: 'bytes=0-9' } });
    expect(getObject.authorization).toBe('AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20130524/us-east-1/s3/aws4_request, '
      + 'SignedHeaders=host;range;x-amz-content-sha256;x-amz-date, Signature=f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41');
    const listObjects = signRequest({ ...base, method: 'GET', path: '/', query: { 'max-keys': '2', prefix: 'J' } });
    expect(listObjects.authorization).toContain('Signature=34b48302e7b5fa45bde8084f4b7868a86f0a534bc59db6670ed5711ef69dc6f7');
  });
  it('reports missing, changed, unlisted and wrong links against the manifest', () => {
    const manifest = buildManifest(fixture());
    const local = collectAssets(repo);
    expect(compare(manifest, local)).toEqual({ missing: [], changed: [], unlisted: [], links: [] });
    writeFileSync(path.join(repo, 'assets/avatar/catalog-a/T01/T01.glb'), 'edited');
    writeFileSync(path.join(repo, 'assets/avatar/catalog-a/T01/new.glb'), 'new');
    rmSync(path.join(repo, 'assets/avatar/catalog-a/T01/T01.blend'));
    const result = compare(manifest, collectAssets(repo));
    expect(result.missing).toEqual(['assets/avatar/catalog-a/T01/T01.blend']);
    expect(result.changed).toEqual(['assets/avatar/catalog-a/T01/T01.glb']);
    expect(result.unlisted).toEqual(['assets/avatar/catalog-a/T01/new.glb']);
  });
});
