import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, readdirSync, readlinkSync } from 'node:fs';
import { basename, dirname, join, parse } from 'node:path';

/** Include installed runtime files, not just Playwright's public launcher path. */
export function browserFingerprint(executables: string[]): string {
  const hash = createHash('sha256');
  const installations = new Set<string>();
  for (const executable of executables) {
    hash.update(JSON.stringify([executable, existsSync(executable)]));
    if (existsSync(executable)) hash.update(readFileSync(executable));
    for (let directory = dirname(executable); directory !== parse(directory).root; directory = dirname(directory)) {
      const managed = /^(chromium|webkit)-(\d+)$/.exec(basename(directory));
      if (!managed) continue;
      installations.add(directory);
      // Default headless Chromium uses this separate installation. Fingerprint
      // absence too: installing or removing it must invalidate successful proof.
      if (managed[1] === 'chromium') installations.add(join(dirname(directory), `chromium_headless_shell-${managed[2]}`));
      break;
    }
  }
  const record = (path: string): void => {
    if (!existsSync(path)) { hash.update(JSON.stringify([path, '<unavailable>'])); return; }
    const stat = lstatSync(path);
    // ctime and inode catch replacement even when size and mtime are preserved.
    hash.update(JSON.stringify([path, stat.ino, stat.mode, stat.size, stat.mtimeMs, stat.ctimeMs]));
    if (stat.isSymbolicLink()) hash.update(readlinkSync(path));
    else if (stat.isDirectory()) for (const child of readdirSync(path).sort()) record(join(path, child));
  };
  for (const directory of [...installations].sort()) record(directory);
  return hash.digest('hex');
}
