import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, readlinkSync, realpathSync, symlinkSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const contractPath = 'assets/avatar/local-archive.json';
const supportedRoots = new Set(['assets/avatar/catalog-a', 'assets/avatar/catalog', 'assets/avatar/concepts']);
const verifiedInventories = new Map();
const inside = (root, target) => target === root || target.startsWith(`${root}${path.sep}`);
const present = file => { try { lstatSync(file); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; } };

function relativePath(value) {
  if (typeof value !== 'string' || !value || path.isAbsolute(value) || value.includes('\\') || value.split('/').some(part => !part || part === '.' || part === '..')) {
    throw new Error(`Unsafe relative archive path: ${value}`);
  }
  return value;
}

export function readLocalArchiveContract(repo) {
  const file = path.join(repo, contractPath);
  if (!existsSync(file)) return null;
  const contract = JSON.parse(readFileSync(file, 'utf8'));
  if (contract.schemaVersion !== 1 || !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(contract.archiveId) || !/^[a-f0-9]{40}$/.test(contract.sourceCommit) || !Array.isArray(contract.roots)
    || !contract.roots.length || new Set(contract.roots).size !== contract.roots.length || contract.roots.some(root => !supportedRoots.has(root))) {
    throw new Error(`Invalid local archive contract: ${contractPath}`);
  }
  return contract;
}

export function localArchiveLocation(repo) {
  const contract = readLocalArchiveContract(repo);
  if (!contract) throw new Error(`Missing local archive contract: ${contractPath}`);
  return path.resolve(process.env.MUDROLINO_ARCHIVE_ROOT || path.join(homedir(), 'Archives', 'Mudrolino', contract.archiveId));
}

function archiveInfo(repo) {
  const contract = readLocalArchiveContract(repo);
  const configured = localArchiveLocation(repo);
  const marker = path.join(configured, 'archive-manifest.json');
  if (!existsSync(marker)) throw new Error(`Local archive unavailable at ${configured}. Restore this MacBook's archive, then run npm run archive:link.`);
  const archive = realpathSync(configured);
  const stat = lstatSync(marker, { bigint: true });
  if (!stat.isFile()) throw new Error('Archive inventory must be a regular file');
  const signature = `${stat.dev}:${stat.ino}:${stat.size}:${stat.mtimeNs}:${stat.ctimeNs}:${JSON.stringify(contract)}`;
  const cached = verifiedInventories.get(marker);
  if (cached?.signature === signature) return cached.info;
  const bytes = readFileSync(marker);
  if (contract.snapshotManifestSha256 && createHash('sha256').update(bytes).digest('hex') !== contract.snapshotManifestSha256) throw new Error('Local archive snapshot inventory hash mismatch');
  const manifest = JSON.parse(bytes.toString('utf8'));
  if (manifest.schemaVersion !== 1 || manifest.archiveId !== contract.archiveId) throw new Error('Local archive identity/archiveId mismatch');
  if (manifest.sourceCommit !== contract.sourceCommit) throw new Error('Local archive identity/sourceCommit mismatch');
  if (manifest.verified !== true) throw new Error('Local archive snapshot has not been verified');
  const info = { contract, archive, manifest };
  verifiedInventories.set(marker, { signature, info });
  return info;
}

function workingRoot(info, relative) {
  const expected = path.join(info.archive, 'working', relative);
  if (!existsSync(expected)) throw new Error(`Local archive working root missing: ${relative}. Restore the archive before linking.`);
  if (realpathSync(expected) !== expected || !lstatSync(expected).isDirectory()) throw new Error(`Unexpected archive target/escape: ${relative}`);
  return expected;
}

/** Ordinary fixture roots remain supported; external links require an exact declared destination. */
export function resolveAuthoringRoot(repo, relative, { required = false } = {}) {
  relativePath(relative);
  const root = realpathSync(repo); const target = path.join(root, relative);
  const contract = readLocalArchiveContract(root);
  if (!present(target)) {
    if (required || contract?.roots.includes(relative)) throw new Error(`Authoring data missing: ${relative}. Run npm run archive:link after restoring the local archive.`);
    return null;
  }
  if (lstatSync(target).isSymbolicLink()) {
    if (!contract?.roots.includes(relative)) throw new Error(`Unapproved external archive link: ${relative}`);
    const expected = workingRoot(archiveInfo(root), relative);
    if (!existsSync(target) || realpathSync(target) !== expected) throw new Error(`Unexpected archive link target: ${relative}`);
    return expected;
  }
  const actual = realpathSync(target);
  if (!inside(root, actual)) throw new Error(`Authoring root outside repository: ${relative}`);
  if (!lstatSync(actual).isDirectory()) throw new Error(`Authoring root is not a directory: ${relative}`);
  return actual;
}

/** Preflight every root before creating any links; never replace existing data. */
export function linkLocalArchive(repo) {
  const root = realpathSync(repo); const info = archiveInfo(root);
  const targets = info.contract.roots.map(relative => {
    const target = path.join(root, relative); const expected = workingRoot(info, relative);
    let parent = path.dirname(target);
    while (!present(parent)) parent = path.dirname(parent);
    if (!inside(root, realpathSync(parent))) throw new Error(`Archive link parent escapes outside repository: ${relative}`);
    if (present(target) && (!lstatSync(target).isSymbolicLink() || !existsSync(target) || realpathSync(target) !== expected)) {
      throw new Error(`Refusing existing archive-link collision: ${relative}`);
    }
    return { target, expected };
  });
  for (const { target, expected } of targets) {
    if (present(target)) continue;
    mkdirSync(path.dirname(target), { recursive: true });
    if (!inside(root, realpathSync(path.dirname(target)))) throw new Error('Archive link parent escaped outside repository');
    symlinkSync(expected, target, 'dir');
  }
  return targets.length;
}

/** Check immutable snapshot entries, not mutable authoring output. Symlink text is preserved exactly. */
export function verifyArchiveFiles(root, entries) {
  const canonical = realpathSync(root);
  for (const entry of entries) {
    const file = path.join(canonical, relativePath(entry.path));
    if (!present(file)) throw new Error(`Archive entry missing: ${entry.path}`);
    const stat = lstatSync(file);
    if (entry.symlink !== undefined) {
      if (!stat.isSymbolicLink() || readlinkSync(file) !== entry.symlink) throw new Error(`Archive symlink changed: ${entry.path}`);
      continue;
    }
    if (!stat.isFile() || !inside(canonical, realpathSync(file))) throw new Error(`Unsafe archive file: ${entry.path}`);
    const bytes = readFileSync(file);
    if (bytes.length !== entry.size || createHash('sha256').update(bytes).digest('hex') !== entry.sha256) throw new Error(`Archive hash mismatch: ${entry.path}`);
  }
  return entries.length;
}

export function verifyLocalArchive(repo) {
  const info = archiveInfo(repo);
  if (!Array.isArray(info.manifest.files) || !info.manifest.files.length) throw new Error('Archive has no snapshot inventory');
  const count = verifyArchiveFiles(path.join(info.archive, 'snapshot'), info.manifest.files);
  if (info.manifest.repositorySnapshot) verifyArchiveFiles(info.archive, [info.manifest.repositorySnapshot]);
  return count;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const [command, ...extra] = process.argv.slice(2);
    if (extra.length || !['link', 'verify'].includes(command)) throw new Error('Usage: node tools/avatar/localArchive.mjs <link|verify>');
    const repo = process.cwd();
    const count = command === 'link' ? linkLocalArchive(repo) : verifyLocalArchive(repo);
    console.log(`${command}: ${count} ${command === 'link' ? 'local archive roots linked' : 'immutable snapshot entries verified'} at ${localArchiveLocation(repo)}`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
