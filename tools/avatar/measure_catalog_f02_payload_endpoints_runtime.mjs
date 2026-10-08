// Fresh actual Three LoopRepeat endpoint inventory, without runtime changes.
import fs from 'node:fs';
import crypto from 'node:crypto';
import { AnimationMixer } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { bindGarmentCorrectives } from '../../src/avatar/garmentCorrectives.ts';
const folder = process.argv.find(a => a.startsWith('--folder='))?.slice(9);
if (!folder) throw new Error('Use --folder=new-proof-dir');
const input = `${folder}/native-endpoints.json`, output = `${folder}/actual-three-endpoints.json`;
if (fs.existsSync(output)) throw new Error('Preserve existing proof');
const reference = JSON.parse(fs.readFileSync(input, 'utf8'));
const digest = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
for (const [p, hash] of Object.entries({ ...reference.asset_hashes, ...reference.tool_hashes })) if (digest(p) !== hash) throw new Error(`Changed dependency ${p}`);
async function load(p) { const b = fs.readFileSync(p); return new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), ''); }
const model = await load('assets/avatar/catalog-a/F02/fitting-revisions/independent-keys-repair/F02.glb');
const gaits = Object.fromEntries(await Promise.all(['walk', 'run'].map(async m => [m, await load(`assets/avatar/catalog-a/foundation/catalog-body-${m}.glb`)])));
function world() {
  model.scene.updateMatrixWorld(true); const result = {};
  model.scene.traverse(o => { if (o.isBone) result[o.name] = Array.from({ length: 4 }, (_, i) => Array.from({ length: 4 }, (_, j) => o.matrixWorld.elements[j * 4 + i])); });
  if (Object.keys(result).length !== 24) throw new Error('Incomplete rig');
  return result;
}
const bind = world(), binder = bindGarmentCorrectives([model.scene]), mixer = new AnimationMixer(model.scene);
const checks = reference.checks.map(row => {
  const clip = gaits[row.motion].animations[0];
  if (clip.duration !== reference.clips_seconds[row.motion]) throw new Error('Duration mismatch');
  mixer.stopAllAction(); const action = mixer.clipAction(clip).reset().play(); mixer.setTime(row.time_seconds);
  const matrices = world(); binder.update(); const knees = { Left: [], Right: [] };
  model.scene.traverse(o => {
    if (!o.isSkinnedMesh) return;
    for (const side of ['Left', 'Right']) { const i = o.morphTargetDictionary?.[`knee_clearance_${side}`]; if (i !== undefined) knees[side].push(o.morphTargetInfluences[i]); }
  });
  return { motion: row.motion, label: row.label, time_seconds: row.time_seconds, actual_action_time_seconds: action.time, world: matrices, knee_values: knees };
});
const report = { status: 'fresh actual Three LoopRepeat endpoint measurement', input_sha256: digest(input), asset_hashes: reference.asset_hashes, tool_hashes: Object.fromEntries([new URL(import.meta.url), 'src/avatar/garmentCorrectives.ts', 'package-lock.json'].map(p => [String(p), digest(p)])), bind_world: bind, checks };
fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ status: report.status, checks: checks.map(({ world, knee_values, ...row }) => row) }));
