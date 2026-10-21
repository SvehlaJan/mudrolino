import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const script = path.resolve('tools/avatar/verify_bear_runtime.mjs');
describe('private bear runtime fixture origin', () => {
  it.each(['https://example.com', 'http://example.com', 'http://127.0.0.1:3003/nested',
    'http://localhost:3003/?model=private', 'http://user:password@localhost:3003'])('rejects %s before reading candidate bytes or launching a browser', base => {
    const emptyDirectory = mkdtempSync(path.join(tmpdir(), 'bear-origin-'));
    try {
      let errorText = '';
      try {
        execFileSync(process.execPath, [script, `--base=${base}`], { cwd: emptyDirectory, stdio: 'pipe' });
      } catch (error) {
        if (error && typeof error === 'object' && 'stderr' in error) errorText = String(error.stderr);
      }
      expect(errorText).toContain('Bear preview must be a loopback HTTP origin');
      expect(errorText).not.toContain('ENOENT');
    } finally {
      rmSync(emptyDirectory, { recursive: true, force: true });
    }
  });
});
