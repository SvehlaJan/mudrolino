import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

describe('disposable proportion preview contracts', () => {
  it('runs the Python behavioral suite for pivots, baseline coordinates, valid scales, framing and protected output paths', () => {
    const result = spawnSync('python3', ['tools/avatar/test_catalog_proportions.py'], { encoding: 'utf8' });
    expect(result.status, result.stderr).toBe(0);
    expect(result.stderr).toMatch(/Ran 7 tests/);
  });
});
