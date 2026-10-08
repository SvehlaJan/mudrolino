import { spawnSync } from 'node:child_process';
import { expect, it } from 'vitest';

function fixture() {
  const basis = Array.from({ length: 350 }, () => [-0.1, 0, 0]);
  const right = basis.map(row => [...row]);
  const components = [
    { component: 0, role: 'front pocket opening tube', vertices: Array.from({ length: 104 }, (_, i) => i), materials: ['A ivory tapered trouser pockets and seams'] },
    { component: 4, role: 'rounded back pocket patch', vertices: Array.from({ length: 242 }, (_, i) => i + 104), materials: ['A ivory tapered trouser pockets and seams'] },
  ];
  return { basis, right, components,
    front_deltas: Object.fromEntries(components[0].vertices.map(i => [i, [0, -0.0005, 0]])),
    host_deltas: Object.fromEntries(components[1].vertices.map(i => [i, [0, 0.0069, 0]])),
  };
}
function plan(input: ReturnType<typeof fixture>) {
  return spawnSync('python3', ['tools/blender/catalog/b04_target_repair_plan.py'], { input: JSON.stringify(input), encoding: 'utf8' });
}
it('changes only the 346 eligible Right targets and preserves unrelated coordinates', () => {
  const input = fixture();
  const result = plan(input);
  expect(result.status, result.stderr).toBe(0);
  const output = JSON.parse(result.stdout);
  expect(output.changes).toHaveLength(346);
  expect(output.right.slice(346)).toEqual(input.right.slice(346));
  expect(output.right[0]).toEqual([-0.1, -0.0005, 0]);
  expect(output.right[104]).toEqual([-0.1, 0.0069, 0]);
});
it('rejects front lift and patch morph changes exceeding their separate bounds', () => {
  const front = fixture(); front.front_deltas[0] = [0, 0.000551, 0];
  expect(plan(front).stderr).toContain('Front corrective exceeds bound');
  const patch = fixture(); patch.host_deltas[104] = [0, 0.00701, 0];
  expect(plan(patch).stderr).toContain('Host morph change exceeds bound');
});
it('rejects altered component inventories, membership and material identity', () => {
  const count = fixture(); count.components[0].vertices.pop();
  expect(plan(count).stderr).toContain('Target component inventory changed');
  const extra = fixture(); extra.front_deltas[349] = [0, 0, 0];
  expect(plan(extra).stderr).toContain('Delta membership differs');
  const material = fixture(); material.components[1].materials = ['fabric'];
  expect(plan(material).stderr).toContain('Unexpected detail material');
});
it('rejects opposite-side targets, nonfinite coordinates and a topology change', () => {
  const left = fixture(); left.basis[0][0] = 0.1;
  expect(plan(left).stderr).toContain('Opposite-side target');
  const invalid = fixture(); invalid.front_deltas[0] = [0, Number.NaN, 0];
  expect(plan(invalid).status).toBe(1);
  const topology = fixture(); topology.right.pop();
  expect(plan(topology).stderr).toContain('Coordinate inventory changed');
});
