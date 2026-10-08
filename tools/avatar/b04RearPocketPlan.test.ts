import { spawnSync } from 'node:child_process';
import { expect, it } from 'vitest';

function patch(side: 'Left' | 'Right') {
  const sign = side === 'Left' ? 1 : -1;
  const id = (layer: number, row: number, col: number) => 1000 + ((layer * 121 + row * 11 + col) * 173) % 242;
  const vertices = [];
  const faces = [];
  for (let layer = 0; layer < 2; layer++) {
    for (let row = 0; row < 11; row++) for (let col = 0; col < 11; col++) {
      vertices.push({ index: id(layer, row, col), point: [sign * (.04 + col * .007), .18 - layer * .0012, .94 - row * .007] });
    }
    for (let row = 0; row < 10; row++) for (let col = 0; col < 10; col++) {
      const quad = [id(layer, row, col), id(layer, row, col + 1), id(layer, row + 1, col + 1), id(layer, row + 1, col)];
      if ((side === 'Right') !== (layer === 1)) quad.reverse();
      faces.push({ vertices: quad, normal: [0, layer === 0 ? 1 : -1, 0] });
    }
  }
  const boundary = [...Array.from({ length: 11 }, (_, c) => [0, c]), ...Array.from({ length: 10 }, (_, r) => [r + 1, 10]),
    ...Array.from({ length: 10 }, (_, c) => [10, 9 - c]), ...Array.from({ length: 9 }, (_, r) => [9 - r, 0])];
  for (let i = 0; i < boundary.length; i++) {
    const [r, c] = boundary[i]; const [nr, nc] = boundary[(i + 1) % boundary.length];
    faces.push({ vertices: [id(0, r, c), id(1, r, c), id(1, nr, nc), id(0, nr, nc)], normal: [0, 0, 1] });
  }
  return { side, vertices: vertices.reverse(), faces: faces.reverse() };
}

function run(input: unknown) {
  return spawnSync('python3', ['tools/blender/catalog/b04_rear_pocket_plan.py'], { input: JSON.stringify(input), encoding: 'utf8' });
}

it('recovers paired surfaces by topology despite scrambled indices and mirrored winding', () => {
  for (const side of ['Left', 'Right'] as const) {
    const result = run({ patch: patch(side) });
    expect(result.status, result.stderr).toBe(0);
    const plan = JSON.parse(result.stdout);
    expect(plan.nodes).toHaveLength(121);
    const upperInner = plan.nodes.find((n: { row: number; col: number }) => n.row === 0 && n.col === 0);
    const lowerInner = plan.nodes.find((n: { row: number; col: number }) => n.row === 10 && n.col === 0);
    expect(upperInner.xz).toEqual([side === 'Left' ? .033 : -.033, .92]);
    expect(lowerInner.xz[0]).toBeCloseTo((side === 'Left' ? 1 : -1) * .068);
    expect(lowerInner.xz[1]).toBeCloseTo(.82);
    expect(new Set(plan.nodes.flatMap((n: { outer: number; inner: number }) => [n.outer, n.inner])).size).toBe(242);
  }
});

it('rejects incomplete patch topology instead of guessing a grid', () => {
  const input = patch('Left'); input.faces.splice(input.faces.findIndex(f => f.normal[1] === 1), 1);
  expect(run({ patch: input }).status).not.toBe(0);
});

it('rejects an ambiguous layer pairing and footprint dimensions that cannot form round corners', () => {
  const input = patch('Right'); input.vertices[0].point = [...input.vertices[1].point];
  expect(run({ patch: input }).status).not.toBe(0);
  expect(run({ patch: patch('Left'), dimensions: { inner_x: .033, width: .1, top: .92, height: .1, radius: .06 } }).status).not.toBe(0);
});
