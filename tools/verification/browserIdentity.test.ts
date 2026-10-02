import { afterEach, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { browserFingerprint } from './browserIdentity';

const roots: string[] = [];
afterEach(() => roots.splice(0).forEach(root => rmSync(root, { recursive: true, force: true })));

it('invalidates proof when the managed headless shell changes or disappears', () => {
  const root = mkdtempSync(join(tmpdir(), 'teo-browser-proof-'));
  roots.push(root);
  const chrome = join(root, 'chromium-1223', 'chrome-mac', 'chrome');
  const shell = join(root, 'chromium_headless_shell-1223', 'chrome-mac', 'headless_shell');
  mkdirSync(join(root, 'chromium-1223', 'chrome-mac'), { recursive: true });
  mkdirSync(join(root, 'chromium_headless_shell-1223', 'chrome-mac'), { recursive: true });
  writeFileSync(chrome, 'unchanged Chrome');
  writeFileSync(shell, 'original shell');
  const initial = browserFingerprint([chrome]);
  writeFileSync(shell, 'replacement shell');
  const replaced = browserFingerprint([chrome]);
  expect(replaced).not.toBe(initial);
  rmSync(shell);
  expect(browserFingerprint([chrome])).not.toBe(replaced);
});

it('tracks managed runtime libraries and explicit executable overrides', () => {
  const root = mkdtempSync(join(tmpdir(), 'teo-browser-libraries-'));
  roots.push(root);
  const webkit = join(root, 'webkit-2287', 'pw_run.sh');
  const library = join(root, 'webkit-2287', 'runtime.dylib');
  const custom = join(root, 'custom-chrome');
  mkdirSync(join(root, 'webkit-2287'));
  writeFileSync(webkit, 'unchanged launcher');
  writeFileSync(library, 'library');
  writeFileSync(custom, 'custom executable');
  const initial = browserFingerprint([webkit, custom]);
  expect(browserFingerprint([webkit, custom])).toBe(initial);
  writeFileSync(library, 'replacement library');
  const changed = browserFingerprint([webkit, custom]);
  expect(changed).not.toBe(initial);
  writeFileSync(custom, 'replacement executable');
  expect(browserFingerprint([webkit, custom])).not.toBe(changed);
});
