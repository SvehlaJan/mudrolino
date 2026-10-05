import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

type Sample = { x: number; z: number; bulge: number; anchor: boolean };
const helper = resolve('tools/blender/catalog/catalog_female_hood_geometry.py');
function samples(parameters: Record<string, number> = {}): Sample[][] {
  const result = spawnSync('python3', ['-c', `import importlib.util,json,sys
spec=importlib.util.spec_from_file_location('female_hood_geometry',sys.argv[1])
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
try:
 print(json.dumps(module.hood_sheet_samples(**json.loads(sys.argv[2]))))
except ValueError as error:
 print(str(error),file=sys.stderr);sys.exit(2)
`, helper, JSON.stringify(parameters)], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || String(result.error));
  return JSON.parse(result.stdout);
}

const invalidDimensions: Record<string, number>[] = [
    { half_width: 0 }, { half_width: -1 }, { depth: -.001 },
    { seam_z: 1.2 }, { bottom_z: 1.4 }, { bowl_start_z: 1.4 },
    { side_arch: -.01 }, { segments: 7 }, { rows: 3 }, { segments: 12.5 },
  ];

describe('fresh female lowered hood sheet', () => {
  it('imports and constructs without Blender or a scene', () => {
    expect(samples().flat().length).toBeGreaterThan(0);
  });
  it('keeps every quad nondegenerate with consistent exterior orientation', () => {
    const grid = samples({ segments: 24, rows: 20 });
    for (let row = 0; row < grid.length - 1; row++) {
      for (let column = 0; column < grid[row].length - 1; column++) {
        const a = grid[row][column], b = grid[row][column + 1];
        const c = grid[row + 1][column + 1], d = grid[row + 1][column];
        const posteriorCross = (p: Sample, q: Sample, r: Sample) =>
          (q.z - p.z) * (r.x - p.x) - (q.x - p.x) * (r.z - p.z);
        expect(posteriorCross(a, b, c)).toBeGreaterThan(1e-8);
        expect(posteriorCross(a, c, d)).toBeGreaterThan(1e-8);
      }
    }
  });
  it('keeps rows and columns ordered rather than folding an existing 3D shell', () => {
    const grid = samples();
    for (const row of grid) for (let column = 1; column < row.length; column++) {
      expect(row[column].x).toBeGreaterThan(row[column - 1].x);
    }
    for (let row = 1; row < grid.length; row++) for (let column = 0; column < grid[row].length; column++) {
      expect(grid[row][column].z).toBeLessThan(grid[row - 1][column].z);
    }
  });
  it('attaches only the upper seam and keeps the bowl below the tight hair band', () => {
    const grid = samples({ bowl_start_z: 1.3 });
    expect(grid[0].every(sample => sample.anchor && sample.bulge === 0)).toBe(true);
    expect(grid.slice(1).flat().every(sample => !sample.anchor)).toBe(true);
    expect(grid.flat().filter(sample => sample.z >= 1.3).every(sample => sample.bulge === 0)).toBe(true);
    const lowerBulges = grid.flat().filter(sample => sample.z < 1.3).map(sample => sample.bulge);
    expect(Math.max(...lowerBulges)).toBeGreaterThan(.005);
    expect(grid.flat().every(sample => sample.bulge >= 0)).toBe(true);
    expect(grid.every(row => row[0].bulge === 0 && row[row.length - 1].bulge === 0)).toBe(true);
  });
  it.each(invalidDimensions)('rejects invalid dimensions %j', parameters => {
    expect(() => samples(parameters)).toThrow();
  });
});
