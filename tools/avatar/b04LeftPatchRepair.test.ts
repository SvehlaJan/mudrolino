import { spawnSync } from 'node:child_process';
import { expect, it } from 'vitest';
function fixture() {
  const basis = Array.from({ length: 250 }, () => [0.1, 0, 0]);
  return { basis, left: basis.map(p => [...p]), component: { component: 5, role: 'rounded back pocket patch',
    vertices: Array.from({ length: 242 }, (_, i) => i), materials: ['A ivory tapered trouser pockets and seams'] },
  host_deltas: Object.fromEntries(Array.from({ length: 242 }, (_, i) => [i, [0, i < 154 ? 0.00436 : 0, 0]])) };
}
function plan(input: ReturnType<typeof fixture>) {
  return spawnSync('python3', ['tools/blender/catalog/b04_left_patch_repair_plan.py'], { input: JSON.stringify(input), encoding: 'utf8' });
}
it('changes only 154 nonmatching Left patch targets within the 242 eligible inventory', () => {
  const input = fixture(); const result = plan(input);
  expect(result.status, result.stderr).toBe(0);
  const output = JSON.parse(result.stdout);
  expect(output.changes).toHaveLength(154);
  expect(output.eligible_vertices).toHaveLength(242);
  expect(output.left.slice(154)).toEqual(input.left.slice(154));
});
it('rejects excess changes, opposite-side targets and altered component identity', () => {
  const excess = fixture(); excess.host_deltas[0] = [0, 0.004501, 0];
  expect(plan(excess).stderr).toContain('Left patch target change exceeds bound');
  const side = fixture(); side.basis[0][0] = -0.1;
  expect(plan(side).stderr).toContain('Opposite-side target');
  const component = fixture(); component.component.component = 4;
  expect(plan(component).stderr).toContain('Left patch inventory changed');
});
it('rejects changed count, incomplete delta inventory, material changes and topology changes', () => {
  const count = fixture(); count.component.vertices.pop();
  expect(plan(count).stderr).toContain('Left patch inventory changed');
  const delta = fixture(); delete delta.host_deltas[0];
  expect(plan(delta).stderr).toContain('Delta membership differs');
  const material = fixture(); material.component.materials = ['fabric'];
  expect(plan(material).stderr).toContain('Unexpected detail material');
  const topology = fixture(); topology.left.pop();
  expect(plan(topology).stderr).toContain('Coordinate inventory changed');
});
