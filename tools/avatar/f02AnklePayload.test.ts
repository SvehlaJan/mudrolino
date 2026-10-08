import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const rotationX = (a: number) => [[1, 0, 0], [0, Math.cos(a), -Math.sin(a)], [0, Math.sin(a), Math.cos(a)]];
const rotationY = (a: number) => [[Math.cos(a), 0, Math.sin(a)], [0, 1, 0], [-Math.sin(a), 0, Math.cos(a)]];
const rotationZ = (a: number) => [[Math.cos(a), -Math.sin(a), 0], [Math.sin(a), Math.cos(a), 0], [0, 0, 1]];
const multiply = (a: number[][], b: number[][]) => a.map(row => b[0].map((_, j) => row.reduce((v, x, k) => v + x * b[k][j], 0)));
function payload(input: object) {
  const result = spawnSync('python3', ['tools/blender/catalog/f02_ankle_payload.py'], { input: JSON.stringify(input), encoding: 'utf8' });
  return { ...result, value: result.status === 0 ? JSON.parse(result.stdout) : undefined };
}
describe('F02 signed swing payload', () => {
  it('retains signed swing direction and reconstructs mixed swing/twist rotations', () => {
    for (const swing of [-.3, 0, .3]) {
      const result = payload({ delta: multiply(rotationY(swing), rotationX(-.6)), axis: [-1, 0, 0], forward: [0, -1, 0] });
      expect(result.status, result.stderr).toBe(0);
      expect(result.value.twist_rad).toBeCloseTo(.6, 12);
      expect(result.value.swing_forward_rad).toBeCloseTo(-swing, 12);
      expect(result.value.swing_up_rad).toBeCloseTo(0, 12);
      expect(result.value.reconstruction_rotation_error_rad).toBeLessThan(1e-12);
    }
  });
  it('reconstructs a rotation with both swing components and is invariant to basis rotation', () => {
    const delta = multiply(multiply(rotationZ(.25), rotationY(-.17)), rotationX(.4));
    const result = payload({ delta, axis: [-1, 0, 0], forward: [0, -1, 0] });
    expect(result.status, result.stderr).toBe(0);
    expect(Math.abs(result.value.swing_forward_rad)).toBeGreaterThan(.1);
    expect(Math.abs(result.value.swing_up_rad)).toBeGreaterThan(.1);
    expect(result.value.reconstruction_rotation_error_rad).toBeLessThan(1e-12);
    const basis = rotationZ(.7), transpose = basis[0].map((_, i) => basis.map(row => row[i]));
    const changed = payload({ delta: multiply(multiply(basis, delta), transpose), axis: basis.map(row => -row[0]), forward: basis.map(row => -row[1]) });
    expect(changed.status, changed.stderr).toBe(0);
    for (const key of ['twist_rad', 'swing_forward_rad', 'swing_up_rad']) expect(changed.value[key]).toBeCloseTo(result.value[key], 12);
  });
  it('rejects degenerate, mirrored and nonorthogonal calibration and undefined twist', () => {
    expect(payload({ delta: rotationX(0), axis: [0, 0, 0], forward: [0, -1, 0] }).status).toBe(1);
    expect(payload({ delta: rotationX(0), axis: [-1, 0, 0], forward: [-1, 0, 0] }).status).toBe(1);
    expect(payload({ delta: [[-1, 0, 0], [0, 1, 0], [0, 0, 1]], axis: [-1, 0, 0], forward: [0, -1, 0] }).status).toBe(1);
    expect(payload({ delta: rotationZ(Math.PI), axis: [-1, 0, 0], forward: [0, -1, 0] }).status).toBe(1);
  });
  it('retains the exact LoopRepeat branch at float duration and adjacent times', () => {
    const duration = .6666666865348816;
    for (const [time, expected] of [[0, 0], [duration - 1e-7, duration - 1e-7], [duration, 0], [duration + 1e-7, 1e-7], [16 / 24, 16 / 24]]) {
      const result = payload({ operation: 'loop_time', time, duration });
      expect(result.status, result.stderr).toBe(0);
      expect(result.value).toBeCloseTo(expected, 14);
    }
    expect(payload({ operation: 'loop_time', time: 1, duration: 0 }).status).toBe(1);
  });
});
