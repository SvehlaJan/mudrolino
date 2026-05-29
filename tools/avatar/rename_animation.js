/**
 * Rename the first animation clip in a GLB file.
 * Usage: node tools/avatar/rename_animation.js <input.glb> <output.glb> <newName>
 */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';

const [, , input, output, newName] = process.argv;

if (!input || !output || !newName) {
  console.error('Usage: node tools/avatar/rename_animation.js <input.glb> <output.glb> <newName>');
  process.exit(1);
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
const animations = doc.getRoot().listAnimations();

if (animations.length === 0) {
  console.error(`No animations found in ${input}`);
  process.exit(1);
}

const old = animations[0].getName();
animations[0].setName(newName);
console.log(`Renamed animation '${old}' → '${newName}' in ${input}`);

await io.write(output, doc);
console.log(`Written to ${output}`);
