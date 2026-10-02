import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

export function inputFingerprint(root = process.cwd()) {
  const paths = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: root }).toString().split('\0');
  const inputs = [...new Set(paths.filter(path => /^(src\/|e2e\/|tools\/|public\/|package|(?:vite|vitest|tsconfig|eslint)\.|index\.html$)/.test(path)))].sort();
  const hash = createHash('sha256');
  for (const file of [...inputs, '.env', '.env.local', '.env.test', '.env.test.local', '.env.production', '.env.production.local']) {
    hash.update(file);
    hash.update(existsSync(`${root}/${file}`) ? readFileSync(`${root}/${file}`) : '<deleted>');
  }
  hash.update(process.version);
  for (const name of Object.keys(process.env).filter(name => /^(VITE_|PLAYWRIGHT_|CI$)/.test(name)).sort()) {
    hash.update(name + '=' + process.env[name]);
  }
  return hash.digest('hex');
}

export function buildIdentity(mode, root = process.cwd()) {
  return {
    mode,
    commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
    fingerprint: inputFingerprint(root),
  };
}
