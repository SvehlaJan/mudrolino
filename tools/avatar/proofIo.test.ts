import { spawnSync } from 'node:child_process';
import { expect, it } from 'vitest';

it('preserves JSON proof identity through compressed storage', () => {
  const result=spawnSync('python3',['tools/avatar/test_proof_io.py'],{encoding:'utf8'});
  expect(result.status,result.stderr).toBe(0);
  expect(result.stderr).toContain('Ran 3 tests');
});
