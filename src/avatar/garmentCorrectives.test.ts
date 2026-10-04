import { describe, expect, it } from 'vitest';
import { Bone, BufferGeometry, Group, Skeleton, SkinnedMesh } from 'three';
import { bindGarmentCorrectives } from './garmentCorrectives';

function fixture(scale = 1) {
  const scene = new Group();
  scene.scale.setScalar(scale);
  const hip = new Bone(); hip.name = 'LeftUpLeg';
  const knee = new Bone(); knee.name = 'LeftLeg'; knee.position.set(0, -1, 0);
  const foot = new Bone(); foot.name = 'LeftFoot'; foot.position.set(0, -1, 0);
  hip.add(knee); knee.add(foot); scene.add(hip);
  const mesh = new SkinnedMesh(new BufferGeometry());
  mesh.skeleton = new Skeleton([hip, knee, foot]);
  mesh.morphTargetDictionary = { knee_clearance_Left: 0, unrelated: 1 };
  mesh.morphTargetInfluences = [0, 0.3]; scene.add(mesh);
  return { scene, knee, mesh };
}

describe('garment knee correctives', () => {
  it('expands during a knee bend and returns to the reference shape when straight', () => {
    const f = fixture(); const { update, count } = bindGarmentCorrectives([f.scene]);
    expect(count).toBe(1); update(); expect(f.mesh.morphTargetInfluences?.[0]).toBe(0);
    f.knee.rotation.x = Math.PI / 2; update();
    expect(f.mesh.morphTargetInfluences?.[0]).toBeCloseTo((Math.PI / 2 - .25) / 1.55, 6);
    expect(f.mesh.morphTargetInfluences?.[1]).toBe(.3);
    f.knee.rotation.x = 0; update(); expect(f.mesh.morphTargetInfluences?.[0]).toBe(0);
  });
  it('clamps deep bends and works after avatar normalization', () => {
    const f = fixture(20); f.knee.rotation.x = 2.5;
    bindGarmentCorrectives([f.scene]).update();
    expect(f.mesh.morphTargetInfluences?.[0]).toBe(1);
  });
  it('leaves legacy garments without corrective targets unchanged', () => {
    const f = fixture(); f.mesh.morphTargetDictionary = { unrelated: 0 }; f.mesh.morphTargetInfluences = [.4];
    const { update, count } = bindGarmentCorrectives([f.scene]); update();
    expect(count).toBe(0); expect(f.mesh.morphTargetInfluences).toEqual([.4]);
  });
});
