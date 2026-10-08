// Actual Three.js counterpart to one bounded native/raw-glTF iso-angle witness.
import fs from 'node:fs';
import crypto from 'node:crypto';
import { AnimationMixer } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { bindGarmentCorrectives } from '../../src/avatar/garmentCorrectives.ts';

const folder = process.argv.find(a => a.startsWith('--folder='))?.slice(9);
if (!folder) throw new Error('Use --folder=ankle-evidence-dir');
const source = `${folder}/iso-angle-native-and-equivalent.json`, output = `${folder}/iso-angle-actual-three.json`;
if (fs.existsSync(output)) throw new Error('Preserve existing witness');
const native = JSON.parse(fs.readFileSync(source, 'utf8'));
const digest = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
for (const [p, hash] of Object.entries({ ...native.asset_hashes, ...native.tool_hashes })) if (digest(p) !== hash) throw new Error(`Changed witness dependency ${p}`);
async function load(p) { const b = fs.readFileSync(p); return new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), ''); }
const model = await load('assets/avatar/catalog-a/F02/fitting-revisions/independent-keys-repair/F02.glb');
const gait = await load('assets/avatar/catalog-a/foundation/catalog-body-walk.glb');
function world() {
  model.scene.updateMatrixWorld(true); const result = {};
  model.scene.traverse(o => { if (o.isBone) result[o.name] = Array.from({ length: 4 }, (_, i) => Array.from({ length: 4 }, (_, j) => o.matrixWorld.elements[j * 4 + i])); });
  if (Object.keys(result).length !== 24) throw new Error('Incomplete bone inventory');
  return result;
}
const bind = world(), binder = bindGarmentCorrectives([model.scene]), mixer = new AnimationMixer(model.scene);
const checks = native.checks.map(row => {
  mixer.stopAllAction(); mixer.clipAction(gait.animations[0]).reset().play(); mixer.setTime(row.frame / native.frames_per_second);
  const matrices = world(); binder.update(); const knee = { Left: [], Right: [] };
  model.scene.traverse(o => {
    if (!o.isSkinnedMesh) return;
    for (const side of ['Left', 'Right']) { const index = o.morphTargetDictionary?.[`knee_clearance_${side}`]; if (index !== undefined) knee[side].push(o.morphTargetInfluences[index]); }
  });
  for (const side of ['Left', 'Right']) if (!knee[side].length || Math.max(...knee[side]) !== Math.min(...knee[side])) throw new Error('Inconsistent binder values');
  return { ...row, world: matrices, knee_values: knee };
});
const report = { status: 'actual Three bounded witness measured; no changes', native_witness_sha256: digest(source), asset_hashes: native.asset_hashes, frames_per_second: native.frames_per_second, bind_world: bind, binder_count: binder.count, checks,
  tool_hashes: Object.fromEntries([new URL(import.meta.url), 'src/avatar/garmentCorrectives.ts', 'package-lock.json'].map(p => [String(p), digest(p)])) };
fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ status: report.status, checks: native.checks, binder_count: binder.count }));
