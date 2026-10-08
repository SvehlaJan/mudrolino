import fs from 'node:fs';
import crypto from 'node:crypto';
import { AnimationMixer, SkinnedMesh, Vector3, type Texture } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { bindGarmentCorrectives } from '../../src/avatar/garmentCorrectives';

const outfit = process.argv.find(a => a.startsWith('--outfit='))?.slice(9);
if (!outfit || !/^[A-Z0-9-]+$/.test(outfit)) throw new Error('Invalid outfit');
const root = 'assets/avatar/catalog-a';
const folder = process.argv.find(a => a.startsWith('--outfit-dir='))?.slice('--outfit-dir='.length) || `${root}/outfits/${outfit}`;
const deformationPath = `${folder}/export-deformation-report.json`;
const reference = JSON.parse(fs.readFileSync(deformationPath, 'utf8'));
const hashes: Record<string, string> = {};
function digest(path: string) {
  return crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex');
}
async function load(path: string) {
  const bytes = fs.readFileSync(path); hashes[path] = digest(path);
  // Geometry and morph targets only: Node cannot decode embedded face textures.
  const loader = new GLTFLoader().register(() => ({ name: 'TEO_skip_textures', loadTexture: () => Promise.resolve(null as unknown as Texture) }));
  return loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
}
if (digest(reference.glb) !== reference.glb_sha256 || digest(reference.blend) !== reference.blend_sha256) throw new Error('Stale master/export');
hashes[deformationPath] = digest(deformationPath);
const gltf = await load(`${folder}/outfit.glb`);
const clips = { walk: await load(`${root}/foundation/catalog-body-walk.glb`), run: await load(`${root}/foundation/catalog-body-run.glb`) };
const correctives = bindGarmentCorrectives([gltf.scene]);
if (!correctives.count) throw new Error('No exported corrective targets');
const mixer = new AnimationMixer(gltf.scene);
const checks: Array<{ motion: string; frame: number; maxWeightError: number; maxShapeErrorM: number; targets: number }> = [];
for (const row of reference.checks) {
  mixer.stopAllAction();
  if (row.motion !== 'rest') {
    const clip = clips[row.motion as keyof typeof clips].animations[0];
    if (!clip) throw new Error('Missing clip');
    mixer.clipAction(clip).reset().play(); mixer.setTime(row.frame / reference.frames_per_second);
  }
  gltf.scene.updateMatrixWorld(true); correctives.update();
  let maxWeightError = 0; let maxShapeErrorM = 0; let targets = 0;
  gltf.scene.traverse(object => {
    const mesh = object as SkinnedMesh;
    if (!mesh.isSkinnedMesh || !mesh.morphTargetDictionary || !mesh.morphTargetInfluences) return;
    let source: string | undefined;
    for (let node = object; node && !source; node = node.parent!) {
      source = Object.keys(row.corrective_values).find(name => node.name.startsWith(name));
    }
    if (!source) throw new Error(`No source corrective for ${mesh.name}`);
    const differences: Array<{ index: number; difference: number }> = [];
    for (const [name, value] of Object.entries(row.corrective_values[source])) {
      const index = mesh.morphTargetDictionary[name];
      if (index === undefined) throw new Error(`Missing exported shape ${name}`);
      const difference = mesh.morphTargetInfluences[index] - Number(value);
      differences.push({ index, difference });
      maxWeightError = Math.max(maxWeightError, Math.abs(difference)); targets++;
    }
    if (!mesh.geometry.morphTargetsRelative) throw new Error('Expected GLB relative targets');
    const morphPositions = mesh.geometry.morphAttributes.position;
    if (!morphPositions) throw new Error('Missing exported morph positions');
    const delta = new Vector3(); const term = new Vector3();
    for (let vertex = 0; vertex < mesh.geometry.attributes.position.count; vertex++) {
      delta.set(0, 0, 0);
      for (const { index, difference } of differences) {
        term.fromBufferAttribute(morphPositions[index], vertex);
        delta.addScaledVector(term, difference);
      }
      maxShapeErrorM = Math.max(maxShapeErrorM, delta.length());
    }
  });
  if (!targets) throw new Error('No evaluated targets');
  checks.push({ motion: row.motion, frame: row.frame, maxWeightError, maxShapeErrorM, targets });
}
const maximum = Math.max(...checks.map(row => row.maxWeightError));
const shapeError = Math.max(...checks.map(row => row.maxShapeErrorM));
const combinedErrorBound = shapeError + reference.max_error_m;
const report = { status: reference.status === 'passed' && combinedErrorBound < 0.00003 ? 'passed' : 'failed', blend: reference.blend, blend_sha256: reference.blend_sha256, glb: reference.glb, glb_sha256: reference.glb_sha256, hashes, checks, max_weight_error: maximum, max_shape_error_m: shapeError, combined_error_bound_m: combinedErrorBound, threshold_m: 0.00003, bindings: correctives.count, comparison: 'Three.js knee weights versus Blender, propagated through actual exported morph deltas; added to same-value source/export error' };
fs.writeFileSync(`${folder}/runtime-corrective-report.json`, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ status: report.status, bindings: report.bindings, samples: checks.length, max_weight_error: maximum, combined_error_bound_m: combinedErrorBound }, null, 2));
if (report.status !== 'passed') process.exitCode = 1;
