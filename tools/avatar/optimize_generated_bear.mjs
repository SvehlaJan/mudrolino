// Texture/normal packing + dead animation track pruning; preserve positions, float32 weights, joints and posed tracks.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { gzipSync } from 'node:zlib';
import { parseArgs } from 'node:util';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune } from '@gltf-transform/functions';
import validator from 'gltf-validator';

const MAX_GZIP_BYTES = 900_000;

function matchesRestRotation(outputAccessor, restQuat, tolerance = 1e-6) {
  if (!outputAccessor) return false;
  const count = outputAccessor.getCount();
  const q = [0, 0, 0, 1];
  for (let i = 0; i < count; i++) {
    outputAccessor.getElement(i, q);
    const dot = q[0] * restQuat[0] + q[1] * restQuat[1] + q[2] * restQuat[2] + q[3] * restQuat[3];
    if (1 - Math.abs(dot) > tolerance) return false;
    const sign = dot < 0 ? -1 : 1;
    for (let c = 0; c < 4; c++) {
      if (Math.abs(sign * q[c] - restQuat[c]) > tolerance) return false;
    }
  }
  return true;
}

const { values } = parseArgs({ options: { input: { type: 'string' }, 'output-dir': { type: 'string' } } });
if (!values.input || !values['output-dir']) throw new Error('Required: --input --output-dir');
const input = values.input, directory = values['output-dir'];
if (fs.existsSync(directory) && fs.readdirSync(directory).length) throw new Error('Use a new or empty output directory');
fs.mkdirSync(directory, { recursive: true });
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const cli = fs.realpathSync('node_modules/.bin/gltf-transform');
const version = JSON.parse(fs.readFileSync('node_modules/@gltf-transform/cli/package.json')).version;
const steps = [];
let previous = input;
for (const [name, command, options] of [
  ['resized.glb', 'resize', ['--width', '1024', '--height', '1024']],
  ['webp.glb', 'webp', ['--quality', '75', '--effort', '80']],
]) {
  const output = path.join(directory, name);
  execFileSync(process.execPath, [cli, command, previous, output, ...options], { stdio: 'inherit' });
  steps.push({ command, input: previous, output, options, sha256: hash(fs.readFileSync(output)) });
  previous = output;
}

// Prune dead scale channels, non-Hips translation channels, and rest-identical rotation channels
// (plus their orphaned samplers) without quantizing WEIGHTS_0 or touching posed constant tracks.
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(previous);
let prunedChannels = 0;
let keptChannels = 0;
let prunedSamplers = 0;
for (const anim of doc.getRoot().listAnimations()) {
  for (const channel of [...anim.listChannels()]) {
    const targetPath = channel.getTargetPath();
    const targetNode = channel.getTargetNode();
    const sampler = channel.getSampler();
    let drop = false;
    if (targetPath === 'scale') {
      drop = true;
    } else if (targetPath === 'translation' && targetNode?.getName() !== 'Hips') {
      drop = true;
    } else if (targetPath === 'rotation' && targetNode && matchesRestRotation(sampler?.getOutput(), targetNode.getRotation())) {
      drop = true;
    }
    if (drop) {
      channel.dispose();
      prunedChannels++;
    } else {
      keptChannels++;
    }
  }
  const usedSamplers = new Set(anim.listChannels().map(c => c.getSampler()).filter(Boolean));
  for (const sampler of [...anim.listSamplers()]) {
    if (!usedSamplers.has(sampler)) {
      sampler.dispose();
      prunedSamplers++;
    }
  }
}
await doc.transform(prune());
const prunedOutput = path.join(directory, 'pruned.glb');
await io.write(prunedOutput, doc);
steps.push({
  command: 'prune-dead-tracks',
  input: previous,
  output: prunedOutput,
  prunedChannels,
  keptChannels,
  prunedSamplers,
  sha256: hash(fs.readFileSync(prunedOutput)),
});
previous = prunedOutput;

for (const [name, command, options] of [
  ['tangents.glb', 'tangents', []],
  ['tangent8.glb', 'quantize', ['--pattern', 'TANGENT', '--quantize-normal', '8']],
  ['packed.glb', 'quantize', ['--pattern', '{NORMAL,TEXCOORD_*}', '--quantize-normal', '12', '--quantize-texcoord', '14']],
]) {
  const output = path.join(directory, name);
  execFileSync(process.execPath, [cli, command, previous, output, ...options], { stdio: 'inherit' });
  steps.push({ command, input: previous, output, options, sha256: hash(fs.readFileSync(output)) });
  previous = output;
}
// Explicitly declare packed NORMAL/TANGENT formats. Partial quantization with
// 4.3.0 can omit this marker when POSITION remains floating point.
const packed = fs.readFileSync(previous), jsonLength = packed.readUInt32LE(12);
const json = JSON.parse(packed.subarray(20, 20 + jsonLength));
for (const key of ['extensionsUsed', 'extensionsRequired']) {
  json[key] = [...new Set([...(json[key] ?? []), 'KHR_mesh_quantization'])];
}
const raw = Buffer.from(JSON.stringify(json));
const jsonChunk = Buffer.alloc(Math.ceil(raw.length / 4) * 4, 0x20);
raw.copy(jsonChunk);
const binaryChunks = packed.subarray(20 + jsonLength);
const model = Buffer.alloc(20 + jsonChunk.length + binaryChunks.length);
packed.copy(model, 0, 0, 12);
model.writeUInt32LE(model.length, 8);
model.writeUInt32LE(jsonChunk.length, 12);
model.writeUInt32LE(0x4e4f534a, 16);
jsonChunk.copy(model, 20);
binaryChunks.copy(model, 20 + jsonChunk.length);
const output = path.join(directory, 'model.glb');
fs.writeFileSync(output, model);
const validation = await validator.validateBytes(new Uint8Array(model), { uri: output });
const report = { status: 'pending', input, input_sha256: hash(fs.readFileSync(input)), output,
  glb_sha256: hash(model), bytes: model.length, gzip_bytes: gzipSync(model).length,
  max_gzip_bytes: MAX_GZIP_BYTES, pruned_channels: prunedChannels, kept_channels: keptChannels,
  pruned_samplers: prunedSamplers, tool: 'gltf-transform', tool_version: version, node_version: process.version,
  optimizer_sha256: hash(fs.readFileSync(new URL(import.meta.url))), steps,
  errors: validation.issues.numErrors, warnings: validation.issues.numWarnings,
  issues: validation.issues.messages,
  scope: 'Texture resize/WebP, dead animation channel/sampler pruning, and normal/tangent/UV packing; skinning, source parity and actual texture appearance require separate checks.' };
report.status = report.errors === 0 && report.warnings === 0 && report.gzip_bytes <= MAX_GZIP_BYTES ? 'passed' : 'failed';
fs.writeFileSync(path.join(directory, 'optimization-report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ status: report.status, output, bytes: report.bytes, gzipBytes: report.gzip_bytes,
  prunedChannels, keptChannels, errors: report.errors, warnings: report.warnings }));
if (report.status !== 'passed') process.exitCode = 1;
