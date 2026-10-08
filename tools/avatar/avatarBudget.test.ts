import { describe, expect, it } from 'vitest';
import { measureGlb, overBudget, parseGlb, PHONE_BUDGET } from './measure_avatar_budget.mjs';

// A minimal GLB: one triangle-list primitive with 6 indexed vertices (2 triangles) on a skinned node.
function glb(json: object, bin = Buffer.alloc(0)) {
  const text = Buffer.from(JSON.stringify(json));
  const jsonChunk = Buffer.concat([text, Buffer.alloc((4 - (text.length % 4)) % 4, 0x20)]);
  const binChunk = Buffer.concat([bin, Buffer.alloc((4 - (bin.length % 4)) % 4)]);
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4);
  const chunks = [jsonChunk, 0x4e4f534a, binChunk, 0x004e4942] as const;
  const parts: Buffer[] = [];
  for (const [data, type] of [[chunks[0], chunks[1]], [chunks[2], chunks[3]]] as [Buffer, number][]) {
    const head = Buffer.alloc(8); head.writeUInt32LE(data.length, 0); head.writeUInt32LE(type, 4); parts.push(head, data);
  }
  const body = Buffer.concat(parts);
  header.writeUInt32LE(12 + body.length, 8);
  return Buffer.concat([header, body]);
}

describe('avatar phone budget', () => {
  const json = {
    asset: { version: '2.0' },
    accessors: [{ count: 4 }, { count: 6 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1, targets: [{}, {}] }] }],
    nodes: [{ mesh: 0, skin: 0 }, {}],
    skins: [{ joints: [1] }],
    materials: [{}],
  };
  it('reads the JSON chunk and counts triangles, primitives, skins and morph targets', () => {
    const buffer = glb(json);
    expect(parseGlb(buffer).json.meshes).toHaveLength(1);
    const metrics = measureGlb(buffer);
    expect(metrics).toMatchObject({ triangles: 2, vertices: 4, drawPrimitives: 1, skinnedMeshes: 1, joints: 1, morphTargets: 2, materials: 1 });
    expect(metrics.gzipBytes).toBeGreaterThan(0);
  });
  it('reports only the budget lines a model exceeds', () => {
    expect(overBudget({ ...measureGlb(glb(json)) })).toEqual([]);
    expect(overBudget({ ...measureGlb(glb(json)), triangles: PHONE_BUDGET.triangles + 1 }).map(row => row.key)).toEqual(['triangles']);
  });
  it('rejects files that are not GLB', () => {
    expect(() => parseGlb(Buffer.from('not a glb at all'))).toThrow('Not a GLB');
  });
});
