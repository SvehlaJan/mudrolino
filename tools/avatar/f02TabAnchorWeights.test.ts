import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const fixture = {
  detail_ids: [0, 1, 2, 3],
  original_weights: { '0': { LeftFoot: 0.9, LeftLeg: 0.1 }, '1': { LeftFoot: 0.5, LeftLeg: 0.5 }, '2': { RightFoot: 0.9, RightLeg: 0.1 }, '3': { RightFoot: 0.5, RightLeg: 0.5 }, '4': { LeftFoot: 1 } },
  anchors: [
    { side: 'Left', triangle: [10, 11, 12], factors: [0.2, 0.3, 0.5], weights: { LeftFoot: 0.9, LeftLeg: 0.1 }, vertices: [0, 1] },
    { side: 'Right', triangle: [20, 21, 22], factors: [0.2, 0.3, 0.5], weights: { RightFoot: 0.9, RightLeg: 0.1 }, vertices: [2, 3] },
  ],
  expected_detail_vertices: 4,
};
function plan(input = fixture) {
  const result = spawnSync('python3', ['tools/blender/catalog/f02_tab_anchor_plan.py'], { input: JSON.stringify(input), encoding: 'utf8' });
  return { ...result, value: result.status === 0 ? JSON.parse(result.stdout) : undefined };
}
describe('F02 basal shell weight contract', () => {
  it('binds only audited detail vertices to their actual basal triangle weights and retains provenance', () => {
    const result = plan();
    expect(result.status, result.stderr).toBe(0);
    expect(result.value.weights['1']).toEqual(fixture.anchors[0].weights);
    expect(result.value.weights['3']).toEqual(fixture.anchors[1].weights);
    expect(result.value.weights['4']).toEqual(fixture.original_weights['4']);
    expect(result.value.changes.map((row: { index: number }) => row.index)).toEqual([1, 3]);
    expect(result.value.changes[0]).toMatchObject({ old: fixture.original_weights['1'], new: fixture.anchors[0].weights, triangle: [10, 11, 12], factors: [0.2, 0.3, 0.5] });
  });
  it('rejects missing, duplicated and unaudited column membership', () => {
    expect(plan({ ...fixture, detail_ids: [0, 1, 2] }).status).toBe(1);
    expect(plan({ ...fixture, anchors: [fixture.anchors[0], { ...fixture.anchors[1], vertices: [1, 2, 3] }] }).status).toBe(1);
    expect(plan({ ...fixture, anchors: [fixture.anchors[0], { ...fixture.anchors[1], vertices: [2, 4] }] }).status).toBe(1);
  });
  it('rejects unnormalized, opposite-side and invalid triangle evidence', () => {
    expect(plan({ ...fixture, anchors: [{ ...fixture.anchors[0], weights: { LeftFoot: 0.9, LeftLeg: 0.2 } }, fixture.anchors[1]] }).status).toBe(1);
    expect(plan({ ...fixture, anchors: [{ ...fixture.anchors[0], weights: { RightFoot: 0.9, RightLeg: 0.1 } }, fixture.anchors[1]] }).status).toBe(1);
    expect(plan({ ...fixture, anchors: [{ ...fixture.anchors[0], factors: [0.2, 0.3, 0.6] }, fixture.anchors[1]] }).status).toBe(1);
  });
});
