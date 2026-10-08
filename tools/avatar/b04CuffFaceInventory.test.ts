import { spawnSync } from 'node:child_process';
import { expect, it } from 'vitest';
function equal(expected: number[][], actual: number[][]) {
  const result = spawnSync('python3', ['tools/blender/catalog/b04_cuff_face_inventory.py'], { input: JSON.stringify({ expected, actual }), encoding: 'utf8' });
  expect(result.status, result.stderr).toBe(0);
  return JSON.parse(result.stdout);
}
it('accepts reordered faces and cyclic corner rotations without changing winding', () => {
  expect(equal([[1, 2, 3, 4], [5, 6, 7]], [[6, 7, 5], [3, 4, 1, 2]])).toBe(true);
});
it('rejects reversed winding, missing, duplicate and changed faces', () => {
  const faces = [[1, 2, 3, 4], [5, 6, 7]];
  expect(equal(faces, [[4, 3, 2, 1], [5, 6, 7]])).toBe(false);
  expect(equal(faces, [[1, 2, 3, 4]])).toBe(false);
  expect(equal(faces, [...faces, [1, 2, 3, 4]])).toBe(false);
  expect(equal(faces, [[1, 2, 3, 8], [5, 6, 7]])).toBe(false);
});
