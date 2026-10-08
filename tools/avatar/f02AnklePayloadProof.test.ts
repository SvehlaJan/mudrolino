import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

const evidence = 'assets/avatar/catalog-a/F02/fitting-revisions/heel-tab-shell-clearance-v1/diagnosis';
const locations = ['ankle-measurement/native-and-equivalent.json', 'ankle-measurement/actual-three.json', 'signed-payload-v1/native-endpoints.json', 'signed-payload-v1/actual-three-endpoints.json'];
type Row = { motion: string; frame?: number; label?: string; time_seconds?: number };
type Report = { modes?: Record<string, Row[]>; checks?: Row[]; input_sha256?: string };
function verify(mutate: (reports: Report[]) => void) {
  const root = mkdtempSync(join(tmpdir(), 'f02-payload-proof-'));
  mkdirSync(join(root, 'ankle-measurement')); mkdirSync(join(root, 'signed-payload-v1'));
  try {
    const reports: Report[] = locations.map(file => JSON.parse(readFileSync(join(evidence, file), 'utf8')));
    mutate(reports);
    reports[3].input_sha256 = createHash('sha256').update(JSON.stringify(reports[2])).digest('hex');
    locations.forEach((file, i) => writeFileSync(join(root, file), JSON.stringify(reports[i])));
    return spawnSync('python3', ['tools/avatar/verify_catalog_f02_ankle_payload.py', '--folder', join(root, 'signed-payload-v1')], { encoding: 'utf8' });
  } finally { rmSync(root, { recursive: true, force: true }); }
}
describe('F02 payload proof pose inventory', () => {
  it('accepts complete source-bound dense and exact loop-boundary inventories', () => {
    const result = verify(() => {});
    expect(result.status, result.stderr).toBe(0);
  });
  it.each(['native', 'raw-gltf-equivalent', 'actual-three', 'native-endpoints', 'three-endpoints'])('rejects a missing sample in %s', name => {
    const result = verify(reports => {
      if (name === 'actual-three') reports[1].checks!.pop();
      else if (name === 'native-endpoints') reports[2].checks!.pop();
      else if (name === 'three-endpoints') reports[3].checks!.pop();
      else reports[0].modes![name].pop();
    });
    expect(result.status, result.stdout).not.toBe(0);
  });
  it('rejects a relabelled equivalent frame even when matrices still match', () => {
    const result = verify(reports => { reports[0].modes!['raw-gltf-equivalent'][10].frame! += .1; });
    expect(result.status, result.stdout).not.toBe(0);
  });
  it('rejects a duplicated boundary label rather than counting it twice', () => {
    const result = verify(reports => { reports[2].checks![2].label = reports[2].checks![1].label; reports[3].checks![2].label = reports[3].checks![1].label; });
    expect(result.status, result.stdout).not.toBe(0);
  });
});
