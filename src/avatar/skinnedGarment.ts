import { Bone, Object3D, Skeleton, SkinnedMesh } from 'three';

/**
 * Rebinds every SkinnedMesh in `garmentScene` to the same-named bones of
 * `baseScene`, so the garment deforms with the base body's animated skeleton.
 * Returns the rebound SkinnedMeshes (the caller reparents them under the base
 * root). Throws if any garment bone has no same-named bone in the base, which
 * indicates an asset/skeleton mismatch.
 */
export function rebindGarmentToBaseSkeleton(
  garmentScene: Object3D,
  baseScene: Object3D,
): SkinnedMesh[] {
  const baseBones = new Map<string, Bone>();
  baseScene.traverse((obj) => {
    if ((obj as Bone).isBone) baseBones.set(obj.name, obj as Bone);
  });

  const rebound: SkinnedMesh[] = [];
  garmentScene.traverse((obj) => {
    const mesh = obj as SkinnedMesh;
    if (!mesh.isSkinnedMesh || !mesh.skeleton) return;
    const remapped = mesh.skeleton.bones.map((bone) => {
      const match = baseBones.get(bone.name);
      if (!match) {
        throw new Error(
          `Skinned garment bone "${bone.name}" has no match in the base skeleton`,
        );
      }
      return match;
    });
    mesh.bind(new Skeleton(remapped, mesh.skeleton.boneInverses), mesh.bindMatrix);
    rebound.push(mesh);
  });
  return rebound;
}

/** True if the cloned scene contains at least one SkinnedMesh. */
export function hasSkinnedMesh(scene: Object3D): boolean {
  let found = false;
  scene.traverse((obj) => {
    if ((obj as SkinnedMesh).isSkinnedMesh) found = true;
  });
  return found;
}
