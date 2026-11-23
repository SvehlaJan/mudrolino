import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { gzipSync } from 'node:zlib';

const LEG_BONES = new Set([
  'LeftUpLeg',
  'RightUpLeg',
  'LeftLeg',
  'RightLeg',
  'LeftFoot',
  'RightFoot',
  'LeftToeBase',
  'RightToeBase',
]);
const TORSO_BONES = new Set(['Hips', 'Spine', 'Spine01', 'Spine02']);
const EXTREMITY_BONES = new Set(['LeftForeArm', 'RightForeArm', 'LeftHand', 'RightHand', 'Head']);
const LOOPING_CLIPS = new Set(['idle', 'idle_breathe', 'walk']);

function readAccessorValues(gltf, binBuffer, accessorIndex) {
  const accessor = gltf.accessors?.[accessorIndex];
  if (!accessor || accessor.bufferView === undefined) return [];
  const view = gltf.bufferViews?.[accessor.bufferView];
  if (!view) return [];
  const compCount = accessor.type === 'VEC4' ? 4 : accessor.type === 'VEC3' ? 3 : accessor.type === 'VEC2' ? 2 : 1;
  const compBytes = accessor.componentType === 5126 ? 4 : accessor.componentType === 5123 || accessor.componentType === 5122 ? 2 : 1;
  const stride = view.byteStride ?? compCount * compBytes;
  const baseOffset = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const viewData = new DataView(binBuffer.buffer, binBuffer.byteOffset, binBuffer.byteLength);

  const out = [];
  for (let i = 0; i < accessor.count; i += 1) {
    const off = baseOffset + i * stride;
    if (compCount === 1) {
      out.push(readComponent(viewData, off, accessor.componentType, Boolean(accessor.normalized)));
    } else {
      const tuple = [];
      for (let c = 0; c < compCount; c += 1) {
        tuple.push(readComponent(viewData, off + c * compBytes, accessor.componentType, Boolean(accessor.normalized)));
      }
      out.push(tuple);
    }
  }
  return out;
}

function readComponent(view, offset, componentType, normalized) {
  switch (componentType) {
    case 5126:
      return view.getFloat32(offset, true);
    case 5123: {
      const v = view.getUint16(offset, true);
      return normalized ? v / 65535 : v;
    }
    case 5122: {
      const v = view.getInt16(offset, true);
      return normalized ? Math.max(-1, v / 32767) : v;
    }
    case 5121: {
      const v = view.getUint8(offset);
      return normalized ? v / 255 : v;
    }
    case 5120: {
      const v = view.getInt8(offset);
      return normalized ? Math.max(-1, v / 127) : v;
    }
    default:
      throw new Error(`Unsupported GLB accessor componentType ${componentType}`);
  }
}

function normalizeQuat(q) {
  const len = Math.hypot(q[0], q[1], q[2], q[3]);
  return len > 1e-12 ? [q[0] / len, q[1] / len, q[2] / len, q[3] / len] : [0, 0, 0, 1];
}

function quatRelativeVectorDeg(qFromRaw, qToRaw) {
  const qFrom = normalizeQuat(qFromRaw);
  const qTo = normalizeQuat(qToRaw);
  // q_delta = qTo * qFrom^{-1}; for shortest arc, align sign via dot >= 0
  let dot = qFrom[0] * qTo[0] + qFrom[1] * qTo[1] + qFrom[2] * qTo[2] + qFrom[3] * qTo[3];
  const sign = dot < 0 ? -1 : 1;
  dot = Math.min(1, Math.abs(dot));
  const [tx, ty, tz, tw] = [qTo[0] * sign, qTo[1] * sign, qTo[2] * sign, qTo[3] * sign];
  const [fx, fy, fz, fw] = [-qFrom[0], -qFrom[1], -qFrom[2], qFrom[3]];
  const rx = tw * fx + tx * fw + ty * fz - tz * fy;
  const ry = tw * fy - tx * fz + ty * fw + tz * fx;
  const rz = tw * fz + tx * fy - ty * fx + tz * fw;
  const angleDeg = (2 * Math.acos(dot) * 180) / Math.PI;
  const sinHalf = Math.hypot(rx, ry, rz);
  if (sinHalf < 1e-8) return [0, 0, 0, angleDeg];
  const scale = angleDeg / sinHalf;
  return [rx * scale, ry * scale, rz * scale, angleDeg];
}

function parseGlb(bytes) {
  if (bytes.length < 20 || bytes.readUInt32LE(0) !== 0x46546c67 || bytes.readUInt32LE(4) !== 2) {
    throw new Error('Expected valid GLB 2.0 binary');
  }
  const jsonLen = bytes.readUInt32LE(12);
  if (bytes.readUInt32LE(16) !== 0x4e4f534a || 20 + jsonLen + 8 > bytes.length) {
    throw new Error('Malformed GLB chunks');
  }
  const gltf = JSON.parse(bytes.subarray(20, 20 + jsonLen).toString('utf8'));
  const binLen = bytes.readUInt32LE(20 + jsonLen);
  const binStart = 20 + jsonLen + 8;
  const bin = bytes.subarray(binStart, binStart + binLen);
  return { gltf, bin };
}

/**
 * Analyze animation smoothness, lower-body engagement, loop seams, and overlap lag from raw GLB bytes.
 */
export function analyzeBearGlbQuality(glbBuffer) {
  const bytes = Buffer.isBuffer(glbBuffer) ? glbBuffer : Buffer.from(glbBuffer);
  const { gltf, bin } = parseGlb(bytes);
  const nodes = gltf.nodes ?? [];
  const clips = [];

  for (const anim of gltf.animations ?? []) {
    const movingBones = new Set();
    let hasHipMotion = false;
    let hasLegMotion = false;
    let maxAngularVelocityDegPerSec = 0;
    let maxAngularAccelDegPerSec2 = 0;
    let loopVelocityMismatchDegPerSec = 0;
    let fastestBone = '-';
    let durationSeconds = 0;
    let keyframeCount = 0;
    const allVelocities = [];
    let torsoPeakTime = null;
    let torsoPeakVel = 0;
    let extremityPeakTime = null;
    let extremityPeakVel = 0;

    for (const ch of anim.channels ?? []) {
      const targetNode = ch.target?.node;
      const boneName = nodes[targetNode]?.name ?? String(targetNode);
      const targetPath = ch.target?.path;
      const sampler = anim.samplers?.[ch.sampler];
      if (!sampler) continue;

      const times = readAccessorValues(gltf, bin, sampler.input);
      const values = readAccessorValues(gltf, bin, sampler.output);
      if (times.length > 0) {
        durationSeconds = Math.max(durationSeconds, times[times.length - 1]);
        keyframeCount = Math.max(keyframeCount, times.length);
      }

      if (targetPath === 'translation' && boneName === 'Hips' && values.length > 1) {
        const base = values[0];
        const maxDisp = Math.max(
          ...values.map((v) => Math.hypot(v[0] - base[0], v[1] - base[1], v[2] - base[2])),
        );
        if (maxDisp > 0.003) {
          movingBones.add(boneName);
          hasHipMotion = true;
        }
        continue;
      }

      if (targetPath !== 'rotation' || values.length < 2) continue;

      const q0 = values[0];
      const maxExcursion = Math.max(...values.map((q) => quatRelativeVectorDeg(q0, q)[3]));
      if (maxExcursion > 0.5) {
        movingBones.add(boneName);
        if (boneName === 'Hips') hasHipMotion = true;
        if (LEG_BONES.has(boneName)) hasLegMotion = true;
      }

      const segVels = [];
      for (let i = 0; i < times.length - 1; i += 1) {
        const dt = times[i + 1] - times[i];
        if (dt <= 1e-6) continue;
        const [vx, vy, vz, ang] = quatRelativeVectorDeg(values[i], values[i + 1]);
        const speed = ang / dt;
        const midTime = (times[i] + times[i + 1]) * 0.5;
        segVels.push({ vx: vx / dt, vy: vy / dt, vz: vz / dt, speed, dt, midTime });
        allVelocities.push(speed);
        if (speed > maxAngularVelocityDegPerSec) {
          maxAngularVelocityDegPerSec = speed;
          fastestBone = boneName;
        }
        if (TORSO_BONES.has(boneName) && speed > torsoPeakVel) {
          torsoPeakVel = speed;
          torsoPeakTime = midTime;
        }
        if (EXTREMITY_BONES.has(boneName) && speed > extremityPeakVel) {
          extremityPeakVel = speed;
          extremityPeakTime = midTime;
        }
      }

      for (let i = 0; i < segVels.length - 1; i += 1) {
        const dtAvg = (segVels[i].dt + segVels[i + 1].dt) * 0.5;
        if (dtAvg <= 1e-6) continue;
        const dv = Math.hypot(
          segVels[i + 1].vx - segVels[i].vx,
          segVels[i + 1].vy - segVels[i].vy,
          segVels[i + 1].vz - segVels[i].vz,
        );
        const accel = dv / dtAvg;
        if (accel > maxAngularAccelDegPerSec2) {
          maxAngularAccelDegPerSec2 = accel;
        }
      }

      if (segVels.length >= 2) {
        const first = segVels[0];
        const last = segVels[segVels.length - 1];
        const seamDelta = Math.hypot(last.vx - first.vx, last.vy - first.vy, last.vz - first.vz);
        if (seamDelta > loopVelocityMismatchDegPerSec) {
          loopVelocityMismatchDegPerSec = seamDelta;
        }
      }
    }

    const sortedVels = [...allVelocities].sort((a, b) => a - b);
    const p90AngularVelocityDegPerSec =
      sortedVels.length > 0 ? sortedVels[Math.floor(0.9 * (sortedVels.length - 1))] : 0;
    const overlapLagSeconds =
      torsoPeakTime !== null && extremityPeakTime !== null
        ? Number((extremityPeakTime - torsoPeakTime).toFixed(4))
        : null;

    const warnings = [];
    if (!hasLegMotion && !hasHipMotion && anim.name !== 'still') {
      warnings.push('frozen-lower-body');
    }
    if (maxAngularAccelDegPerSec2 > 5500) {
      warnings.push('high-jerk');
    }
    if (LOOPING_CLIPS.has(anim.name) && loopVelocityMismatchDegPerSec > 8) {
      warnings.push('loop-seam-kink');
    }
    if ((anim.name === 'idle' || anim.name === 'idle_breathe') && maxAngularVelocityDegPerSec < 12) {
      warnings.push('imperceptible-idle');
    }

    clips.push({
      name: anim.name,
      durationSeconds: Number(durationSeconds.toFixed(3)),
      keyframeCount,
      movingBoneCount: movingBones.size,
      movingBones: [...movingBones].sort(),
      hasHipMotion,
      hasLegMotion,
      maxAngularVelocityDegPerSec: Number(maxAngularVelocityDegPerSec.toFixed(1)),
      p90AngularVelocityDegPerSec: Number(p90AngularVelocityDegPerSec.toFixed(1)),
      fastestBone,
      maxAngularAccelDegPerSec2: Number(maxAngularAccelDegPerSec2.toFixed(0)),
      loopVelocityMismatchDegPerSec: Number(loopVelocityMismatchDegPerSec.toFixed(1)),
      overlapLagSeconds,
      warnings,
    });
  }

  return {
    glbBytes: bytes.length,
    gzipBytes: gzipSync(bytes).length,
    clipCount: clips.length,
    clips,
    warningCount: clips.reduce((sum, clip) => sum + clip.warnings.length, 0),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const { values } = parseArgs({
    options: {
      glb: { type: 'string' },
      output: { type: 'string' },
    },
  });
  if (!values.glb) {
    console.error('Usage: node tools/avatar/audit_bear_animation_quality.mjs --glb <path> [--output <json>]');
    process.exitCode = 1;
  } else {
    const report = analyzeBearGlbQuality(fs.readFileSync(values.glb));
    if (values.output) {
      fs.mkdirSync(path.dirname(values.output), { recursive: true });
      fs.writeFileSync(values.output, `${JSON.stringify(report, null, 2)}\n`);
    }
    console.log(
      JSON.stringify(
        {
          glbBytes: report.glbBytes,
          gzipBytes: report.gzipBytes,
          clipCount: report.clipCount,
          warningCount: report.warningCount,
          clipsWithWarnings: report.clips
            .filter((c) => c.warnings.length > 0)
            .map((c) => ({ name: c.name, warnings: c.warnings })),
        },
        null,
        2,
      ),
    );
  }
}
