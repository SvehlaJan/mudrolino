import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, realpathSync, renameSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { linkLocalArchive, resolveAuthoringRoot, verifyArchiveFiles } from './localArchive.mjs';

const temporary: string[] = [];
function directory() { const p = realpathSync(mkdtempSync(join(tmpdir(), 'local-archive-'))); temporary.push(p); return p; }
function fixture() {
  const repo = directory(); const archive = directory(); const relative = 'assets/avatar/catalog-a';
  mkdirSync(join(repo, 'assets/avatar'), { recursive: true });
  mkdirSync(join(archive, 'working', relative), { recursive: true });
  writeFileSync(join(repo, 'assets/avatar/local-archive.json'), JSON.stringify({ schemaVersion: 1, archiveId: 'fixture', sourceCommit: 'a'.repeat(40), roots: [relative] }));
  writeFileSync(join(archive, 'archive-manifest.json'), JSON.stringify({ schemaVersion: 1, archiveId: 'fixture', sourceCommit: 'a'.repeat(40), verified: true }));
  vi.stubEnv('MUDROLINO_ARCHIVE_ROOT', archive);
  return { repo, archive, relative };
}
afterEach(() => { vi.unstubAllEnvs(); for (const p of temporary.splice(0)) rmSync(p, { force: true, recursive: true }); });

describe('local archive access', () => {
  it('accepts ordinary local fixture roots and returns null for absent optional roots', () => {
    const repo = directory(); mkdirSync(join(repo, 'assets/avatar/catalog-a'), { recursive: true });
    expect(resolveAuthoringRoot(repo, 'assets/avatar/catalog-a')).toBe(resolve(repo, 'assets/avatar/catalog-a'));
    expect(resolveAuthoringRoot(repo, 'missing')).toBeNull();
    expect(() => resolveAuthoringRoot(repo, 'missing', { required: true })).toThrow(/missing|unavailable/i);
  });
  it('links only the declared working tree and refuses an existing directory without changing it', () => {
    const { repo, archive, relative } = fixture();
    linkLocalArchive(repo);
    expect(resolveAuthoringRoot(repo, relative)).toBe(resolve(archive, 'working', relative));
    linkLocalArchive(repo);
    rmSync(join(repo, relative)); mkdirSync(join(repo, relative)); writeFileSync(join(repo, relative, 'keep'), 'mine');
    expect(() => linkLocalArchive(repo)).toThrow(/collision|existing|refus/i);
    expect(readFileSync(join(repo, relative, 'keep'), 'utf8')).toBe('mine');
  });
  it('fails actionably on absent archives, mismatched identities and unverified snapshots', () => {
    const { repo, archive, relative } = fixture();
    expect(() => resolveAuthoringRoot(repo, relative)).toThrow(/archive:link|archive.*link/i);
    writeFileSync(join(archive, 'archive-manifest.json'), JSON.stringify({ schemaVersion: 1, archiveId: 'other', sourceCommit: 'a'.repeat(40), verified: true }));
    expect(() => linkLocalArchive(repo)).toThrow(/identity|archiveId/i);
    writeFileSync(join(archive, 'archive-manifest.json'), JSON.stringify({ schemaVersion: 1, archiveId: 'fixture', sourceCommit: 'a'.repeat(40), verified: false }));
    expect(() => linkLocalArchive(repo)).toThrow(/verif/i);
  });
  it('rejects link retargeting and nested archive-working escapes', () => {
    const { repo, archive, relative } = fixture(); const outside = directory();
    symlinkSync(outside, join(repo, relative));
    expect(() => resolveAuthoringRoot(repo, relative)).toThrow(/target|escape|unexpected/i);
    rmSync(join(repo, relative)); rmSync(join(archive, 'working', relative), { recursive: true });
    symlinkSync(outside, join(archive, 'working', relative));
    symlinkSync(join(archive, 'working', relative), join(repo, relative));
    expect(() => resolveAuthoringRoot(repo, relative)).toThrow(/target|escape|unexpected/i);
  });
  it('does not authorize arbitrary external roots or path traversal', () => {
    const repo = directory(); const outside = directory(); symlinkSync(outside, join(repo, 'arbitrary'));
    expect(() => resolveAuthoringRoot(repo, 'arbitrary')).toThrow(/unapproved|outside|archive/i);
    expect(() => resolveAuthoringRoot(repo, '../outside')).toThrow(/unsafe|relative|traversal/i);
  });
  it('refuses to create links through a repository parent retargeted outside the checkout', () => {
    const { repo } = fixture(); const outside = directory();
    renameSync(join(repo, 'assets'), join(outside, 'assets'));
    symlinkSync(join(outside, 'assets'), join(repo, 'assets'));
    expect(() => linkLocalArchive(repo)).toThrow(/parent|outside|escape/i);
    expect(existsSync(join(outside, 'assets/avatar/catalog-a'))).toBe(false);
  });
  it('rejects a changed snapshot inventory when the contract pins its digest', () => {
    const { repo, archive } = fixture(); const marker = join(archive, 'archive-manifest.json');
    const file = join(repo, 'assets/avatar/local-archive.json'); const contract = JSON.parse(readFileSync(file, 'utf8'));
    contract.snapshotManifestSha256 = createHash('sha256').update(readFileSync(marker)).digest('hex');
    writeFileSync(file, JSON.stringify(contract));
    linkLocalArchive(repo);
    writeFileSync(marker, JSON.stringify({ schemaVersion: 1, archiveId: 'fixture', verified: true, changed: true }));
    expect(() => linkLocalArchive(repo)).toThrow(/hash|digest|inventory/i);
  });
  it('rejects a same-ID archive from another source commit', () => {
    const { repo, archive } = fixture();
    writeFileSync(join(archive, 'archive-manifest.json'), JSON.stringify({ schemaVersion: 1, archiveId: 'fixture', sourceCommit: 'b'.repeat(40), verified: true }));
    expect(() => linkLocalArchive(repo)).toThrow(/sourceCommit/i);
  });
  it('preflights all roots before a later collision can create a partial set of links', () => {
    const { repo, archive, relative } = fixture(); const second = 'assets/avatar/concepts';
    const contract = join(repo, 'assets/avatar/local-archive.json'); const data = JSON.parse(readFileSync(contract, 'utf8'));
    data.roots.push(second); writeFileSync(contract, JSON.stringify(data));
    mkdirSync(join(archive, 'working', second), { recursive: true }); mkdirSync(join(repo, second));
    expect(() => linkLocalArchive(repo)).toThrow(/collision/i);
    expect(existsSync(join(repo, relative))).toBe(false);
  });
  it('verifies original bytes and symlink text, rejecting changed or missing entries', () => {
    const root = directory(); writeFileSync(join(root, 'proof'), 'original'); symlinkSync('proof', join(root, 'alias'));
    const entries = [{ path: 'proof', size: 8, sha256: createHash('sha256').update('original').digest('hex') }, { path: 'alias', symlink: 'proof' }];
    expect(verifyArchiveFiles(root, entries)).toBe(2);
    writeFileSync(join(root, 'proof'), 'modified');
    expect(() => verifyArchiveFiles(root, entries)).toThrow(/hash|changed|mismatch/i);
    rmSync(join(root, 'proof'));
    expect(() => verifyArchiveFiles(root, entries)).toThrow(/missing|ENOENT/i);
  });
});
