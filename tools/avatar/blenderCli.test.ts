import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';

const roots: string[] = [];
const runner = resolve('tools/avatar/blender_cli.py');
function fixture(exitCode = 0) {
  const root = mkdtempSync(join(tmpdir(), 'blender-cli-')); roots.push(root);
  const binary = join(root, 'Blender test executable');
  writeFileSync(binary, `#!/usr/bin/env python3\nimport json,sys\nprint(json.dumps(sys.argv[1:]))\nsys.exit(${exitCode})\n`);
  chmodSync(binary, 0o755);
  const script = join(root, 'study with spaces.py'); writeFileSync(script, '');
  return { binary, script };
}
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });

describe('portable Blender CLI', () => {
  it('keeps paths and script arguments literal and enables Python failure propagation', () => {
    const { binary, script } = fixture();
    const args = ['--output', 'a path with spaces.blend', '$(touch unsafe)', '`touch unsafe`'];
    const result = spawnSync('python3', [runner, script, ...args], { encoding: 'utf8', env: { ...process.env, BLENDER_BIN: binary } });
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual(['--background', '--factory-startup', '--python-exit-code', '1', '--python', script, '--', ...args]);
  });
  it('returns the Blender failure code to the calling agent', () => {
    const { binary, script } = fixture(7);
    expect(spawnSync('python3', [runner, script], { env: { ...process.env, BLENDER_BIN: binary } }).status).toBe(7);
  });
  it('fails on an invalid explicit override rather than silently using another version', () => {
    const { script } = fixture();
    const result = spawnSync('python3', [runner, script], { encoding: 'utf8', env: { ...process.env, BLENDER_BIN: '/missing/blender' } });
    expect(result.status).toBe(1); expect(result.stderr).toContain('BLENDER_BIN'); expect(result.stdout).toBe('');
  });
  it('reads the selected version without starting a scene or executing a script', () => {
    const { binary } = fixture();
    const result = spawnSync('python3', [runner, '--version'], { encoding: 'utf8', env: { ...process.env, BLENDER_BIN: binary } });
    expect(result.status).toBe(0); expect(JSON.parse(result.stdout)).toEqual(['--version']);
  });
});
