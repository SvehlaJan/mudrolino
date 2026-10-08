import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it } from 'vitest';
const directories: string[] = [];
afterEach(() => directories.splice(0).forEach(path => rmSync(path, { recursive: true, force: true })));
function directory() { const path = mkdtempSync(join(tmpdir(), 'b04-tool-inventory-')); directories.push(path); return path; }
function call(input: object) {
  return spawnSync('python3', ['tools/blender/catalog/b04_tool_inventory.py'], { input: JSON.stringify(input), encoding: 'utf8' });
}
it('captures transitive local helpers without importing bpy or scanning runtime paths', () => {
  const root = directory();
  writeFileSync(join(root, 'builder.py'), 'import bpy\nfrom signature import capture\n');
  writeFileSync(join(root, 'signature.py'), 'from prepare_body import action_curves\n');
  writeFileSync(join(root, 'prepare_body.py'), 'import sys\n');
  const result = call({ root, seeds: ['builder.py'] });
  expect(result.status, result.stderr).toBe(0);
  expect(Object.keys(JSON.parse(result.stdout)).map(path => path.split('/').at(-1))).toEqual(['builder.py', 'prepare_body.py', 'signature.py']);
});
it('refuses missing seeds, changed tools and deleted captured helpers', () => {
  const root = directory();
  expect(call({ root, seeds: ['missing.py'] }).stderr).toContain('Missing tool');
  writeFileSync(join(root, 'builder.py'), 'from helper import value\n');
  writeFileSync(join(root, 'helper.py'), 'value = 1\n');
  const snapshot = JSON.parse(call({ root, seeds: ['builder.py'] }).stdout);
  writeFileSync(join(root, 'helper.py'), 'value = 2\n');
  expect(call({ root, seeds: ['builder.py'], snapshot }).stderr).toContain('Tool drift');
  rmSync(join(root, 'helper.py'));
  expect(call({ root, seeds: ['builder.py'], snapshot }).stderr).toContain('Missing tool');
});
it('rejects paths outside the local inventory root and binds real signature dependencies', () => {
  const root = directory();
  expect(call({ root, seeds: ['../escape.py'] }).stderr).toContain('Local tool path required');
  const result = call({ root: 'tools/blender/catalog', seeds: ['repair_catalog_b04_left_patch_attachment.py'] });
  expect(result.status, result.stderr).toBe(0);
  const paths = Object.keys(JSON.parse(result.stdout));
  expect(paths).toContain('tools/blender/catalog/prepare_catalog_body.py');
  expect(paths).toContain('tools/blender/catalog/catalog_tee_geometry.py');
  expect(paths).toContain('tools/blender/catalog/b04_corrective_repair_plan.py');
});
