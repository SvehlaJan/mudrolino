import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { sampleGeneratedBearRuntime } from './sample_generated_bear_runtime.mjs';

const hash = (value: Buffer) => createHash('sha256').update(value).digest('hex');
const directories: string[] = [];

// A tiny GLB with two fixed floor vertices and two vertices moved by an arm bone.
// The fixture is geometry and animation data only, not a character asset.
function syntheticGlb(options: {
  weight?: number[]; clipName?: string; animation?: 'moving' | 'static' | 'open-end' | 'floor' | 'drift';
  texture?: 'png' | 'webp';
} = {}) {
  const chunks: Buffer[] = [];
  const views: { buffer: number; byteOffset: number; byteLength: number }[] = [];
  const accessors: object[] = [];
  let offset = 0;
  function accessor(values: Float32Array | Uint16Array, type: string, count: number, extra = {}) {
    const bytes = Buffer.from(values.buffer, values.byteOffset, values.byteLength);
    const padding = Buffer.alloc((4 - offset % 4) % 4);
    chunks.push(padding, bytes); offset += padding.length;
    views.push({ buffer: 0, byteOffset: offset, byteLength: bytes.length });
    offset += bytes.length;
    accessors.push({ bufferView: views.length - 1, componentType: values instanceof Float32Array ? 5126 : 5123, type, count, ...extra });
    return accessors.length - 1;
  }
  const position = accessor(new Float32Array([-.05, 0, 0, .05, 0, 0, 0, 1.5, 0, .1, 1.5, 0]), 'VEC3', 4,
    { min: [-.05, 0, 0], max: [.1, 1.5, 0] });
  const normal = accessor(new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]), 'VEC3', 4);
  const uv = accessor(new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), 'VEC2', 4);
  const joints = accessor(new Uint16Array([0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]), 'VEC4', 4);
  const weights = accessor(new Float32Array([...(options.weight ?? [1, 0, 0, 0]), 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]), 'VEC4', 4);
  const indices = accessor(new Uint16Array([0, 1, 2, 1, 3, 2]), 'SCALAR', 6);
  const inverse = accessor(new Float32Array([
    1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
    1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, -1, 0, 1,
  ]), 'MAT4', 2);
  const times = accessor(new Float32Array([0, .7, 1.4]), 'SCALAR', 3, { min: [0], max: [1.4] });
  const q = options.animation === 'static' ? [0, 0, 0, 1] : [0, 0, Math.sin(.3), Math.cos(.3)];
  const rotation = accessor(new Float32Array([0, 0, 0, 1, ...q, ...(options.animation === 'open-end' ? q : [0, 0, 0, 1])]), 'VEC4', 3);
  const translation = accessor(new Float32Array([
    0, 0, 0, options.animation === 'drift' ? .01 : 0, options.animation === 'floor' ? -.02 : 0, 0, 0, 0, 0,
  ]), 'VEC3', 3);
  const binary = Buffer.concat([...chunks, Buffer.alloc((4 - offset % 4) % 4)]);
  const document = {
    asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [0, 2] }],
    nodes: [{ name: 'Hips', children: [1] }, { name: 'Arm', translation: [0, 1, 0] }, { name: 'BearBody', mesh: 0, skin: 0 }],
    skins: [{ joints: [0, 1], inverseBindMatrices: inverse }],
    meshes: [{ name: 'FusedGeometry', primitives: [{ attributes: { POSITION: position, NORMAL: normal, TEXCOORD_0: uv, JOINTS_0: joints, WEIGHTS_0: weights }, indices, material: 0 }] }],
    materials: [{ pbrMetallicRoughness: options.texture ? { baseColorTexture: { index: 0 } } : {} }],
    ...(options.texture ? {
      // Deliberately undecodable; CPU geometry checks must not decode or render it.
      images: [{ uri: `data:image/${options.texture};base64,AA==` }],
      textures: options.texture === 'webp' ? [{ extensions: { EXT_texture_webp: { source: 0 } } }] : [{ source: 0 }],
      extensionsUsed: options.texture === 'webp' ? ['EXT_texture_webp'] : [],
    } : {}),
    animations: [{ name: options.clipName ?? 'celebrate',
      samplers: [{ input: times, output: rotation }, { input: times, output: translation }],
      channels: [{ sampler: 0, target: { node: 1, path: 'rotation' } }, { sampler: 1, target: { node: 0, path: 'translation' } }],
    }], buffers: [{ byteLength: binary.length }], bufferViews: views, accessors,
  };
  const json = Buffer.from(JSON.stringify(document));
  const jsonChunk = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, ' ')]);
  const header = Buffer.alloc(20);
  header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4);
  header.writeUInt32LE(28 + jsonChunk.length + binary.length, 8);
  header.writeUInt32LE(jsonChunk.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
  const binaryHeader = Buffer.alloc(8);
  binaryHeader.writeUInt32LE(binary.length); binaryHeader.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([header, jsonChunk, binaryHeader, binary]);
}

function fixture(options: Parameters<typeof syntheticGlb>[0] = {}) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'generated-bear-runtime-'));
  directories.push(root);
  const glb = path.join(root, 'synthetic.glb'), contract = path.join(root, 'contract.json'), outputDir = path.join(root, 'samples');
  const bytes = syntheticGlb(options);
  writeFileSync(glb, bytes);
  const spec = {
    glbSha256: hash(bytes), boneNames: ['Hips', 'Arm'], meshNames: ['BearBody'], clipName: 'celebrate', durationSeconds: 1.4,
    maxTriangles: 95000, maxGzipBytes: 2100000, minMotionM: .02, maxFloorPenetrationM: .007, stationaryRootBone: 'Hips',
  };
  const saveContract = () => writeFileSync(contract, JSON.stringify(spec));
  saveContract();
  return { glb, contract, outputDir, bytes, spec, saveContract };
}

afterEach(() => { for (const root of directories.splice(0)) rmSync(root, { recursive: true, force: true }); });

describe('generated bear actual runtime skinning', () => {
  it('samples actual bone-driven vertices at 169 times and saves hash-bound binary proof', async () => {
    const input = fixture();
    const report = await sampleGeneratedBearRuntime(input);
    expect(report.status).toBe('passed');
    expect(report).toMatchObject({ frame_count: 169, substeps: 4, triangles: 2, maximum_root_xy_drift_m: 0,
      maximum_endpoint_error_m: 0, maximum_weight_error: 0, glb_sha256: hash(input.bytes), textures_rendered: false });
    expect(report.maximum_motion_m).toBeGreaterThan(.2);
    expect(report.maximum_skin_motion_m).toBeGreaterThan(.2);
    expect(report.meshes[0].foot_vertex_ids).toEqual([0, 1]);
    expect(report.frames.every((frame: { floor: number }) => frame.floor === 0)).toBe(true);
    const binary = readFileSync(path.join(input.outputDir, 'positions.bin'));
    expect(binary.length).toBe(169 * 4 * 3 * 4);
    const coordinates = new Float32Array(binary.buffer.slice(binary.byteOffset, binary.byteOffset + binary.byteLength));
    const mid = 84 * 12;
    expect(coordinates[mid + 6]).toBeLessThan(-.2); // Upper vertex moved via the actual arm transform.
    expect(coordinates[mid]).toBeCloseTo(coordinates[0]); // Same foot vertex stays on the floor.
    expect(hash(binary)).toBe(report.positions_sha256);
    expect(JSON.parse(readFileSync(path.join(input.outputDir, 'samples.json'), 'utf8')).contract_sha256).toBe(hash(readFileSync(input.contract)));
  });

  it.each(['png', 'webp'] as const)('substitutes CPU-only %s textures without browser APIs', async texture => {
    const report = await sampleGeneratedBearRuntime(fixture({ texture }));
    expect(report.status).toBe('passed');
    expect(report.textures_rendered).toBe(false);
    expect(report.placeholder_texture_count).toBe(1);
    expect(report.limitations.join(' ')).toMatch(/browser/i);
  });

  it('rejects a stale contract before writing any proof', async () => {
    const input = fixture(); input.spec.glbSha256 = '0'.repeat(64); input.saveContract();
    await expect(sampleGeneratedBearRuntime(input)).rejects.toThrow(/SHA-256/);
    expect(existsSync(input.outputDir)).toBe(false);
  });

  it.each([[2, 0, 0, 0], [-.1, 1.1, 0, 0], [0, 0, 0, 0]])('rejects original malformed weights before loader normalization: %j', async (...weight) => {
    await expect(sampleGeneratedBearRuntime(fixture({ weight }))).rejects.toThrow(/weight/i);
  });

  it('rejects missing expected bones and unexpected surfaces', async () => {
    const input = fixture(); input.spec.boneNames.push('MissingBone'); input.saveContract();
    await expect(sampleGeneratedBearRuntime(input)).rejects.toThrow(/bone names/i);
    input.spec.boneNames.pop(); input.spec.meshNames = ['MissingMesh']; input.saveContract();
    await expect(sampleGeneratedBearRuntime(input)).rejects.toThrow(/mesh names/i);
  });

  it('rejects a missing celebration clip', async () => {
    await expect(sampleGeneratedBearRuntime(fixture({ clipName: 'idle' }))).rejects.toThrow(/celebrate/);
  });

  it.each([
    ['static', 'skin motion'], ['open-end', 'endpoint'], ['floor', 'floor penetration'], ['drift', 'root XY drift'],
  ] as const)('fails the %s fixture with retained failed proof', async (animation, failure) => {
    const input = fixture({ animation });
    const report = await sampleGeneratedBearRuntime(input);
    expect(report.status).toBe('failed');
    expect(report.failures.join(' ')).toMatch(failure);
    expect(existsSync(path.join(input.outputDir, 'positions.bin'))).toBe(true);
  });

  it('does not permit a contract to loosen fixed safety and performance thresholds', async () => {
    const input = fixture(); input.spec.minMotionM = 0; input.saveContract();
    await expect(sampleGeneratedBearRuntime(input)).rejects.toThrow(/minMotionM/);
  });
});
