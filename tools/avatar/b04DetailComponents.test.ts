import { spawnSync } from 'node:child_process';
import { expect, it } from 'vitest';

it('finds disconnected authored details without merging components through nearby coordinates', () => {
  const result = spawnSync('python3', ['tools/blender/catalog/b04_detail_components.py'], {
    input: JSON.stringify({ vertex_count: 7, edges: [[3, 6], [0, 2], [2, 4], [6, 3], [1, 5]] }),
    encoding: 'utf8',
  });
  expect(result.status, result.stderr).toBe(0);
  expect(JSON.parse(result.stdout)).toEqual([[0, 2, 4], [1, 5], [3, 6]]);
});
