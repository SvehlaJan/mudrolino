import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

function run(input: object) {
  const result = spawnSync('python3', ['tools/blender/catalog/f02_plantar_envelope.py'], { input: JSON.stringify(input), encoding: 'utf8' });
  return { ...result, value: result.status === 0 ? JSON.parse(result.stdout) : undefined };
}
const basis = [[.1, 0, .09], [.11, 0, .09], [.1, .0015, .09], [.11, .0015, .09], [.1, 0, .12], [.11, 0, .12], [.1, .0015, .12], [.11, .0015, .12], [-.1, 0, .09], [-.11, 0, .09], [-.1, .0015, .09], [-.11, .0015, .09], [-.1, 0, .12], [-.11, 0, .12], [-.1, .0015, .12], [-.11, .0015, .12], [0, 0, 0]];
const fixture = { operation: 'plan', coordinates: { Basis: basis, knee_clearance_Left: basis.map((p, i) => p.map((v, j) => v + (i >= 4 && i < 8 && j === 2 ? -.01 : 0))), knee_clearance_Right: basis }, rows: { Left: [[0, 1, 2, 3], [4, 5, 6, 7]], Right: [[8, 9, 10, 11], [12, 13, 14, 15]] }, rear: { Left: [0, 1, 0], Right: [0, 1, 0] }, coefficients: { Left: [0, .008], Right: [0, .011] }, rest_shift_m: .002, expected_detail_vertices: 16 };
describe('one conservative F02 plantarflexion envelope', () => {
  it('keeps basal vertices and unaffected geometry fixed, retaining row width/thickness and knee deltas', () => {
    const result = run(fixture);
    expect(result.status, result.stderr).toBe(0);
    for (const name of ['Basis', 'knee_clearance_Left', 'knee_clearance_Right']) {
      const original = fixture.coordinates[name as keyof typeof fixture.coordinates];
      for (const i of [0, 1, 2, 3, 8, 9, 10, 11, 16]) expect(result.value.coordinates[name][i]).toEqual(original[i]);
      for (const [a, b] of [[4, 5], [4, 6], [12, 13], [12, 14]]) for (let j = 0; j < 3; j++) expect(result.value.coordinates[name][b][j] - result.value.coordinates[name][a][j]).toBeCloseTo(original[b][j] - original[a][j], 12);
    }
    for (const i of [0, 1, 2, 3, 8, 9, 10, 11, 12, 13, 14, 15, 16]) expect(result.value.coordinates.ankle_envelope_Left[i]).toEqual(result.value.coordinates.Basis[i]);
    expect(result.value.coordinates.ankle_envelope_Left[4][1]).toBeCloseTo(.01, 12);
    expect(result.value.coordinates.knee_clearance_Left[4][2] - result.value.coordinates.Basis[4][2]).toBeCloseTo(-.01, 12);
  });
  it('calibrates one worst-case target per row and exposes inactive-input constraints without searching', () => {
    const result = run({ operation: 'calibrate', row_count: 2, samples: [{ side: 'Left', row: 1, twist_rad: -.4, required_rest_shift_m: .004, pose: 'a' }, { side: 'Left', row: 1, twist_rad: -.8, required_rest_shift_m: .006, pose: 'b' }, { side: 'Right', row: 1, twist_rad: .1, required_rest_shift_m: .001, pose: 'c' }, { side: 'Right', row: 0, twist_rad: -.8, required_rest_shift_m: .003, pose: 'd' }] });
    expect(result.status, result.stderr).toBe(0);
    expect(result.value.coefficients.Left).toEqual([0, .008]);
    expect(result.value.coefficients.Right).toEqual([0, 0]);
    expect(result.value.inactive_constraints).toHaveLength(1);
    expect(result.value.fixed_base_constraints).toHaveLength(1);
  });
  it('rejects incomplete/duplicate/opposite-side membership and moving base coefficients', () => {
    expect(run({ ...fixture, rows: { ...fixture.rows, Left: [[0, 1, 2, 3], [4, 5, 6, 6]] } }).status).toBe(1);
    expect(run({ ...fixture, rows: { ...fixture.rows, Left: [[0, 1, 2, 3], [4, 5, 6, 12]] } }).status).toBe(1);
    expect(run({ ...fixture, coefficients: { ...fixture.coefficients, Left: [.001, .008] } }).status).toBe(1);
    expect(run({ ...fixture, rear: { ...fixture.rear, Left: [0, 2, 0] } }).status).toBe(1);
  });
});
