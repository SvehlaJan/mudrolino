import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { chromium, webkit } from 'playwright';
import { resolveChromiumExecutable } from '../../e2e/browserResolver';
import { resolve } from 'node:path';
import { inputFingerprint } from './identity.mjs';
import { selectVerification, type VerificationProfile } from './selection';
import { browserFingerprint } from './browserIdentity';

const args = process.argv.slice(2);
const get = (name: string) => args.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
const profile = get('profile') as VerificationProfile | undefined;
if (profile && !['none', 'edit', 'integration', 'release'].includes(profile)) throw new Error(`Unknown profile: ${profile}`);
for (const arg of args) {
  if (!/^--(?:profile|base|files|workers)=/.test(arg) && !['--reuse', '--force', '--dry-run'].includes(arg)) throw new Error(`Unknown argument: ${arg}`);
}
const git = (...params: string[]) => execFileSync('git', params, { encoding: 'utf8' });
const base = get('base');
const changed = get('files')?.split(',') ?? [
  ...(base ? git('diff', '--name-only', '-z', `${base}...HEAD`).split('\0') : []),
  ...git('diff', '--name-only', '-z', 'HEAD').split('\0'),
  ...git('ls-files', '-z', '--others', '--exclude-standard').split('\0'),
].filter(Boolean);
const selection = selectVerification(changed, profile === 'edit' ? undefined : profile);
console.log(`[verify] ${selection.profile}: ${selection.reason}${selection.specs.length ? ` (${selection.specs.join(', ')})` : ''}`);

const workers = get('workers') ?? '3';
if (!/^\d+$/.test(workers) || Number(workers) < 1) throw new Error('Workers must be a positive integer');
if (args.includes('--dry-run')) { console.log(JSON.stringify({ changed, selection }, null, 2)); process.exit(0); }
const fingerprint = inputFingerprint();
const environment = {
  platform: process.platform, arch: process.arch,
  browsers: browserFingerprint([resolveChromiumExecutable() ?? chromium.executablePath(), webkit.executablePath()]),
};
const cacheKey = JSON.stringify({ fingerprint, selection, workers, environment });
const dir = resolve('artifacts/verification');
mkdirSync(dir, { recursive: true });
const cachePath = resolve(dir, 'last-success.json');
if (args.includes('--reuse') && !args.includes('--force') && existsSync(cachePath)) {
  const previous = JSON.parse(readFileSync(cachePath, 'utf8'));
  if (previous.cacheKey === cacheKey) {
    console.log(`[verify] Reusing successful proof from ${previous.finishedAt}; identical inputs and profile. Use --force for a fresh run.`);
    process.exit(0);
  }
}

interface Gate { name: string; command: string[]; exitCode: number; durationMs: number; skipped?: string }
const gates: Gate[] = [];
function run(name: string, command: string[]): boolean {
  console.log(`\n[verify] ${name}`);
  const start = Date.now();
  const result = spawnSync(command[0], command.slice(1), { stdio: 'inherit' });
  const exitCode = result.status ?? 1;
  if (result.error) console.error(result.error.message);
  gates.push({ name, command, exitCode, durationMs: Date.now() - start });
  return exitCode === 0;
}
const npm = (name: string) => ['npm', 'run', name];
const local = (name: string, ...params: string[]) => [resolve('node_modules/.bin', name), ...params];
const startedAt = new Date().toISOString();
run('lint', npm('lint'));
run('unit', npm('test:unit'));
run('pure', npm('verify:pure'));
run('audio inventory', npm(selection.profile === 'release' ? 'test:audio:strict' : 'test:audio'));

if (selection.profile !== 'none') {
  const testBuilt = run('test build', npm('build:e2e'));
  if (testBuilt) {
    run('integration browser', local('playwright', 'test', '--config=e2e/playwright.config.ts', `--workers=${workers}`, ...selection.specs.map(spec => `e2e/${spec}`)));
    if (selection.profile === 'release') run('release browser', local('playwright', 'test', '--config=e2e/playwright.release.config.ts', `--workers=${workers}`));
  } else gates.push({ name: 'browser', command: [], exitCode: 1, durationMs: 0, skipped: 'test build failed' });
  if (selection.profile === 'integration' || selection.profile === 'release') {
    const productionBuilt = run('production build', npm('build'));
    if (productionBuilt) {
      run('production bundle', npm('verify:bundle'));
      if (selection.profile === 'release') run('production browser', local('playwright', 'test', '--config=e2e/playwright.production.config.ts', `--workers=${workers}`));
    } else gates.push({ name: 'production checks', command: [], exitCode: 1, durationMs: 0, skipped: 'production build failed' });
  }
}
const success = gates.every(gate => gate.exitCode === 0);
const report = {
  startedAt, finishedAt: new Date().toISOString(), commit: git('rev-parse', 'HEAD').trim(), fingerprint,
  node: process.version, environment, selection, changed, workers, cacheKey, success, gates,
  builds: ['dist-e2e', 'dist'].filter(path => existsSync(`${path}/build-identity.json`)).map(path => JSON.parse(readFileSync(`${path}/build-identity.json`, 'utf8'))),
};
const reportPath = resolve(dir, `${startedAt.replace(/[:.]/g, '-')}-${selection.profile}.json`);
writeFileSync(reportPath, JSON.stringify(report, null, 2));
if (success) writeFileSync(cachePath, JSON.stringify(report, null, 2));
console.log(`\n[verify] ${success ? 'PASS' : 'FAIL'} — ${reportPath}`);
process.exitCode = success ? 0 : 1;
