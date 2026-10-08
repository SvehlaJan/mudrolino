import { spawnSync } from 'node:child_process';
import { expect, it } from 'vitest';
const revision = 'assets/avatar/catalog-a/B04/fitting-revisions/independent-keys-repair/bilateral-targets-2026-10-07/cuff-construction-v1/export-compatible-candidate';
function plan(output = `${revision}/full-verification-v1`) {
  return spawnSync('python3', ['tools/avatar/b04_cuff_verification_plan.py'], { input: JSON.stringify({ revision, output }), encoding: 'utf8' });
}
it('checks the independent source and exact cap-free sneaker/high-top combinations', () => {
  const result = plan(); expect(result.status, result.stderr).toBe(0);
  const steps = JSON.parse(result.stdout);
  const assemblies = steps.filter((s: { name: string }) => s.name.endsWith('-assembly'));
  expect(assemblies.map((s: { args: string[] }) => s.args[s.args.indexOf('--pieces') + 1])).toEqual(['T01,B04,F01', 'T04,B04,F03']);
  expect(steps.some((s: { args: string[] }) => s.args.join(' ').includes('A01'))).toBe(false);
  const sweeps = steps.filter((s: { name: string }) => s.name.endsWith('-motion'));
  expect(sweeps).toHaveLength(3);
  expect(sweeps.every((s: { args: string[] }) => s.args.includes('--require-clear') && s.args[s.args.indexOf('--substeps') + 1] === '4')).toBe(true);
  const details = steps.filter((s: { name: string }) => s.name.endsWith('-details'));
  expect(details).toHaveLength(3);
  expect(details.every((s: { args: string[] }) => s.args.includes('--require-detail-clear') && s.args[s.args.indexOf('--threshold') + 1] === '.012')).toBe(true);
  expect(steps.filter((s: { name: string }) => s.name.endsWith('-runtime'))).toHaveLength(2);
});
it('writes new proof beneath a separate verification directory without rebuilding the candidate', () => {
  const result = plan(); expect(result.status, result.stderr).toBe(0);
  const steps = JSON.parse(result.stdout);
  expect(steps.some((s: { script: string }) => /repair_|build_catalog_b04/.test(s.script))).toBe(false);
  for (const step of steps) for (const flag of ['--report', '--output-dir', '--review-dir']) {
    if (step.args.includes(flag)) expect(step.args[step.args.indexOf(flag) + 1]).toContain('/full-verification-v1/');
  }
  expect(plan(revision).status).not.toBe(0);
  expect(plan('/private/tmp/proof').status).not.toBe(0);
});
