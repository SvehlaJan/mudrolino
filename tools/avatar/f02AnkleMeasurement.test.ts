import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const identity = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
const rotationX = (a: number) => [[1, 0, 0], [0, Math.cos(a), -Math.sin(a)], [0, Math.sin(a), Math.cos(a)]];
const rotationZ = (a: number) => [[Math.cos(a), -Math.sin(a), 0], [Math.sin(a), Math.cos(a), 0], [0, 0, 1]];
const multiply = (a: number[][], b: number[][]) => a.map(row => b[0].map((_, j) => row.reduce((v, x, k) => v + x * b[k][j], 0)));
const base = { bind_leg: identity, bind_foot: rotationZ(.3), leg: identity, foot: rotationZ(.3), axis_world_bind: [-1, 0, 0] };
function measure(input = base) {
  const result = spawnSync('python3', ['tools/blender/catalog/f02_ankle_measurement.py'], { input: JSON.stringify(input), encoding: 'utf8' });
  return { ...result, value: result.status === 0 ? JSON.parse(result.stdout) : undefined };
}
describe('F02 bind-relative ankle measurement', () => {
  it('subtracts neutral bind alignment and measures positive dorsiflexion in radians', () => {
    expect(measure().value).toMatchObject({ twist_rad: 0, swing_rad: 0 });
    const result = measure({ ...base, foot: multiply(rotationX(-.6), base.bind_foot) });
    expect(result.status, result.stderr).toBe(0);
    expect(result.value.twist_rad).toBeCloseTo(.6, 12);
    expect(result.value.swing_rad).toBeCloseTo(0, 12);
    expect(measure({ ...base, foot: multiply(rotationX(.4), base.bind_foot) }).value.twist_rad).toBeCloseTo(-.4, 12);
  });
  it('keeps ankle measurement under common parent/world rotation and Blender-to-glTF conversion', () => {
    const foot = multiply(rotationX(-.6), base.bind_foot);
    for (const world of [rotationZ(.7), rotationX(-Math.PI / 2)]) {
      const axis = world.map(row => row.reduce((v, x, k) => v + x * base.axis_world_bind[k], 0));
      const result = measure({ bind_leg: world, bind_foot: multiply(world, base.bind_foot), leg: multiply(world, rotationZ(.2)), foot: multiply(multiply(world, rotationZ(.2)), foot), axis_world_bind: axis });
      expect(result.status, result.stderr).toBe(0);
      expect(result.value.twist_rad).toBeCloseTo(.6, 12);
      expect(result.value.swing_rad).toBeCloseTo(0, 12);
    }
  });
  it('reports off-axis rotation so equal scalar values cannot hide different local rotations', () => {
    const result = measure({ ...base, foot: multiply(multiply(rotationZ(.25), rotationX(-.6)), base.bind_foot) });
    expect(result.value.twist_rad).toBeCloseTo(.6, 12);
    expect(result.value.swing_rad).toBeCloseTo(.25, 12);
  });
  it('rejects reflections, shears, nonfinite matrices and undefined 180-degree orthogonal twist', () => {
    expect(measure({ ...base, foot: [[-1, 0, 0], [0, 1, 0], [0, 0, 1]] }).status).toBe(1);
    expect(measure({ ...base, foot: [[1, .1, 0], [0, 1, 0], [0, 0, 1]] }).status).toBe(1);
    expect(measure({ ...base, foot: [[NaN, 0, 0], [0, 1, 0], [0, 0, 1]] }).status).toBe(1);
    expect(measure({ ...base, axis_world_bind: [0, 0, 0] }).status).toBe(1);
    expect(measure({ ...base, foot: multiply(rotationZ(Math.PI), base.bind_foot) }).status).toBe(1);
  });
  it('retains all 163 gait poses, exact endpoints and inactive-knee regressions', () => {
    const result = spawnSync('python3', ['tools/blender/catalog/f02_ankle_measurement.py'], { input: JSON.stringify({ operation: 'schedule' }), encoding: 'utf8' });
    expect(result.status, result.stderr).toBe(0);
    const rows = JSON.parse(result.stdout) as Array<{ motion: string; frame: number }>;
    expect(rows).toHaveLength(164);
    expect(rows.filter(row => row.motion === 'walk')).toHaveLength(101);
    expect(rows.filter(row => row.motion === 'run')).toHaveLength(62);
    expect(rows).toEqual(expect.arrayContaining([{ motion: 'walk', frame: .8 }, { motion: 'walk', frame: 25.6 }, { motion: 'run', frame: .8 }, { motion: 'run', frame: 16 }, { motion: 'run', frame: 12.25 }, { motion: 'run', frame: 12.75 }]));
  });
  it('uses anatomical forward/up on both sides and retains the existing zero knee value', () => {
    const matrix = (r: number[][], x: number, y: number, z: number) => [...r.map((row, i) => [...row, [x, y, z][i]]), [0, 0, 0, 1]];
    for (const [side, x] of [['Left', 1], ['Right', -1]] as const) {
      const bind = { [`${side}UpLeg`]: matrix(identity, x, 0, 2), [`${side}Leg`]: matrix(identity, x, 0, 1), [`${side}Foot`]: matrix(identity, x, 0, 0), [`${side}ToeBase`]: matrix(identity, x, -1, 0) };
      const world = { ...bind, [`${side}Foot`]: matrix(rotationX(-.4), x, 0, 0) };
      const result = spawnSync('python3', ['tools/blender/catalog/f02_ankle_measurement.py'], { input: JSON.stringify({ operation: 'side', bind, world, side }), encoding: 'utf8' });
      expect(result.status, result.stderr).toBe(0);
      const value = JSON.parse(result.stdout);
      expect(value.twist_rad).toBeCloseTo(.4, 12);
      expect(value.knee_value).toBe(0);
      expect(value.axis_world_bind).toEqual([-1, 0, 0]);
    }
  });
  it('detects different tab-shell fields even when twist and knee scalars are identical', () => {
    const a = { twist_rad: .4, knee_value: 0, delta_leg_local: rotationX(-.4), samples: [{ index: 10, tab_foot_local: [0, 0, .02], nearest_shell_foot_local: [0, 0, .019] }] };
    const b = { ...a, delta_leg_local: multiply(rotationZ(.2), a.delta_leg_local), samples: [{ index: 10, tab_foot_local: [0, .006, .02], nearest_shell_foot_local: [0, .006, .018] }] };
    const result = spawnSync('python3', ['tools/blender/catalog/f02_ankle_fields.py'], { input: JSON.stringify({ a, b }), encoding: 'utf8' });
    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({ twist_difference_rad: 0, knee_value_difference: 0 });
    expect(JSON.parse(result.stdout).local_rotation_difference_rad).toBeCloseTo(.2, 12);
    expect(JSON.parse(result.stdout).max_tab_difference_m).toBeCloseTo(.006, 12);
    expect(JSON.parse(result.stdout).max_gap_vector_difference_m).toBeCloseTo(.001, 12);
    expect(spawnSync('python3', ['tools/blender/catalog/f02_ankle_fields.py'], { input: JSON.stringify({ a, b: { ...b, samples: [{ ...b.samples[0], index: 11 }] } }), encoding: 'utf8' }).status).toBe(1);
  });
});
