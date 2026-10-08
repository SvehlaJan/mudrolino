import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

function solve(code: string) {
  const result = spawnSync('python3', ['-c', `import sys,json; sys.path.insert(0,'tools/blender/catalog'); from f02_ankle_witness_bracket import solve; ${code}`], { encoding: 'utf8' });
  return { ...result, value: result.status === 0 ? JSON.parse(result.stdout) : undefined };
}
describe('F02 single iso-angle witness bracket', () => {
  it('solves ascending and descending brackets without extrapolation', () => {
    for (const expression of ['solve(lambda x:x*x,.25,0,1)', 'solve(lambda x:1-x*x,.75,0,1)']) {
      const result = solve(`print(json.dumps(${expression}))`);
      expect(result.status, result.stderr).toBe(0);
      expect(result.value.frame).toBeCloseTo(.5, 8);
      expect(result.value.angle_error_rad).toBeLessThanOrEqual(1e-8);
      expect(result.value.evaluations).toHaveLength(3);
    }
  });
  it('retains exact endpoint solutions and rejects an unbracketed target', () => {
    expect(solve('print(json.dumps(solve(lambda x:x,.2,.2,.3)))').value.frame).toBe(.2);
    expect(solve('print(json.dumps(solve(lambda x:x,.4,.2,.3)))').status).not.toBe(0);
  });
  it('stops within the requested diagnostic bound and rejects nonfinite evaluations', () => {
    expect(solve('print(json.dumps(solve(lambda x:x*x,.2,0,1,max_iterations=1)))').status).not.toBe(0);
    expect(solve('print(json.dumps(solve(lambda x:float("nan"),.2,0,1)))').status).not.toBe(0);
  });
});
