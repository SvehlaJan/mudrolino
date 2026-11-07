// CPU geometry proof for the generated, fused fixed-outfit bear. No GPU or image decoding.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { gzipSync } from 'node:zlib';
import { AnimationMixer, LoopOnce, Matrix3, REVISION, Texture, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const TOLERANCE = 1e-5;
const SUBSTEPS = 4;
const FRAME_COUNT = 169;

function requireContract(contract, actualHash) {
  if (!contract || contract.glbSha256 !== actualHash) throw new Error('GLB SHA-256 does not match the source contract');
  for (const key of ['boneNames', 'meshNames']) {
    const names = contract[key];
    if (!Array.isArray(names) || !names.length || names.some(name => typeof name !== 'string' || !name)
      || new Set(names).size !== names.length) throw new Error(`Invalid ${key} contract`);
  }
  if (contract.clipName !== 'celebrate' || contract.durationSeconds !== 1.4) throw new Error('Contract must require celebrate, 1.4 seconds');
  if (contract.clips !== undefined) {
    if (!Array.isArray(contract.clips) || !contract.clips.length) throw new Error('Invalid clips contract');
    const seen = new Set();
    let hasCelebrate = false;
    for (const item of contract.clips) {
      if (!item || typeof item.name !== 'string' || !item.name || seen.has(item.name)
        || !Number.isFinite(item.durationSeconds) || item.durationSeconds <= 0) {
        throw new Error('Invalid clips contract');
      }
      seen.add(item.name);
      if (item.name === 'celebrate' && Math.abs(item.durationSeconds - 1.4) <= 1e-6) hasCelebrate = true;
    }
    if (!hasCelebrate) throw new Error('Clips contract must include celebrate, 1.4 seconds');
  }
  if (!contract.boneNames.includes(contract.stationaryRootBone)) throw new Error('stationaryRootBone must be an expected bone');
  for (const [key, maximum] of [['maxTriangles', 95000], ['maxGzipBytes', 2100000]]) {
    if (!Number.isInteger(contract[key]) || contract[key] <= 0 || contract[key] > maximum) throw new Error(`Invalid ${key} contract`);
  }
  if (!Number.isFinite(contract.minMotionM) || contract.minMotionM < .02) throw new Error('minMotionM must be at least 0.02');
  if (!Number.isFinite(contract.maxFloorPenetrationM) || contract.maxFloorPenetrationM < 0
    || contract.maxFloorPenetrationM > .007) throw new Error('maxFloorPenetrationM must be between 0 and 0.007');
}

function requireNames(actual, expected, label) {
  if (new Set(actual).size !== actual.length || JSON.stringify([...actual].sort()) !== JSON.stringify([...expected].sort())) {
    throw new Error(`Unexpected ${label} names: expected ${expected.join(', ')}; got ${actual.join(', ')}`);
  }
}

function cpuProofPlugin(state) {
  return parser => ({
    name: 'CPU_GEOMETRY_PROOF_ONLY',
    async beforeRoot() {
      const json = parser.json;
      // External geometry would not be bound by the GLB checksum and could trigger network I/O.
      if (json.buffers?.some(buffer => buffer.uri)) throw new Error('Geometry buffers must be embedded in the GLB');
      if (json.scenes?.length !== 1) throw new Error('Expected one source scene');
      // Prime texture dependencies before built-in WebP/KTX plugins run. These neutral
      // placeholders only preserve material/UV associations; no texture pixels are checked.
      for (let index = 0; index < (json.textures?.length ?? 0); index++) {
        const texture = new Texture();
        texture.name = `CPU_placeholder_${index}`;
        texture.flipY = false;
        parser.associations.set(texture, { textures: index });
        parser.cache.add(`texture:${index}`, Promise.resolve(texture));
        state.placeholderTextureCount++;
      }
      // GLTFLoader normalizes weights when creating SkinnedMesh, so validate the
      // original accessors before any meshes are constructed or malformed sums repaired.
      for (const node of json.nodes ?? []) {
        if (node.mesh === undefined) continue;
        const skin = json.skins?.[node.skin];
        if (!skin?.joints?.length) throw new Error(`Missing skin on ${node.name ?? 'mesh'}`);
        for (const primitive of json.meshes[node.mesh].primitives) {
          if (primitive.mode !== undefined && primitive.mode !== 4) throw new Error('Only triangle surfaces are supported');
          const attributes = primitive.attributes;
          if (attributes.WEIGHTS_0 === undefined || attributes.JOINTS_0 === undefined
            || attributes.WEIGHTS_1 !== undefined || attributes.JOINTS_1 !== undefined) throw new Error('Expected exactly four skin weights and joint indices');
          const [weights, joints, positions] = await Promise.all(
            [attributes.WEIGHTS_0, attributes.JOINTS_0, attributes.POSITION].map(index => parser.getDependency('accessor', index)),
          );
          if (weights.itemSize !== 4 || joints.itemSize !== 4 || weights.count !== positions.count
            || joints.count !== positions.count || joints.normalized) throw new Error('Invalid skin weight/index attribute shape');
          for (let vertex = 0; vertex < weights.count; vertex++) {
            let sum = 0;
            for (let component = 0; component < 4; component++) {
              const weight = weights.getComponent(vertex, component), joint = joints.getComponent(vertex, component);
              if (!Number.isFinite(weight) || weight < 0) throw new Error('Invalid original skin weight');
              if (!Number.isInteger(joint) || joint < 0 || joint >= skin.joints.length) throw new Error('Invalid original skin joint index');
              sum += weight;
            }
            const error = Math.abs(sum - 1);
            state.maximumWeightError = Math.max(state.maximumWeightError, error);
            if (error > TOLERANCE) throw new Error(`Original skin weights are not normalized: sum=${sum}`);
          }
        }
      }
    },
  });
}

export async function sampleGeneratedBearRuntime({ glb, contract: contractPath, outputDir }) {
  if (!glb || !contractPath || !outputDir) throw new Error('Required: --glb --contract --output-dir');
  const bytes = fs.readFileSync(glb), contractBytes = fs.readFileSync(contractPath);
  if (bytes.length < 12 || bytes.readUInt32LE(0) !== 0x46546c67 || bytes.readUInt32LE(4) !== 2
    || bytes.readUInt32LE(8) !== bytes.length) throw new Error('Expected a complete GLB 2.0 file');
  const contract = JSON.parse(contractBytes.toString('utf8'));
  requireContract(contract, sha256(bytes));
  const state = { maximumWeightError: 0, placeholderTextureCount: 0 };
  const loader = new GLTFLoader().register(cpuProofPlugin(state));
  const gltf = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');

  const expectedClips = contract.clips ?? [{ name: contract.clipName, durationSeconds: contract.durationSeconds }];
  if (!contract.clips) {
    const clip = gltf.animations[0];
    if (gltf.animations.length !== 1 || clip.name !== contract.clipName || Math.abs(clip.duration - contract.durationSeconds) > 1e-6) {
      throw new Error('Expected only celebrate, 1.4 seconds');
    }
  } else {
    requireNames(gltf.animations.map(a => a.name), expectedClips.map(c => c.name), 'animation clip');
    for (const spec of expectedClips) {
      const found = gltf.animations.find(a => a.name === spec.name);
      if (!found || Math.abs(found.duration - spec.durationSeconds) > 1e-5) {
        throw new Error(`Expected clip ${spec.name} duration ${spec.durationSeconds}s, got ${found?.duration}`);
      }
    }
  }

  const meshes = [], bones = [];
  let offset = 0;
  gltf.scene.traverse(object => {
    if (object.isBone) bones.push(object);
    if (object.isLine || object.isPoints) throw new Error(`Unsupported non-triangle surface ${object.name}`);
    if (!object.isMesh) return;
    if (!object.isSkinnedMesh) throw new Error(`Unskinned surface ${object.name}`);
    const count = object.geometry.attributes.position.count;
    const indices = object.geometry.index ? Array.from(object.geometry.index.array) : Array.from({ length: count }, (_, i) => i);
    if (!count || indices.length % 3) throw new Error(`Invalid triangle surface ${object.name}`);
    meshes.push({ mesh: object, name: object.name, count, indices, offset_vertices: offset, foot_vertex_ids: [], has_uv: Boolean(object.geometry.attributes.uv) });
    offset += count;
  });
  requireNames(bones.map(bone => bone.name), contract.boneNames, 'bone');
  requireNames(meshes.map(item => item.name), contract.meshNames, 'mesh');
  const rootBone = bones.find(bone => bone.name === contract.stationaryRootBone);
  const point = new Vector3(), root = new Vector3(), delta = new Vector3(), linear = new Matrix3();
  gltf.scene.updateMatrixWorld(true);
  let neutralFloor = Infinity;
  for (const item of meshes) for (let vertex = 0; vertex < item.count; vertex++) {
    item.mesh.getVertexPosition(vertex, point).applyMatrix4(item.mesh.matrixWorld);
    if (![point.x, point.y, point.z].every(Number.isFinite)) throw new Error('Non-finite neutral vertex position');
    neutralFloor = Math.min(neutralFloor, point.y);
  }
  for (const item of meshes) for (let vertex = 0; vertex < item.count; vertex++) {
    item.mesh.getVertexPosition(vertex, point).applyMatrix4(item.mesh.matrixWorld);
    if (point.y <= neutralFloor + .18) item.foot_vertex_ids.push(vertex);
  }

  const stride = offset * 3;
  fs.mkdirSync(outputDir, { recursive: true });

  function sampleOneClip(clip, binaryFileName) {
    const frameCount = Math.round(clip.duration * 30 * SUBSTEPS) + 1;
    const mixer = new AnimationMixer(gltf.scene);
    const action = mixer.clipAction(clip).setLoop(LoopOnce, 1);
    action.clampWhenFinished = true;
    action.play();
    const firstLocal = new Float32Array(stride);
    let first, firstBoneMatrices, firstRoot, maximumMotion = 0, maximumSkinMotion = 0, endpointError = 0, endpointBoneError = 0, rootDrift = 0;
    const frames = [], positionHash = crypto.createHash('sha256');
    const positionPath = path.join(outputDir, binaryFileName), fd = fs.openSync(positionPath, 'w');
    try {
      for (let frame = 0; frame < frameCount; frame++) {
        const seconds = frame / (30 * SUBSTEPS);
        mixer.setTime(Math.min(seconds, clip.duration));
        gltf.scene.updateMatrixWorld(true);
        rootBone.getWorldPosition(root);
        if (![root.x, root.y, root.z].every(Number.isFinite)) throw new Error('Non-finite root position');
        if (!firstRoot) firstRoot = root.clone();
        const drift = Math.hypot(root.x - firstRoot.x, root.z - firstRoot.z);
        rootDrift = Math.max(rootDrift, drift);
        const values = new Float32Array(stride), min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
        let floor = Infinity;
        for (const item of meshes) {
          linear.setFromMatrix4(item.mesh.matrixWorld);
          let footIndex = 0;
          for (let vertex = 0; vertex < item.count; vertex++) {
            const index = (item.offset_vertices + vertex) * 3;
            item.mesh.getVertexPosition(vertex, point);
            if (frame === 0) firstLocal.set([point.x, point.y, point.z], index);
            else {
              delta.set(point.x - firstLocal[index], point.y - firstLocal[index + 1], point.z - firstLocal[index + 2]).applyMatrix3(linear);
              maximumSkinMotion = Math.max(maximumSkinMotion, delta.length());
            }
            point.applyMatrix4(item.mesh.matrixWorld);
            if (![point.x, point.y, point.z].every(Number.isFinite)) throw new Error('Non-finite animated vertex position');
            // Match the native authoring reports: glTF Y-up -> Blender Z-up.
            values[index] = point.x; values[index + 1] = -point.z; values[index + 2] = point.y;
            for (let axis = 0; axis < 3; axis++) {
              min[axis] = Math.min(min[axis], values[index + axis]); max[axis] = Math.max(max[axis], values[index + axis]);
            }
            if (item.foot_vertex_ids[footIndex] === vertex) { floor = Math.min(floor, point.y); footIndex++; }
            if (first) {
              const movement = Math.hypot(values[index] - first[index], values[index + 1] - first[index + 1], values[index + 2] - first[index + 2]);
              maximumMotion = Math.max(maximumMotion, movement);
              if (frame === frameCount - 1) endpointError = Math.max(endpointError, movement);
            }
          }
        }
        if (!first) {
          first = values.slice();
          firstBoneMatrices = bones.map(bone => bone.matrixWorld.elements.slice());
        }
        if (frame === frameCount - 1) for (let bone = 0; bone < bones.length; bone++) for (let value = 0; value < 16; value++) {
          endpointBoneError = Math.max(endpointBoneError, Math.abs(bones[bone].matrixWorld.elements[value] - firstBoneMatrices[bone][value]));
        }
        const binary = Buffer.from(values.buffer);
        fs.writeSync(fd, binary); positionHash.update(binary);
        frames.push({ frame: frame / SUBSTEPS, seconds, min, max, floor, root: [root.x, -root.z, root.y], root_xy_drift_m: drift });
      }
    } finally { fs.closeSync(fd); mixer.stopAllAction(); mixer.uncacheRoot(gltf.scene); }
    const floorPenetration = Math.max(0, -Math.min(...frames.map(frame => frame.floor)));
    const clipFailures = [];
    if (maximumSkinMotion < contract.minMotionM || maximumMotion < contract.minMotionM) clipFailures.push('Insufficient actual skin motion');
    if (endpointError > TOLERANCE || endpointBoneError > TOLERANCE) clipFailures.push('Unmatched start/end endpoint poses');
    if (floorPenetration > contract.maxFloorPenetrationM) clipFailures.push('Excessive fixed-vertex floor penetration');
    if (rootDrift > TOLERANCE) clipFailures.push('Excessive root XY drift');
    return {
      clip: clip.name,
      duration: clip.duration,
      frame_count: frameCount,
      maximum_motion_m: maximumMotion,
      maximum_skin_motion_m: maximumSkinMotion,
      maximum_endpoint_error_m: endpointError,
      maximum_endpoint_bone_matrix_error: endpointBoneError,
      maximum_root_xy_drift_m: rootDrift,
      maximum_floor_penetration_m: floorPenetration,
      positions: positionPath,
      positions_sha256: positionHash.digest('hex'),
      failures: clipFailures,
      frames,
    };
  }

  const primaryClip = gltf.animations.find(a => a.name === contract.clipName) ?? gltf.animations[0];
  const primaryResult = sampleOneClip(primaryClip, 'positions.bin');
  const clipSummaries = [];
  const allFailures = [...primaryResult.failures];

  if (contract.clips) {
    for (const spec of expectedClips) {
      if (spec.name === primaryClip.name) {
        clipSummaries.push({
          clip: primaryResult.clip,
          duration: primaryResult.duration,
          frame_count: primaryResult.frame_count,
          maximum_motion_m: primaryResult.maximum_motion_m,
          maximum_skin_motion_m: primaryResult.maximum_skin_motion_m,
          maximum_endpoint_error_m: primaryResult.maximum_endpoint_error_m,
          maximum_endpoint_bone_matrix_error: primaryResult.maximum_endpoint_bone_matrix_error,
          maximum_root_xy_drift_m: primaryResult.maximum_root_xy_drift_m,
          maximum_floor_penetration_m: primaryResult.maximum_floor_penetration_m,
          positions: primaryResult.positions,
          positions_sha256: primaryResult.positions_sha256,
          failures: primaryResult.failures,
          frames: primaryResult.frames,
        });
      } else {
        const animClip = gltf.animations.find(a => a.name === spec.name);
        const res = sampleOneClip(animClip, `positions-${spec.name}.bin`);
        clipSummaries.push(res);
        for (const f of res.failures) {
          allFailures.push(`${spec.name}: ${f}`);
        }
      }
    }
  }

  const triangles = meshes.reduce((sum, item) => sum + item.indices.length / 3, 0), gzipBytes = gzipSync(bytes).length;
  if (triangles > contract.maxTriangles) allFailures.push('Triangle budget exceeded');
  if (gzipBytes > contract.maxGzipBytes) allFailures.push('Gzip byte budget exceeded');
  const failures = [...new Set(allFailures)];

  const report = {
    status: failures.length ? 'failed' : 'passed', failures, profile: 'generated fixed-outfit bear CPU runtime skinning',
    glb, glb_sha256: sha256(bytes), contract: contractPath, contract_sha256: sha256(contractBytes), thresholds: contract,
    sampler_sha256: sha256(fs.readFileSync(new URL(import.meta.url))), three_revision: REVISION,
    clip: primaryResult.clip, duration: primaryResult.duration, fps: 30, substeps: SUBSTEPS, frame_count: FRAME_COUNT, stride,
    bones: bones.map(bone => bone.name), triangles, bytes: bytes.length, gzip_bytes: gzipBytes,
    maximum_weight_error: state.maximumWeightError, maximum_motion_m: primaryResult.maximum_motion_m,
    maximum_skin_motion_m: primaryResult.maximum_skin_motion_m,
    maximum_endpoint_error_m: primaryResult.maximum_endpoint_error_m,
    maximum_endpoint_bone_matrix_error: primaryResult.maximum_endpoint_bone_matrix_error,
    maximum_root_xy_drift_m: primaryResult.maximum_root_xy_drift_m,
    maximum_floor_penetration_m: primaryResult.maximum_floor_penetration_m,
    neutral_floor_m: neutralFloor, foot_band_height_m: .18, floor_plane_m: 0,
    meshes: meshes.map(({ mesh, ...item }) => item),
    ...(contract.clips ? { clips: clipSummaries } : {}),
    frames: primaryResult.frames,
    positions: primaryResult.positions, positions_sha256: primaryResult.positions_sha256,
    positions_encoding: 'little-endian float32, frame-major, mesh order, XYZ triples',
    coordinates: 'Blender Z-up; actual Three.js GLTFLoader + AnimationMixer + SkinnedMesh.getVertexPosition',
    textures_rendered: false, placeholder_texture_count: state.placeholderTextureCount,
    limitations: ['CPU geometry and skinning only; neutral placeholder textures are not decoded or rendered. Actual browser texture and material proof is required separately.'],
  };
  fs.writeFileSync(path.join(outputDir, 'samples.json'), JSON.stringify(report, null, 2) + '\n');
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const { values } = parseArgs({ options: { glb: { type: 'string' }, contract: { type: 'string' }, 'output-dir': { type: 'string' } } });
    const report = await sampleGeneratedBearRuntime({ glb: values.glb, contract: values.contract, outputDir: values['output-dir'] });
    console.log(JSON.stringify({ status: report.status, report: path.join(values['output-dir'], 'samples.json'), failures: report.failures,
      frames: report.frame_count, clips: report.clips?.map(c => c.clip) ?? [report.clip], triangles: report.triangles, maximumMotion: report.maximum_motion_m }));
    if (report.status !== 'passed') process.exitCode = 1;
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
