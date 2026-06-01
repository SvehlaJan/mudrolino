/**
 * Adjust translation/rotation/scale of a named node in a GLB file.
 * Usage: node tools/avatar/adjust_node_transform.js <input.glb> <output.glb> <nodeName> [tx] [ty] [tz] [rx] [ry] [rz] [sx] [sy] [sz]
 * Pass '.' to leave a value unchanged.
 */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';

const [, , input, output, nodeName, tx, ty, tz, rx, ry, rz, sx, sy, sz] = process.argv;

if (!input || !output || !nodeName) {
  console.error('Usage: node tools/avatar/adjust_node_transform.js <input.glb> <output.glb> <nodeName> [tx ty tz] [rx ry rz] [sx sy sz]');
  process.exit(1);
}

function parseVal(str, current) {
  if (!str || str === '.') return current;
  return parseFloat(str);
}

await MeshoptDecoder.ready;
await MeshoptEncoder.ready;

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    'meshopt.decoder': MeshoptDecoder,
    'meshopt.encoder': MeshoptEncoder,
  });

const doc = await io.read(input);
const node = doc.getRoot().listNodes().find(n => n.getName() === nodeName);

if (!node) {
  const names = doc.getRoot().listNodes().map(n => n.getName());
  console.error(`Node '${nodeName}' not found. Available nodes: ${names.join(', ')}`);
  process.exit(1);
}

const [cx, cy, cz] = node.getTranslation();
const [crx, cry, crz] = node.getRotation(); // quaternion xyzw
const [csx, csy, csz] = node.getScale();

const newTx = parseVal(tx, cx);
const newTy = parseVal(ty, cy);
const newTz = parseVal(tz, cz);

node.setTranslation([newTx, newTy, newTz]);

if (sx !== undefined && sx !== '.') {
  node.setScale([parseVal(sx, csx), parseVal(sy, csy), parseVal(sz, csz)]);
}

console.log(`Node '${nodeName}':`);
console.log(`  translation: [${cx}, ${cy}, ${cz}] → [${newTx}, ${newTy}, ${newTz}]`);
console.log(`  scale: [${csx}, ${csy}, ${csz}]`);

await io.write(output, doc);
console.log(`Written to ${output}`);
