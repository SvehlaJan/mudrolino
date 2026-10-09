import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

function run(request: Record<string, unknown>) {
  const result = spawnSync('python3', ['tools/blender/catalog/catalog_hair_plan.py'], { input: JSON.stringify(request), encoding: 'utf8' });
  return { ...result, value: result.status === 0 ? JSON.parse(result.stdout) : undefined };
}

const pivot = [0, -0.0071, 1.4688];

describe('hair variants on the reusable selfie heads', () => {
  it('measures the angle from the face, mirrored left and right', () => {
    expect(run({ op: 'front_angle', x: 0, y: -1 }).value).toBeCloseTo(0, 12);
    expect(run({ op: 'front_angle', x: 1, y: 0 }).value).toBeCloseTo(Math.PI / 2, 12);
    expect(run({ op: 'front_angle', x: -1, y: 0 }).value).toBeCloseTo(Math.PI / 2, 12);
    expect(run({ op: 'front_angle', x: 0, y: 1 }).value).toBeCloseTo(Math.PI, 12);
  });
  it('keeps every hairline above the painted brows at the front and lower at the back', () => {
    for (const [style, brow] of [['H03', 0.019], ['H05', 0.019], ['H04', 0.077]] as const) {
      const front = run({ op: 'hairline_height', style, angle: 0 }).value;
      const back = run({ op: 'hairline_height', style, angle: Math.PI }).value;
      expect(front).toBeGreaterThan(brow + 0.02);
      expect(back).toBeLessThan(front);
    }
    // Curls reach the jaw at the sides; the crop stays above the ear top (36 mm).
    expect(run({ op: 'hairline_height', style: 'H03', angle: (95 * Math.PI) / 180 }).value).toBeLessThan(-0.1);
    expect(run({ op: 'hairline_height', style: 'H04', angle: Math.PI / 2 }).value).toBeGreaterThan(0.036);
    expect(run({ op: 'hairline_height', style: 'H06', angle: 0 }).status).toBe(1);
    expect(run({ op: 'hairline_height', style: 'H09', angle: 0 }).status).toBe(1);
  });
  it('sinks the edge under the skin and grows to full volume plus lumps inside the hairline', () => {
    const outside = run({ op: 'offset', style: 'H03', angle: 0, elevation: 0.8, above_line: -0.01, lumps: 1 }).value;
    expect(outside).toBeCloseTo(-0.0015, 12);
    const plain = run({ op: 'offset', style: 'H03', angle: 0, elevation: 0.8, above_line: 0.2, lumps: 0 }).value;
    const lumpy = run({ op: 'offset', style: 'H03', angle: 0, elevation: 0.8, above_line: 0.2, lumps: 1 }).value;
    expect(plain).toBeCloseTo(run({ op: 'volume', style: 'H03', angle: 0, elevation: 0.8 }).value, 12);
    expect(lumpy).toBeGreaterThan(plain);
    const edge = run({ op: 'offset', style: 'H03', angle: 0, elevation: 0.8, above_line: 0.01, lumps: 0 }).value;
    expect(edge).toBeGreaterThan(outside);
    expect(edge).toBeLessThan(plain);
  });
  it('blends volume from front to back and toward the crown, with smoother crop sides', () => {
    const front = run({ op: 'volume', style: 'H04', angle: 0, elevation: 0 }).value;
    const side = run({ op: 'volume', style: 'H04', angle: Math.PI / 2, elevation: 0 }).value;
    const crown = run({ op: 'volume', style: 'H04', angle: Math.PI / 2, elevation: Math.PI / 2 }).value;
    expect(front).toBeCloseTo(0.012, 12);
    expect(side).toBeCloseTo(0.006, 12);
    expect(crown).toBeCloseTo(0.016, 12);
    const sideLumps = run({ op: 'offset', style: 'H04', angle: Math.PI / 2, elevation: 0, above_line: 1, lumps: 1 }).value - side;
    const crownLumps = run({ op: 'offset', style: 'H04', angle: Math.PI / 2, elevation: Math.PI / 2, above_line: 1, lumps: 1 }).value - crown;
    expect(sideLumps).toBeLessThan(crownLumps);
  });
  it('shapes ball curls with steep sides and soft waves that ease in', () => {
    expect(run({ op: 'lump', distance: 0, radius: 0.1, profile: 'ball' }).value).toBeCloseTo(1, 12);
    expect(run({ op: 'lump', distance: 0.1, radius: 0.1 }).value).toBeCloseTo(0, 12);
    expect(run({ op: 'lump', distance: 0.08, radius: 0.1, profile: 'ball' }).value)
      .toBeGreaterThan(run({ op: 'lump', distance: 0.08, radius: 0.1, profile: 'soft' }).value);
    expect(run({ op: 'lump', distance: 0, radius: 0 }).status).toBe(1);
    expect(run({ op: 'lump', distance: 0, radius: 0.1, profile: 'spiky' }).status).toBe(1);
  });
  it('spreads lump centres evenly and deterministically over the sphere', () => {
    const centres: number[][] = run({ op: 'lump_centres', count: 200 }).value;
    expect(centres).toHaveLength(200);
    for (const c of centres) expect(Math.hypot(c[0], c[1], c[2])).toBeCloseTo(1, 9);
    const mean = [0, 1, 2].map(axis => centres.reduce((sum, c) => sum + c[axis], 0) / centres.length);
    for (const m of mean) expect(Math.abs(m)).toBeLessThan(0.02);
    expect(run({ op: 'lump_centres', count: 200 }).value).toEqual(centres);
    for (let index = 0; index < 20; index += 1) {
      const size = run({ op: 'lump_scale', index, jitter: 0.3 }).value;
      expect(size).toBeGreaterThanOrEqual(0.7);
      expect(size).toBeLessThanOrEqual(1);
    }
    expect(run({ op: 'lump_scale', index: 1, jitter: 1 }).status).toBe(1);
  });
  it('places mirrored painted features that hair must not hide, scaled with the head', () => {
    const female = run({ op: 'feature_points', head: 'H02', pivot, scale: 1.3 }).value;
    expect(female).toHaveLength(13);
    expect(female[0][0]).toBeCloseTo(-female[1][0], 12);
    const base = run({ op: 'feature_points', head: 'H01', pivot, scale: 1 }).value;
    expect(base[0][0]).toBeCloseTo(0.056, 12);
    expect(base[0][1]).toBeCloseTo(1.608 + 0.026, 12);
    expect(run({ op: 'feature_points', head: 'H07', pivot, scale: 1 }).status).toBe(1);
  });
});
