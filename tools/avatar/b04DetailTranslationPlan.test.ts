import { spawnSync } from 'node:child_process';
import { expect, it } from 'vitest';

const roles = [
  ['front pocket opening tube', 104], ['front pocket opening tube', 104],
  ['fly seam tube', 136], ['waist button', 114],
  ['rounded back pocket patch', 242], ['rounded back pocket patch', 242],
  ...Array.from({ length: 5 }, () => ['belt loop', 20]),
] as const;
let nextIndex = 0;
const components = roles.map(([role, count], component) => ({
  component, role,
  vertices: Array.from({ length: Number(count) }, () => nextIndex++),
  materials: [role === 'waist button' ? 'A navy tapered trouser button' : 'A ivory tapered trouser pockets and seams'],
}));

function plan(input: { components: typeof components; front_offset_m?: number; pocket_offset_m?: number }) {
  return spawnSync('python3', ['tools/blender/catalog/b04_detail_translation_plan.py'], {
    input: JSON.stringify(input), encoding: 'utf8',
  });
}

it('moves exactly six diagnosed components and 942 vertices while excluding all belt loops', () => {
  const result = plan({ components, front_offset_m: 0.002, pocket_offset_m: 0.003 });
  expect(result.status, result.stderr).toBe(0);
  const moves = JSON.parse(result.stdout);
  expect(moves).toHaveLength(6);
  expect(moves.reduce((count: number, move: { vertices: number[] }) => count + move.vertices.length, 0)).toBe(942);
  expect(moves.map((move: { offset_m: number[] }) => move.offset_m)).toEqual([
    [0, -0.002, 0], [0, -0.002, 0], [0, -0.0015, 0], [0, -0.0012, 0], [0, 0.003, 0], [0, 0.003, 0],
  ]);
});

it('refuses shifts outside the bounded construction allowance', () => {
  const result = plan({ components, front_offset_m: 0.0026 });
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('Front-detail shift exceeds bound');
  const pocket = plan({ components, pocket_offset_m: 0.0036 });
  expect(pocket.status).toBe(1);
  expect(pocket.stderr).toContain('Pocket shift exceeds bound');
});

it('refuses changed component topology and duplicate vertex membership', () => {
  const changed = structuredClone(components);
  changed[0].vertices.pop();
  const result = plan({ components: changed });
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('Authored component count changed');
  const duplicate = structuredClone(components);
  duplicate[1].vertices[0] = duplicate[0].vertices[0];
  const overlap = plan({ components: duplicate });
  expect(overlap.status).toBe(1);
  expect(overlap.stderr).toContain('Overlapping detail components');
});

it('refuses material identity changes rather than moving unrelated geometry', () => {
  const changed = structuredClone(components);
  changed[0].materials = ['A ivory tapered trouser fabric'];
  const result = plan({ components: changed });
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('Unexpected detail material');
});
