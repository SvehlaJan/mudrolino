import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

function run(request: Record<string, unknown>) {
  const result = spawnSync('python3', ['tools/blender/catalog/catalog_glasses_plan.py'], { input: JSON.stringify(request), encoding: 'utf8' });
  return { ...result, value: result.status === 0 ? JSON.parse(result.stdout) : undefined };
}

const pivot = [0, -0.0071, 1.4688];

describe('glasses layout from the painted eyes', () => {
  it('places mirrored eye centres that move apart and up with a larger head', () => {
    const base = run({ op: 'eye_centres', head: 'H01', pivot, scale: 1 }).value;
    const big = run({ op: 'eye_centres', head: 'H01', pivot, scale: 1.3 }).value;
    expect(base[0][0]).toBeCloseTo(0.056, 9);
    expect(base[1][0]).toBeCloseTo(-0.056, 9);
    expect(base[0][1]).toBeCloseTo(1.608 + 0.026, 9);
    expect(big[0][0]).toBeCloseTo(0.056 * 1.3, 9);
    expect(big[0][1]).toBeGreaterThan(base[0][1]);
    expect(run({ op: 'eye_centres', head: 'H09', pivot, scale: 1 }).status).toBe(1);
  });
  it('sizes lenses from each eye opening, round for A03, wider than tall for A04, with a bridge gap', () => {
    for (const head of ['H01', 'H02']) {
      const round = run({ op: 'frame_layout', head, design: 'A03', pivot, scale: 1.3 }).value;
      const square = run({ op: 'frame_layout', head, design: 'A04', pivot, scale: 1.3 }).value;
      expect(round.lens_half_width).toBeCloseTo(round.lens_half_height, 12);
      expect(square.lens_half_width).toBeGreaterThan(square.lens_half_height);
      for (const layout of [round, square]) expect(layout.bridge_gap).toBeGreaterThan(2 * layout.rim.radial);
    }
    expect(run({ op: 'frame_layout', head: 'H01', design: 'A09', pivot, scale: 1.3 }).status).toBe(1);
  });
  it('draws a circle for exponent 2 and a squarer outline for larger exponents', () => {
    const circle = run({ op: 'lens_outline', exponent: 2, half_width: 1, half_height: 1, segments: 16 }).value;
    for (const [u, v] of circle) expect(Math.hypot(u, v)).toBeCloseTo(1, 9);
    const square = run({ op: 'lens_outline', exponent: 4.5, half_width: 1, half_height: 1, segments: 16 }).value;
    expect(Math.hypot(...square[2])).toBeGreaterThan(Math.hypot(...circle[2]));
    expect(run({ op: 'lens_outline', exponent: 1, half_width: 1, half_height: 1 }).status).toBe(1);
  });
  it('runs temples back from the hinge and bends the tip down behind the ear', () => {
    const path = run({ op: 'temple_path', hinge: [0.12, -0.2, 1.7], ear: [0.18, 0.02, 1.71], drop: 0.02 }).value;
    expect(path[0]).toEqual([0.12, -0.2, 1.7]);
    const tip = path[path.length - 1];
    expect(tip[1]).toBeGreaterThan(0.02);
    expect(tip[2]).toBeCloseTo(1.71 - 0.02, 9);
    expect(run({ op: 'temple_path', hinge: [0, 0.1, 1.7], ear: [0, 0, 1.7], drop: 0.02 }).status).toBe(1);
  });
});
