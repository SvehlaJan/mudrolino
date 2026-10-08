import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const fixture = {
  coordinates: {
    Basis: [[0.1, 0.14, 0.12], [-0.1, 0.14, 0.12], [0.2, 0, 0]],
    knee_clearance_Left: [[0.1, 0.145, 0.11], [-0.1, 0.14, 0.12], [0.2, 0, 0]],
    knee_clearance_Right: [[0.1, 0.14, 0.12], [-0.1, 0.145, 0.11], [0.2, 0, 0]],
  },
  detail_ids: [0, 1],
  rear_vectors: { Left: [0, 1, 0], Right: [0, 1, 0] },
  offset_m: 0.002,
  expected_detail_vertices: 2,
};
function plan(input = fixture) {
  const result = spawnSync('python3', ['tools/blender/catalog/f02_tab_offset_plan.py'], { input: JSON.stringify(input), encoding: 'utf8' });
  return { ...result, value: result.status === 0 ? JSON.parse(result.stdout) : undefined };
}
describe('bounded F02 tab offset', () => {
  it('translates only material-selected tab vertices in every target, preserving independent corrective deltas', () => {
    const result = plan();
    expect(result.status, result.stderr).toBe(0);
    for (const key of Object.keys(fixture.coordinates)) {
      const original = fixture.coordinates[key as keyof typeof fixture.coordinates];
      expect(result.value.coordinates[key][2]).toEqual(original[2]);
      expect(result.value.coordinates[key][0][1]).toBeCloseTo(original[0][1] + 0.002, 10);
      expect(result.value.coordinates[key][1][1]).toBeCloseTo(original[1][1] + 0.002, 10);
      for (const index of [0, 1]) for (const axis of [0, 1, 2]) {
        expect(result.value.coordinates[key][index][axis] - result.value.coordinates.Basis[index][axis]).toBeCloseTo(original[index][axis] - fixture.coordinates.Basis[index][axis], 10);
      }
    }
    expect(result.value.changed_indices).toEqual([0, 1]);
  });
  it('refuses an oversized, nonfinite or nonpositive change and an altered material inventory', () => {
    for (const offset_m of [0.005, 0, -0.001]) expect(plan({ ...fixture, offset_m }).status).toBe(1);
    expect(plan({ ...fixture, expected_detail_vertices: 3 }).status).toBe(1);
    expect(plan({ ...fixture, detail_ids: [0, 0] }).status).toBe(1);
  });
  it('refuses mismatched shape topology, a nonunit rear direction and a centerline tab', () => {
    expect(plan({ ...fixture, coordinates: { ...fixture.coordinates, knee_clearance_Left: [[0, 0, 0]] } }).status).toBe(1);
    expect(plan({ ...fixture, rear_vectors: { ...fixture.rear_vectors, Left: [0, 2, 0] } }).status).toBe(1);
    expect(plan({ ...fixture, coordinates: { ...fixture.coordinates, Basis: [[0, 0.14, 0.12], ...fixture.coordinates.Basis.slice(1)] } }).status).toBe(1);
  });
});
