// Sample the shipped glTF interpolation and skinning, without a browser/GPU.
// Geometry is a temporary binary proof payload; only hash-bound reports enter git.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { AnimationMixer, LoopOnce, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
const arg = (name, fallback) => process.argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const glb = arg('glb', 'assets/avatar/catalog-a/companions/bear-v1/outfit-lod.glb');
const out = arg('output-dir', 'artifacts/verification/bear-companion/runtime-geometry');
const substeps = Number(arg('substeps', '4'));
if (!Number.isInteger(substeps) || substeps < 1 || substeps > 16) throw new Error('Invalid substeps');
fs.mkdirSync(out, { recursive: true });
const bytes = fs.readFileSync(glb);
const sha256 = data => crypto.createHash('sha256').update(data).digest('hex');
const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
const clip = gltf.animations[0];
if (gltf.animations.length !== 1 || clip.name !== 'celebrate' || Math.abs(clip.duration - 1.4) > 1e-6) throw new Error('Expected only celebrate, 1.4 seconds');
const sourceNames = ['B01_straight_trousers_outfit', 'Bear_head', 'Bear_left_paw', 'Bear_neck', 'Bear_right_paw', 'body_underlayer_male', 'F01_strap_sneakers_outfit', 'T01_crew_tee_outfit'];
const meshes = [];
const bones = new Set();
let maximumWeightError = 0;
gltf.scene.traverse(mesh => {
  if (mesh.isBone) bones.add(mesh.name);
  if (!mesh.isMesh) return;
  if (!mesh.isSkinnedMesh) throw new Error(`Unskinned surface ${mesh.name}`);
  let source;
  for (let node = mesh; node && !source; node = node.parent) source = sourceNames.find(name => node.name.startsWith(name));
  if (!source) throw new Error(`Unmapped mesh ${mesh.name}`);
  const geometry = mesh.geometry;
  const indices = geometry.index ? Array.from(geometry.index.array) : Array.from({ length: geometry.attributes.position.count }, (_, i) => i);
  const skin = geometry.attributes.skinWeight;
  if (!skin || skin.itemSize !== 4 || !geometry.attributes.normal) throw new Error(`Missing skin/UV/normal ${mesh.name}`);
  for (let i = 0; i < skin.count; i++) {
    const weights = [skin.getX(i), skin.getY(i), skin.getZ(i), skin.getW(i)];
    if (weights.some(w => w < 0 || !Number.isFinite(w))) throw new Error('Invalid weight');
    maximumWeightError = Math.max(maximumWeightError, Math.abs(weights.reduce((a, b) => a + b, 0) - 1));
  }
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  if (!geometry.attributes.uv && materials.some(material => material.map || material.normalMap || material.roughnessMap)) throw new Error('Textured surface without UVs');
  meshes.push({ mesh, source, indices, count: geometry.attributes.position.count, has_uv: Boolean(geometry.attributes.uv) });
});
if (bones.size !== 24 || maximumWeightError > 1e-5) throw new Error('Rig/weight contract failed');
const mixer = new AnimationMixer(gltf.scene);
const action = mixer.clipAction(clip).setLoop(LoopOnce, 1); action.clampWhenFinished = true; action.play();
const frameCount = 42 * substeps + 1;
const stride = meshes.reduce((sum, item) => sum + item.count * 3, 0);
const fd = fs.openSync(path.join(out, 'positions.bin'), 'w');
const point = new Vector3();
let first, maximumMotion = 0;
const frames = [];
try {
  for (let i = 0; i < frameCount; i++) {
    mixer.setTime(i / (30 * substeps)); gltf.scene.updateMatrixWorld(true);
    const values = new Float32Array(stride); let offset = 0;
    let floor = Infinity; const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    for (const item of meshes) {
      for (let vertex = 0; vertex < item.count; vertex++) {
        item.mesh.getVertexPosition(vertex, point).applyMatrix4(item.mesh.matrixWorld);
        // glTF Y-up to authoring Blender Z-up.
        const coordinates = [point.x, -point.z, point.y];
        for (let axis = 0; axis < 3; axis++) {
          values[offset++] = coordinates[axis];
          min[axis] = Math.min(min[axis], coordinates[axis]); max[axis] = Math.max(max[axis], coordinates[axis]);
        }
        if (item.source.startsWith('F01_')) floor = Math.min(floor, coordinates[2]);
      }
    }
    if (!first) first = values.slice();
    else for (let j = 0; j < stride; j += 3) maximumMotion = Math.max(maximumMotion, Math.hypot(values[j] - first[j], values[j + 1] - first[j + 1], values[j + 2] - first[j + 2]));
    fs.writeSync(fd, Buffer.from(values.buffer));
    frames.push({ frame: i / substeps, seconds: i / (30 * substeps), min, max, floor });
  }
} finally { fs.closeSync(fd); }
const triangles = meshes.reduce((sum, item) => sum + item.indices.length / 3, 0);
const gzipBytes = gzipSync(bytes).length;
const passed = maximumMotion > .02 && triangles <= 95000 && gzipBytes <= 2100000 && frames.every(row => row.floor >= -.007);
const report = { status: passed ? 'passed' : 'failed', glb, glb_sha256: sha256(bytes), sampler_sha256: sha256(fs.readFileSync(new URL(import.meta.url))), clip: clip.name, duration: clip.duration, substeps, frame_count: frameCount, stride, bones: [...bones], triangles, gzip_bytes: gzipBytes, maximum_weight_error: maximumWeightError, maximum_motion_m: maximumMotion, frames, meshes: meshes.map(({ source, indices, count, has_uv }) => ({ source, indices, count, has_uv })), positions_sha256: sha256(fs.readFileSync(path.join(out, 'positions.bin'))), coordinates: 'Blender Z-up; actual Three.js GLTFLoader + AnimationMixer + SkinnedMesh.getVertexPosition' };
fs.writeFileSync(path.join(out, 'samples.json'), JSON.stringify(report));
console.log(JSON.stringify({ status: report.status, triangles, gzipBytes, frames: frameCount, maximumMotion }));
if (!passed) process.exitCode = 1;
