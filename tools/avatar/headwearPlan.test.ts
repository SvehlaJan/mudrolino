import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

function run(request: Record<string, unknown>) {
  const result = spawnSync('python3', ['tools/blender/catalog/catalog_headwear_plan.py'], { input: JSON.stringify(request), encoding: 'utf8' });
  return { ...result, value: result.status === 0 ? JSON.parse(result.stdout) : undefined };
}

const pivot = [0, -0.0071, 1.4688];
const FRONT = -Math.PI / 2, BACK = Math.PI / 2;

describe('head scale and landmarks', () => {
  it('scales about the Head pivot, so the pivot stays fixed and distances grow by the scale', () => {
    expect(run({ op: 'scaled_point', point: pivot, pivot, scale: 1.3 }).value).toEqual(pivot);
    const top = run({ op: 'scaled_point', point: [0, 0.012, 1.78], pivot, scale: 1.3 }).value;
    expect(top[2] - pivot[2]).toBeCloseTo((1.78 - pivot[2]) * 1.3, 10);
  });
  it('rejects implausible scales and unknown heads', () => {
    expect(run({ op: 'scaled_point', point: [0, 0, 0], pivot, scale: 3 }).status).toBe(1);
    expect(run({ op: 'head_landmarks', head: 'H09', pivot, scale: 1 }).status).toBe(1);
  });
  it('places H01 brows above its ears and moves every landmark up with a larger head', () => {
    const base = run({ op: 'head_landmarks', head: 'H01', pivot, scale: 1 }).value;
    const big = run({ op: 'head_landmarks', head: 'H01', pivot, scale: 1.3 }).value;
    expect(base.brow_z).toBeCloseTo(1.685, 6);
    expect(base.ear_top_z).toBeCloseTo(1.644, 6);
    for (const key of ['brow_z', 'ear_top_z']) expect(big[key]).toBeGreaterThan(base[key]);
    expect(big.skull_centre[2]).toBeGreaterThan(base.skull_centre[2]);
  });
});

describe('hanging hair under a larger head', () => {
  const taper = { scale: 1.3, z_full: 1.56, z_tip: 1.42, tip_scale: 1.08 };
  it('grows hair with the head above the jaw and eases the tips toward their original length', () => {
    expect(run({ op: 'hair_hang_scale', z: 1.7, ...taper }).value).toBeCloseTo(1.3, 10);
    expect(run({ op: 'hair_hang_scale', z: 1.40, ...taper }).value).toBeCloseTo(1.08, 10);
    const mid = run({ op: 'hair_hang_scale', z: 1.49, ...taper }).value;
    expect(mid).toBeGreaterThan(1.08);
    expect(mid).toBeLessThan(1.3);
  });
  it('rejects an inverted range or a tip scale outside 1..scale', () => {
    expect(run({ op: 'hair_hang_scale', z: 1.5, ...taper, z_tip: 1.6 }).status).toBe(1);
    expect(run({ op: 'hair_hang_scale', z: 1.5, ...taper, tip_scale: 1.4 }).status).toBe(1);
  });
});

describe('rear hair shortening', () => {
  const rule = { z_from: 1.59, fraction: 0.2, y_start: 0.04, y_full: 0.1 };
  it('raises rear tips by the fraction of their hanging length and leaves hair above z_from alone', () => {
    expect(run({ op: 'shorten_rear_hair', z: 1.39, y: 0.15, ...rule }).value).toBeCloseTo(1.59 - 0.2 * 0.8, 10);
    expect(run({ op: 'shorten_rear_hair', z: 1.65, y: 0.15, ...rule }).value).toBe(1.65);
  });
  it('keeps face-framing locks in front of the head at full length', () => {
    expect(run({ op: 'shorten_rear_hair', z: 1.39, y: -0.05, ...rule }).value).toBe(1.39);
    const mid = run({ op: 'shorten_rear_hair', z: 1.39, y: 0.07, ...rule }).value;
    expect(mid).toBeGreaterThan(1.39);
    expect(mid).toBeLessThan(1.43);
  });
  it('rejects removing the whole length or an inverted blend', () => {
    expect(run({ op: 'shorten_rear_hair', z: 1.39, y: 0.15, ...rule, fraction: 1 }).status).toBe(1);
    expect(run({ op: 'shorten_rear_hair', z: 1.39, y: 0.15, ...rule, y_start: 0.2 }).status).toBe(1);
  });
});

describe('cap band', () => {
  it('passes exactly through the requested front, side and back heights', () => {
    const heights = { front: 1.70, side: 1.66, back: 1.62 };
    expect(run({ op: 'band_height', azimuth: FRONT, ...heights }).value).toBeCloseTo(1.70, 10);
    expect(run({ op: 'band_height', azimuth: BACK, ...heights }).value).toBeCloseTo(1.62, 10);
    expect(run({ op: 'band_height', azimuth: 0, ...heights }).value).toBeCloseTo(1.66, 10);
    expect(run({ op: 'band_height', azimuth: Math.PI, ...heights }).value).toBeCloseTo(1.66, 10);
  });
  it('derives band offsets from landmarks and scales them with the head', () => {
    const landmarks = run({ op: 'head_landmarks', head: 'H01', pivot, scale: 1.3 }).value;
    const band = run({ op: 'band_heights', landmarks, front_above_brow: 0.02, side_above_ear: 0.01, back_above_centre: 0 }).value;
    expect(band.front).toBeCloseTo(landmarks.brow_z + 0.026, 10);
    expect(band.side).toBeCloseTo(landmarks.ear_top_z + 0.013, 10);
    expect(band.back).toBeCloseTo(landmarks.skull_centre[2], 10);
  });
  it('keeps the front above the sides on a head with low painted brows', () => {
    const landmarks = run({ op: 'head_landmarks', head: 'H02', pivot, scale: 1.3 }).value;
    const offsets = { front_above_brow: 0.02, side_above_ear: 0.006, back_above_centre: -0.01 };
    // H02's brow offset alone would put the front below the sides; it is clamped to the side height.
    expect(landmarks.brow_z + 0.02 * 1.3).toBeLessThan(landmarks.ear_top_z + 0.006 * 1.3);
    const clamped = run({ op: 'band_heights', landmarks, ...offsets }).value;
    expect(clamped.front).toBeCloseTo(clamped.side, 10);
    const band = run({ op: 'band_heights', landmarks, ...offsets, front_rise_over_side: 0.055 }).value;
    expect(band.front - band.side).toBeCloseTo(0.055 * 1.3, 10);
  });
});

describe('under-hat hair', () => {
  const rule = { skull_radius: 0.15, layer: 0.008, tuck: 0.01, blend: 0.025 };
  it('flattens hair above and just below the band to the layer limit', () => {
    expect(run({ op: 'under_hat_radius', radius: 0.20, depth_below_band: -0.05, ...rule }).value).toBeCloseTo(0.158, 10);
    expect(run({ op: 'under_hat_radius', radius: 0.20, depth_below_band: 0.01, ...rule }).value).toBeCloseTo(0.158, 10);
  });
  it('never pushes thin hair or skin outward and releases hair smoothly further down', () => {
    expect(run({ op: 'under_hat_radius', radius: 0.152, depth_below_band: -0.05, ...rule }).value).toBe(0.152);
    expect(run({ op: 'under_hat_radius', radius: 0.20, depth_below_band: 0.05, ...rule }).value).toBe(0.20);
    const mid = run({ op: 'under_hat_radius', radius: 0.20, depth_below_band: 0.0225, ...rule }).value;
    expect(mid).toBeGreaterThan(0.158);
    expect(mid).toBeLessThan(0.20);
  });
  it('presses a hair-variant shell flat to the layer, raising curl valleys, and keeps tucked edges', () => {
    // Thick hair and a curl valley both end up exactly at the layer under the band.
    expect(run({ op: 'pressed_shell_radius', radius: 0.20, depth_below_band: -0.05, ...rule }).value).toBeCloseTo(0.158, 10);
    expect(run({ op: 'pressed_shell_radius', radius: 0.153, depth_below_band: -0.05, ...rule }).value).toBeCloseTo(0.158, 10);
    // Edges tucked under the skin stay where they are.
    expect(run({ op: 'pressed_shell_radius', radius: 0.149, depth_below_band: -0.05, ...rule }).value).toBe(0.149);
    // Below the band it eases back to the original shell.
    expect(run({ op: 'pressed_shell_radius', radius: 0.20, depth_below_band: 0.05, ...rule }).value).toBeCloseTo(0.20, 10);
  });
  it('rejects a non-positive layer', () => {
    expect(run({ op: 'pressed_shell_radius', radius: 0.2, depth_below_band: 0, ...rule, layer: 0 }).status).toBe(1);
    expect(run({ op: 'under_hat_radius', radius: 0.2, depth_below_band: 0, ...rule, layer: 0 }).status).toBe(1);
  });
});

describe('crown ease', () => {
  it('lifts only the front panels and leaves the band and top at base ease', () => {
    const ease = (azimuth: number, height_fraction: number) =>
      run({ op: 'crown_ease', azimuth, height_fraction, base: 0.003, front_lift: 0.008 }).value;
    expect(ease(BACK, 0.5)).toBeCloseTo(0.003, 10);
    expect(ease(FRONT, 0)).toBeCloseTo(0.003, 10);
    expect(ease(FRONT, 1)).toBeCloseTo(0.003, 10);
    expect(ease(FRONT, 0.5)).toBeCloseTo(0.011, 10);
  });
});

describe('headwear fit gate', () => {
  const snug = { crown_gaps_mm: Array(100).fill(6), band_gaps_mm: Array(20).fill(3), intersections: { head: 0, body: 0 } };
  it('passes a snug, non-intersecting cap', () => {
    const result = run({ op: 'fit_gate', ...snug }).value;
    expect(result.passed).toBe(true);
    expect(result.crown.share_within_max).toBe(1);
  });
  it('fails a floating crown like the original A01 even without intersections', () => {
    const result = run({ op: 'fit_gate', ...snug, crown_gaps_mm: [...Array(50).fill(8), ...Array(50).fill(100)] }).value;
    expect(result.passed).toBe(false);
    expect(result.failures.join()).toContain('crown gap');
  });
  it('lets the band bridge a single hair edge but fails a loose band', () => {
    expect(run({ op: 'fit_gate', ...snug, band_gaps_mm: [...Array(19).fill(3), 13] }).value.passed).toBe(true);
    expect(run({ op: 'fit_gate', ...snug, band_gaps_mm: [...Array(10).fill(3), ...Array(10).fill(9)] }).value.passed).toBe(false);
    expect(run({ op: 'fit_gate', ...snug, band_gaps_mm: [...Array(19).fill(3), 20] }).value.passed).toBe(false);
  });
  it('fails a penetrating crown and any intersection', () => {
    expect(run({ op: 'fit_gate', ...snug, crown_gaps_mm: [6, -2] }).value.passed).toBe(false);
    expect(run({ op: 'fit_gate', ...snug, intersections: { head: 233 } }).value.passed).toBe(false);
  });
  it('rejects missing samples', () => {
    expect(run({ op: 'fit_gate', ...snug, crown_gaps_mm: [] }).status).toBe(1);
  });
});
