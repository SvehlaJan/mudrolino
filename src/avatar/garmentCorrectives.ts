import { Object3D, SkinnedMesh, Vector3 } from 'three';

/** Bind exported knee-clearance morphs to the garment's animated skeleton. */
export function bindGarmentCorrectives(scenes: Object3D[]) {
  const bindings: Array<{ mesh: SkinnedMesh; index: number; hip: Object3D; knee: Object3D; foot: Object3D }> = [];
  for (const scene of scenes) {
    scene.traverse((object) => {
      const mesh = object as SkinnedMesh;
      if (!mesh.isSkinnedMesh || !mesh.morphTargetDictionary || !mesh.morphTargetInfluences) return;
      const bones = new Map(mesh.skeleton.bones.map((bone) => [bone.name, bone]));
      for (const side of ['Left', 'Right']) {
        const index = mesh.morphTargetDictionary[`knee_clearance_${side}`];
        if (index === undefined) continue;
        const hip = bones.get(`${side}UpLeg`);
        const knee = bones.get(`${side}Leg`);
        const foot = bones.get(`${side}Foot`);
        if (!hip || !knee || !foot) throw new Error(`Knee corrective has no ${side} leg chain`);
        bindings.push({ mesh, index, hip, knee, foot });
      }
    });
  }
  const a = new Vector3(); const b = new Vector3(); const c = new Vector3();
  return {
    count: bindings.length,
    update() {
      for (const { mesh, index, hip, knee, foot } of bindings) {
        hip.getWorldPosition(a); knee.getWorldPosition(b); foot.getWorldPosition(c);
        a.subVectors(b, a); c.sub(b);
        const product = a.length() * c.length();
        const angle = product > 0 ? Math.acos(Math.max(-1, Math.min(1, a.dot(c) / product))) : 0;
        if (mesh.morphTargetInfluences) mesh.morphTargetInfluences[index] = Math.max(0, Math.min(1, (angle - .25) / 1.55));
      }
    },
  };
}
