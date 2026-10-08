#!/usr/bin/env node
/**
 * Reproduce the curated crops with Sharp, without modifying original artwork.
 * node tools/avatar/crop_catalog_references.mjs --write  regenerates derived PNGs
 * node tools/avatar/crop_catalog_references.mjs --check  verifies source/crop hashes
 *
 * JSON shape: schemaVersion:1, items:[{references:[{id,label,path,sourcePath,
 * sourceSha256,prompt,crop:{left,top,width,height},cropSha256 (required for gallery hydration)}],variants:[{
 * references:[same],revisions:[{id,label,assetId,visualReview,technicalReview,
 * technicalNote?,reviewNote?,sourcePaths?,gaitCompatible?,renderKind?}],currentRevisionId?}]}].
 * The index is hand curated. Extraction performs no generation or repainting.
 * The exact original generation prompt and source checksum travel with each crop.
 */
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, realpath } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = await realpath(path.resolve(import.meta.dirname, '../..'));
const index = JSON.parse(await readFile(path.join(root, 'assets/avatar/catalog/catalog.json'), 'utf8'));
if (index.schemaVersion !== 1 || !Array.isArray(index.items)) throw new Error('Invalid catalog.json schema');
const mode = process.argv[2] ?? '--check';
if (!['--write', '--check'].includes(mode)) throw new Error('Expected --write or --check');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const outputs = new Map();
for (const item of index.items) for (const reference of [...item.references, ...item.variants.flatMap(variant => variant.references)]) {
  if (!reference.crop) continue;
  if (!/^assets\/avatar\/catalog\/references\/[^.]+\.png$/.test(reference.path) || reference.path.includes('..') || !/^assets\/avatar\/concepts\/[^.]+\.png$/.test(reference.sourcePath) || reference.sourcePath.includes('..')) throw new Error(`Unsafe crop ${reference.id}`);
  if (outputs.has(reference.path) && JSON.stringify(outputs.get(reference.path)) !== JSON.stringify(reference)) throw new Error(`Conflicting crop ${reference.path}`);
  outputs.set(reference.path, reference);
}
for (const reference of outputs.values()) {
  const source = await realpath(path.join(root, reference.sourcePath));
  const approved = await realpath(path.join(root, 'assets/avatar/concepts'));
  if (!source.startsWith(approved + path.sep)) throw new Error(`Unsafe original ${reference.sourcePath}`);
  const sourceBytes = await readFile(source);
  if (hash(sourceBytes) !== reference.sourceSha256) throw new Error(`Original source hash changed: ${reference.sourcePath}`);
  if (!reference.prompt) throw new Error(`Missing exact prompt: ${reference.id}`);
  const bytes = await sharp(sourceBytes).extract(reference.crop).png({ compressionLevel: 9, adaptiveFiltering: false }).toBuffer();
  if (reference.cropSha256 && hash(bytes) !== reference.cropSha256) throw new Error(`Sharp output differs from recorded crop: ${reference.path}`);
  const output = path.join(root, reference.path);
  if (mode === '--write') {
    await mkdir(path.dirname(output), { recursive: true });
    const directory = await realpath(path.dirname(output));
    const allowed = await realpath(path.join(root, 'assets/avatar/catalog/references'));
    if (!(directory === allowed || directory.startsWith(allowed + path.sep))) throw new Error(`Unsafe crop directory ${output}`);
    try { if ((await realpath(output)) !== output) throw new Error(`Unsafe crop output symlink ${output}`); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    await writeFile(output, bytes);
  } else if (hash(await readFile(output)) !== hash(bytes)) throw new Error(`Crop differs from source: ${reference.path}`);
}
console.log(`${mode.slice(2)}: ${outputs.size} focused crops; original hashes and exact prompts checked`);
