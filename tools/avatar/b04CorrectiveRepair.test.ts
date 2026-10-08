import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const fixture = {
  basis: [[0.1, 0, 0], [-0.1, 0, 0], [0, 0, 0]],
  left: [[0.1, 0.02, 0], [-0.1, 0, 0], [0, 0, 0]],
  right: [[0.1, 0.02, 0], [-0.1, 0.03, 0], [0, 0, 0]],
  expected_count: 1,
  expected_intended_count: 1,
  expected_max_delta: 0.02,
};

function plan(input: typeof fixture) {
  const result = spawnSync('python3', ['tools/blender/catalog/b04_corrective_repair_plan.py'], {
    input: JSON.stringify(input), encoding: 'utf8',
  });
  return { ...result, value: result.status === 0 ? JSON.parse(result.stdout) : undefined };
}

describe('bounded B04 corrective coordinate repair', () => {
  it('removes only inherited opposite-side deltas and preserves intended and center coordinates', () => {
    const result = plan(fixture);
    expect(result.status, result.stderr).toBe(0);
    expect(result.value.corrected).toEqual([fixture.basis[0], fixture.right[1], fixture.right[2]]);
    expect(result.value.changes.map((change: { index: number }) => change.index)).toEqual([0]);
    expect(result.value.intended).toEqual([1]);
  });

  it('refuses a delta that differs from the inherited Left delta', () => {
    const result = plan({ ...fixture, right: [[0.1, 0.021, 0], ...fixture.right.slice(1)] });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Unexpected inherited delta');
  });

  it('refuses to repair a source whose audited affected count changed', () => {
    const result = plan({ ...fixture, expected_count: 2 });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Audited opposite-side count changed');
  });

  it('refuses to repair a source whose intended count or maximum changed', () => {
    const intended = plan({ ...fixture, expected_intended_count: 2 });
    expect(intended.status).toBe(1);
    expect(intended.stderr).toContain('Audited intended-side count changed');
    const maximum = plan({ ...fixture, expected_max_delta: 0.01 });
    expect(maximum.status).toBe(1);
    expect(maximum.stderr).toContain('Audited maximum delta changed');
  });
});
