import { execFileSync, spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const files = execFileSync('rg', ['--files', 'src', 'e2e', 'tools', '-g', '*.verify.ts'], { encoding: 'utf8' }).trim().split('\n').sort();
let failed = false;
for (const file of files) {
  const result = spawnSync(resolve('node_modules/.bin/tsx'), [file], { stdio: 'inherit' });
  if (result.status !== 0) { failed = true; console.error(`[pure] FAILED ${file}`); }
}
process.exitCode = failed ? 1 : 0;
