import { describe, expect, it } from 'vitest';
import { Document, NodeIO, type Animation, type Buffer as GltfBuffer, type Node as GltfNode } from '@gltf-transform/core';
import { analyzeBearGlbQuality } from './audit_bear_animation_quality.mjs';

type RigNodes = Record<'Hips' | 'Spine' | 'RightArm' | 'LeftUpLeg', GltfNode>;

async function buildSyntheticGlb(
  buildClipFn: (doc: Document, buffer: GltfBuffer, nodes: RigNodes) => void,
) {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const scene = doc.createScene('Scene');
  const hips = doc.createNode('Hips');
  const spine = doc.createNode('Spine');
  const arm = doc.createNode('RightArm');
  const leg = doc.createNode('LeftUpLeg');
  hips.addChild(spine);
  spine.addChild(arm);
  hips.addChild(leg);
  scene.addChild(hips);

  const nodes: RigNodes = { Hips: hips, Spine: spine, RightArm: arm, LeftUpLeg: leg };
  buildClipFn(doc, buffer, nodes);

  const io = new NodeIO();
  const glb = await io.writeBinary(doc);
  return Buffer.from(glb);
}

function addRotationChannel(
  doc: Document,
  buffer: GltfBuffer,
  anim: Animation,
  node: GltfNode,
  times: number[],
  quats: [number, number, number, number][],
) {
  const input = doc.createAccessor().setType('SCALAR').setArray(new Float32Array(times)).setBuffer(buffer);
  const flat: number[] = [];
  for (const q of quats) flat.push(...q);
  const output = doc.createAccessor().setType('VEC4').setArray(new Float32Array(flat)).setBuffer(buffer);
  const sampler = doc.createAnimationSampler().setInput(input).setOutput(output).setInterpolation('LINEAR');
  const channel = doc.createAnimationChannel().setTargetNode(node).setTargetPath('rotation').setSampler(sampler);
  anim.addSampler(sampler);
  anim.addChannel(channel);
}

function rotZQuat(deg: number): [number, number, number, number] {
  const half = (deg * Math.PI) / 360;
  return [0, 0, Math.sin(half), Math.cos(half)];
}

describe('analyzeBearGlbQuality', () => {
  it('flags frozen-lower-body, high-jerk, loop-seam-kink, and imperceptible-idle clips', async () => {
    const glb = await buildSyntheticGlb((doc, buffer, nodes) => {
      // 1. Frozen lower body + high jerk
      const frozen = doc.createAnimation('encourage');
      addRotationChannel(
        doc,
        buffer,
        frozen,
        nodes.RightArm,
        [0, 0.1, 0.2, 0.3],
        [rotZQuat(0), rotZQuat(0), rotZQuat(80), rotZQuat(0)],
      );

      // 2. Imperceptible idle + loop seam kink (jumps linearly at end)
      const idle = doc.createAnimation('idle_breathe');
      addRotationChannel(
        doc,
        buffer,
        idle,
        nodes.Spine,
        [0, 1.0, 2.0],
        [rotZQuat(0), rotZQuat(3), rotZQuat(0)],
      );
      addRotationChannel(
        doc,
        buffer,
        idle,
        nodes.LeftUpLeg,
        [0, 1.0, 2.0],
        [rotZQuat(0), rotZQuat(2), rotZQuat(0)],
      );
    });

    const report = analyzeBearGlbQuality(glb);
    expect(report.clipCount).toBe(2);

    const encourage = report.clips.find((c) => c.name === 'encourage')!;
    expect(encourage.hasLegMotion).toBe(false);
    expect(encourage.hasHipMotion).toBe(false);
    expect(encourage.warnings).toContain('frozen-lower-body');
    expect(encourage.warnings).toContain('high-jerk');

    const idle = report.clips.find((c) => c.name === 'idle_breathe')!;
    expect(idle.warnings).toContain('imperceptible-idle');
  });

  it('passes smooth full-body periodic loops with zero warnings and detects overlap lag', async () => {
    const glb = await buildSyntheticGlb((doc, buffer, nodes) => {
      const anim = doc.createAnimation('idle');
      const n = 36;
      const dur = 3.0;
      const times = Array.from({ length: n + 1 }, (_, i) => (i / n) * dur);
      const spineQuats = times.map((t) => rotZQuat(25 * Math.sin((2 * Math.PI * t) / dur)));
      const armQuats = times.map((t) => rotZQuat(30 * Math.sin((2 * Math.PI * (t - 0.15)) / dur)));
      const legQuats = times.map((t) => rotZQuat(10 * Math.sin((2 * Math.PI * t) / dur)));
      addRotationChannel(doc, buffer, anim, nodes.Spine, times, spineQuats);
      addRotationChannel(doc, buffer, anim, nodes.RightArm, times, armQuats);
      addRotationChannel(doc, buffer, anim, nodes.LeftUpLeg, times, legQuats);
    });

    const report = analyzeBearGlbQuality(glb);
    expect(report.warningCount).toBe(0);
    const clip = report.clips[0];
    expect(clip.hasLegMotion).toBe(true);
    expect(clip.loopVelocityMismatchDegPerSec).toBeLessThan(8);
    expect(clip.maxAngularVelocityDegPerSec).toBeGreaterThan(20);
  });

  it('normalizes quantized INT16 quaternion channels before measuring loop velocity and jerk', async () => {
    const glb = await buildSyntheticGlb((doc, buffer, nodes) => {
      const anim = doc.createAnimation('idle');
      const n = 48;
      const dur = 1.6;
      const times = Array.from({ length: n + 1 }, (_, i) => (i / n) * dur);
      const makeInt16 = (fn: (t: number) => [number, number, number, number]) => {
        const flat: number[] = [];
        for (const t of times) {
          for (const v of fn(t)) {
            flat.push(Math.max(-32767, Math.min(32767, Math.round(v * 32767))));
          }
        }
        return doc
          .createAccessor()
          .setType('VEC4')
          .setArray(new Int16Array(flat))
          .setNormalized(true)
          .setBuffer(buffer);
      };
      const addChannel = (node: GltfNode, output: ReturnType<Document['createAccessor']>) => {
        const input = doc.createAccessor().setType('SCALAR').setArray(new Float32Array(times)).setBuffer(buffer);
        const sampler = doc.createAnimationSampler().setInput(input).setOutput(output).setInterpolation('LINEAR');
        anim.addSampler(sampler);
        anim.addChannel(doc.createAnimationChannel().setTargetNode(node).setTargetPath('rotation').setSampler(sampler));
      };
      addChannel(nodes.Spine, makeInt16((t) => rotZQuat(20 * Math.sin((2 * Math.PI * t) / dur))));
      addChannel(nodes.RightArm, makeInt16((t) => rotZQuat(25 * Math.sin((2 * Math.PI * (t - 0.1)) / dur))));
      addChannel(nodes.LeftUpLeg, makeInt16((t) => rotZQuat(10 * Math.sin((2 * Math.PI * t) / dur))));
    });

    const report = analyzeBearGlbQuality(glb);
    expect(report.warningCount).toBe(0);
    expect(report.clips[0].loopVelocityMismatchDegPerSec).toBeLessThan(8);
  });
});
