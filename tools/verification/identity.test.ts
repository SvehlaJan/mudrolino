import { afterEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inputFingerprint } from './identity.mjs';

const roots: string[] = [];
afterEach(() => roots.splice(0).forEach(root => rmSync(root, { recursive: true, force: true })));

describe('verification input identity', () => {
  it('invalidates edited/untracked/deleted implementation and test inputs while ignoring docs', () => {
    const root = mkdtempSync(join(tmpdir(), 'teo-proof-'));
    roots.push(root);
    execFileSync('git', ['init', '-q', root]);
    mkdirSync(join(root, 'src'));
    writeFileSync(join(root, 'src/game.ts'), 'original');
    execFileSync('git', ['add', '.'], { cwd: root });
    const original = inputFingerprint(root);
    writeFileSync(join(root, 'README.md'), 'documentation');
    expect(inputFingerprint(root)).toBe(original);
    writeFileSync(join(root, 'src/game.ts'), 'changed');
    const changed = inputFingerprint(root);
    expect(changed).not.toBe(original);
    writeFileSync(join(root, 'src/new.test.ts'), 'new contract');
    expect(inputFingerprint(root)).not.toBe(changed);
    rmSync(join(root, 'src/new.test.ts'));
    rmSync(join(root, 'src/game.ts'));
    expect(inputFingerprint(root)).not.toBe(changed);
  });

  it('includes local configuration without exposing its contents', () => {
    const root = mkdtempSync(join(tmpdir(), 'teo-proof-env-'));
    roots.push(root);
    execFileSync('git', ['init', '-q', root]);
    const original = inputFingerprint(root);
    writeFileSync(join(root, '.env.local'), 'VITE_FLAG=enabled');
    const changed = inputFingerprint(root);
    expect(changed).not.toBe(original);
    expect(changed).toMatch(/^[a-f0-9]{64}$/);
  });
});
