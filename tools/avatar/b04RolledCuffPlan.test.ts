import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

type Point = [number, number, number];
function fixture() {
  const points: Point[] = [], normals: Point[] = [], capFaces: number[][] = [];
  for (const cx of [-.144, .144]) {
    const start = points.length;
    for (const [radius, outward] of [[.072, 1], [.0695, -1]]) for (let i = 0; i < 8; i++) {
      const a = 2 * Math.PI * i / 8;
      points.push([cx + radius * Math.cos(a), .052 + radius * Math.sin(a), .135]);
      normals.push([outward * Math.cos(a), outward * Math.sin(a), 0]);
    }
    for (let i = 0; i < 8; i++) { const j = (i + 1) % 8; capFaces.push([start + j, start + i, start + 8 + i, start + 8 + j]); }
  }
  return { points, normals, cap_faces: capFaces, centers: { Left: [.144, .052], Right: [-.144, .052] }, bend_radius_m: .003, return_height_m: .025 };
}
function plan(input = fixture()) {
  const result = spawnSync('python3', ['tools/blender/catalog/b04_rolled_cuff_plan.py'], { input: JSON.stringify(input), encoding: 'utf8' });
  return { ...result, value: result.status === 0 ? JSON.parse(result.stdout) : undefined };
}
describe('B04 continuous returned cuff plan', () => {
  it('prunes new influences at the exporter cutoff before renormalizing, without inventing influences', () => {
    const command = 'import json,sys;sys.path.insert(0,"tools/blender/catalog");from b04_rolled_cuff_plan import export_skin_weights;print(json.dumps(export_skin_weights(json.load(sys.stdin))))';
    const result = spawnSync('python3', ['-c', command], { input: JSON.stringify({ RightLeg: .7, RightFoot: .2999, RightToeBase: .0001, Zero: 0, Tiny: .000001 }), encoding: 'utf8' });
    expect(result.status, result.stderr).toBe(0);
    const value = JSON.parse(result.stdout);
    expect(Object.keys(value)).toEqual(['RightLeg', 'RightFoot']);
    expect(value.RightLeg + value.RightFoot).toBeCloseTo(1, 12);
    expect(value.RightLeg).toBeCloseTo(.7 / .9999, 12);
    const invalid = spawnSync('python3', ['-c', command], { input: JSON.stringify({ RightFoot: .00009 }), encoding: 'utf8' });
    expect(invalid.status).not.toBe(0);
  });
  it('compresses only the returned band on its anatomical knee key, preserving the bend and opposite side', () => {
    const input = fixture();
    const command = 'import json,sys;sys.path.insert(0,"tools/blender/catalog");from b04_rolled_cuff_plan import plan_cuffs,returned_band_deltas;x=json.load(sys.stdin);p=plan_cuffs(**x);print(json.dumps({"plan":p,"deltas":returned_band_deltas(p,.014)}))';
    const result = spawnSync('python3', ['-c', command], { input: JSON.stringify(input), encoding: 'utf8' });
    expect(result.status, result.stderr).toBe(0);
    const { plan: value, deltas } = JSON.parse(result.stdout);
    for (const [i, row] of value.new_vertices.entries()) {
      for (const side of ['Left', 'Right']) {
        const delta = deltas[`knee_clearance_${side}`][i];
        expect(delta.slice(0, 2)).toEqual([0, 0]);
        if (row.side !== side || row.row < 4) expect(delta).toEqual([0, 0, 0]);
        else expect(delta[2]).toBeCloseTo(-.011 * (row.row - 3) / 3, 12);
      }
      if (row.row === 6) expect(row.point[2] + deltas[`knee_clearance_${row.side}`][i][2]).toBeCloseTo(.149, 12);
    }
  });
  it('binds every folded row to its own sewn hem anchor instead of the nearest upper cloth', () => {
    const input = fixture();
    const skin = input.points.map(p => ({ [p[0] >= 0 ? 'LeftLeg' : 'RightLeg']: .7, [p[0] >= 0 ? 'LeftFoot' : 'RightFoot']: .3 }));
    const command = 'import json,sys;sys.path.insert(0,"tools/blender/catalog");from b04_rolled_cuff_plan import plan_cuffs,hem_anchor_bindings;x=json.load(sys.stdin);print(json.dumps(hem_anchor_bindings(plan_cuffs(**x["plan"]),x["skin"])))';
    const result = spawnSync('python3', ['-c', command], { input: JSON.stringify({ plan: input, skin }), encoding: 'utf8' });
    expect(result.status, result.stderr).toBe(0);
    const bindings = JSON.parse(result.stdout);
    for (const [i, row] of plan(input).value.new_vertices.entries()) {
      expect(bindings[i].source_hem_vertex).toBe(row.source_hem_vertex);
      expect(bindings[i].weights).toEqual(skin[row.source_hem_vertex]);
    }
  });
  it('rejects invalid source skin and a collapsed or enlarged compression target', () => {
    const command = `import json,sys
sys.path.insert(0,"tools/blender/catalog")
from b04_rolled_cuff_plan import plan_cuffs,hem_anchor_bindings,returned_band_deltas
x=json.load(sys.stdin);p=plan_cuffs(**x)
skin=[{("LeftLeg" if v[0]>=0 else "RightLeg"):1.0} for v in x["points"]]
bad=skin.copy();bad[p["new_vertices"][0]["source_hem_vertex"]]={"Hips":1.0}
invalid=skin.copy();invalid[p["new_vertices"][0]["source_hem_vertex"]]={"RightLeg":.2}
for f in [lambda:hem_anchor_bindings(p,skin[:-1]),lambda:hem_anchor_bindings(p,bad),lambda:hem_anchor_bindings(p,invalid),lambda:returned_band_deltas(p,0),lambda:returned_band_deltas(p,.03)]:
 try:f()
 except ValueError:continue
 raise RuntimeError("Unsafe input accepted")
print("rejected")`;
    const result = spawnSync('python3', ['-c', command], { input: JSON.stringify(fixture()), encoding: 'utf8' });
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout.trim()).toBe('rejected');
  });
  it('extends only the hem boundary and retains original vertices and attachment indices', () => {
    const input = fixture(), result = plan(input);
    expect(result.status, result.stderr).toBe(0);
    expect(result.value.original_vertex_count).toBe(input.points.length);
    expect(result.value.removed_cap_faces).toEqual(input.cap_faces);
    expect(result.value.new_vertices).toHaveLength(224);
    expect(result.value.new_vertices.every((v: { point: Point; source_hem_vertex: number }) => v.point[2] >= .125 && v.point[2] <= .17 && v.source_hem_vertex < input.points.length)).toBe(true);
    expect(result.value.original_positions_changed).toBe(false);
  });
  it('returns fabric upward with a separate inner/outer surface rather than a widened hem', () => {
    const result = plan().value;
    const tip = result.new_vertices.filter((v: { row: number }) => v.row === 6);
    expect(tip.every((v: { point: Point }) => Math.abs(v.point[2] - .16) < 1e-12)).toBe(true);
    for (const side of ['Left', 'Right']) {
      const center = side === 'Left' ? .144 : -.144;
      const widths = tip.filter((v: { side: string }) => v.side === side).map((v: { point: Point }) => Math.hypot(v.point[0] - center, v.point[1] - .052));
      expect(Math.min(...widths)).toBeCloseTo(.078, 12);
      expect(Math.max(...widths)).toBeCloseTo(.0805, 12);
    }
    expect(Math.min(...result.new_vertices.map((v: { point: Point }) => v.point[2]))).toBeCloseTo(.1295, 12);
  });
  it('rejects an upper-leg boundary, disconnected caps and ambiguous layer assignments', () => {
    const upper = fixture(); upper.points.forEach(p => { p[2] = .82; }); expect(plan(upper).status).not.toBe(0);
    const open = fixture(); open.cap_faces.pop(); expect(plan(open).status).not.toBe(0);
    const wrong = fixture(); wrong.normals[0] = [0, 0, 1]; expect(plan(wrong).status).not.toBe(0);
  });
  it('rejects excessive fold height/radius and nonfinite input rather than changing the scope', () => {
    expect(plan({ ...fixture(), return_height_m: .2 }).status).not.toBe(0);
    expect(plan({ ...fixture(), bend_radius_m: .03 }).status).not.toBe(0);
    const bad = fixture(); bad.points[0][0] = NaN; expect(plan(bad).status).not.toBe(0);
  });
});
