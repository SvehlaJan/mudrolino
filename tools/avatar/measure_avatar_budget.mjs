// Measure the runtime cost of avatar GLBs against a phone budget.
// Usage: node tools/avatar/measure_avatar_budget.mjs [--report=OUT.json] [--meshes] FILE.glb ...
// Reports bytes (raw and gzip), triangles, vertices, draw primitives, skinned meshes,
// joints, morph targets and texture pixels per file, and which budget lines it exceeds.
import fs from 'node:fs';
import zlib from 'node:zlib';
import { pathToFileURL } from 'node:url';

// Proposed phone budget for one on-screen avatar (body, head, hair, garments and accessories).
export const PHONE_BUDGET = {
  gzipBytes: 3_000_000,
  triangles: 100_000,
  drawPrimitives: 24,
  skinnedMeshes: 8,
  texturePixels: 2 * 1024 * 1024,
  morphTargets: 16,
};

export function parseGlb(buffer) {
  if (buffer.readUInt32LE(0) !== 0x46546c67) throw new Error('Not a GLB file');
  const jsonLength = buffer.readUInt32LE(12);
  if (buffer.readUInt32LE(16) !== 0x4e4f534a) throw new Error('First GLB chunk is not JSON');
  const json = JSON.parse(buffer.subarray(20, 20 + jsonLength).toString('utf8'));
  const binStart = 20 + jsonLength;
  const bin = binStart + 8 <= buffer.length ? buffer.subarray(binStart + 8, binStart + 8 + buffer.readUInt32LE(binStart)) : Buffer.alloc(0);
  return { json, bin };
}

function pngSize(bytes) {
  // PNG IHDR: width and height at offsets 16 and 20.
  if (bytes.length >= 24 && bytes.readUInt32BE(12) === 0x49484452) return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
  return null;
}

export function measureGlb(buffer) {
  const { json, bin } = parseGlb(buffer);
  const accessors = json.accessors ?? [];
  let triangles = 0, vertices = 0, primitives = 0, morphTargets = 0;
  const meshes = [];
  for (const mesh of json.meshes ?? []) {
    const row = { name: mesh.name ?? '', triangles: 0, vertices: 0 };
    for (const primitive of mesh.primitives ?? []) {
      primitives += 1;
      const positions = accessors[primitive.attributes.POSITION]?.count ?? 0;
      row.vertices += positions;
      const mode = primitive.mode ?? 4;
      if (mode === 4) row.triangles += Math.floor((primitive.indices !== undefined ? accessors[primitive.indices].count : positions) / 3);
      morphTargets = Math.max(morphTargets, primitive.targets?.length ?? 0);
    }
    triangles += row.triangles; vertices += row.vertices; meshes.push(row);
  }
  const skinnedMeshes = (json.nodes ?? []).filter(node => node.mesh !== undefined && node.skin !== undefined).length;
  const joints = Math.max(0, ...(json.skins ?? []).map(skin => skin.joints.length));
  let texturePixels = 0;
  const textures = [];
  for (const image of json.images ?? []) {
    if (image.bufferView === undefined) continue;
    const view = json.bufferViews[image.bufferView];
    const size = pngSize(bin.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength));
    if (size) {
      texturePixels += size[0] * size[1];
      textures.push(size);
    }
  }
  return {
    bytes: buffer.length, gzipBytes: zlib.gzipSync(buffer, { level: 9 }).length,
    triangles, vertices, drawPrimitives: primitives, skinnedMeshes, joints, morphTargets, texturePixels, textures,
    materials: json.materials?.length ?? 0, meshes,
  };
}

export function overBudget(metrics, budget = PHONE_BUDGET) {
  return Object.entries(budget).filter(([key, limit]) => metrics[key] > limit).map(([key, limit]) => ({ key, value: metrics[key], limit }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const files = process.argv.slice(2).filter(arg => !arg.startsWith('--'));
  const reportPath = process.argv.find(arg => arg.startsWith('--report='))?.slice(9);
  const rows = files.map(file => {
    const metrics = measureGlb(fs.readFileSync(file));
    return { file, ...metrics, over: overBudget(metrics) };
  });
  for (const row of rows) {
    const over = row.over.map(o => o.key).join(',') || 'within';
    console.log(`${row.file}\t${(row.gzipBytes / 1e6).toFixed(2)} MB gz\t${row.triangles} tris\t${row.drawPrimitives} prims\t${row.skinnedMeshes} skinned\t${row.morphTargets} morphs\t${over}`);
    if (process.argv.includes('--meshes')) for (const mesh of row.meshes) console.log(`  ${mesh.name}\t${mesh.triangles} tris`);
  }
  if (reportPath) fs.writeFileSync(reportPath, JSON.stringify({ budget: PHONE_BUDGET, rows }, null, 2) + '\n');
}
