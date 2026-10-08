// Read-only actual Three.js gait/binder inventory for F02 ankle diagnosis.
import fs from 'node:fs';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { AnimationMixer } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { bindGarmentCorrectives } from '../../src/avatar/garmentCorrectives.ts';

const output = process.argv.find(a => a.startsWith('--report='))?.slice(9);
if (!output || fs.existsSync(output)) throw new Error('Use --report=new-path; preserve existing evidence');
const modelPath = 'assets/avatar/catalog-a/F02/fitting-revisions/independent-keys-repair/F02.glb';
const gaitPaths = Object.fromEntries(['walk', 'run'].map(m => [m, `assets/avatar/catalog-a/foundation/catalog-body-${m}.glb`]));
const digest = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const expected = {
  [modelPath]: '47d2e2ba80e756b6d7bb5259c44759c0d381ce3e5985f251813e3a9caf7536aa',
  [gaitPaths.walk]: '237ef588534548ef9c990ea2c178306c7dbbfc48f8f8dbda287add7fbcf612fe',
  [gaitPaths.run]: '70a3ede13f421524286a85142c8ff34748275ec1be2a75b1a0b0de270dfed32f',
};
for (const [p, hash] of Object.entries(expected)) if (digest(p) !== hash) throw new Error(`Changed asset: ${p}`);
const helper = 'tools/blender/catalog/f02_ankle_measurement.py';
const schedule = spawnSync('python3', [helper], { input: JSON.stringify({ operation: 'schedule' }), encoding: 'utf8' });
if (schedule.status !== 0) throw new Error(schedule.stderr);
const rows = JSON.parse(schedule.stdout);
const fpsReference = 'assets/avatar/catalog-a/F02/fitting-revisions/independent-keys-repair/outfit/export-deformation-report.json';
const fps = JSON.parse(fs.readFileSync(fpsReference, 'utf8')).frames_per_second;
if (fps !== 24) throw new Error('Re-audit source fps');
async function load(p) {
  const b = fs.readFileSync(p);
  return new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), '');
}
const model = await load(modelPath);
const clips = Object.fromEntries(await Promise.all(Object.entries(gaitPaths).map(async ([m, p]) => [m, await load(p)])));
function world() {
  const matrices = {};
  model.scene.updateMatrixWorld(true);
  model.scene.traverse(o => {
    if (o.isBone) matrices[o.name] = Array.from({ length: 4 }, (_, i) => Array.from({ length: 4 }, (_, j) => o.matrixWorld.elements[j * 4 + i]));
  });
  if (Object.keys(matrices).length !== 24) throw new Error('Incomplete bone inventory');
  return matrices;
}
const bind = world();
const binder = bindGarmentCorrectives([model.scene]);
if (binder.count < 2) throw new Error('Existing knee morph binder missing');
const mixer = new AnimationMixer(model.scene);
const checks = rows.map(row => {
  mixer.stopAllAction();
  if (row.motion !== 'rest') {
    const animation = clips[row.motion].animations[0];
    if (clips[row.motion].animations.length !== 1) throw new Error('Ambiguous gait clip');
    mixer.clipAction(animation).reset().play();
    mixer.setTime(row.frame / fps);
  }
  const matrices = world();
  binder.update();
  const kneeValues = { Left: [], Right: [] };
  model.scene.traverse(o => {
    if (!o.isSkinnedMesh) return;
    for (const side of ['Left', 'Right']) {
      const index = o.morphTargetDictionary?.[`knee_clearance_${side}`];
      if (index !== undefined) kneeValues[side].push(o.morphTargetInfluences[index]);
    }
  });
  for (const side of ['Left', 'Right']) if (kneeValues[side].length === 0 || Math.max(...kneeValues[side]) - Math.min(...kneeValues[side]) > 1e-12) throw new Error('Inconsistent actual knee binder values');
  return { ...row, world: matrices, knee_values: kneeValues };
});
for (const [p, hash] of Object.entries(expected)) if (digest(p) !== hash) throw new Error(`Asset modified: ${p}`);
const tools = [new URL(import.meta.url), helper, 'src/avatar/garmentCorrectives.ts', fpsReference, 'package-lock.json'];
const report = { status: 'measured; no model/runtime correction', sampling: 'Actual Three.js AnimationMixer default LoopRepeat, neutral bind plus 163 exact matching gait samples', frames_per_second: fps, asset_hashes: expected, tool_hashes: Object.fromEntries(tools.map(p => [String(p), digest(p)])), bind_world: bind, binder_count: binder.count, clips: Object.fromEntries(Object.entries(clips).map(([m, c]) => [m, { duration_seconds: c.animations[0].duration, endpoint_frame: c.animations[0].duration * fps, loop: 'LoopRepeat' }])), checks };
fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ status: report.status, samples: checks.length, binder_count: binder.count, clips: report.clips }));
