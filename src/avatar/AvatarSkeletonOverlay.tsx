import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  Bone,
  BufferAttribute,
  BufferGeometry,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  SphereGeometry,
  Vector3,
} from 'three';

// Module-level temp vectors — JS is single-threaded so reuse is safe.
const _pos = new Vector3();
const _parentPos = new Vector3();

interface AvatarSkeletonOverlayProps {
  scene: Object3D;
}

/**
 * Renders a bone-line skeleton and joint spheres on top of the avatar.
 *
 * Must be placed at the R3F scene root (outside the avatar's scaled group)
 * so its world transform stays at identity. All vertex positions are written
 * as world-space coordinates via bone.getWorldPosition() each frame.
 */
export function AvatarSkeletonOverlay({ scene }: AvatarSkeletonOverlayProps) {
  const { lineSegments, jointMeshes, bones } = useMemo(() => {
    // Collect all bones from the avatar scene.
    const collected: Bone[] = [];
    scene.traverse((obj) => {
      if (obj instanceof Bone) collected.push(obj);
    });

    // Each bone that has a bone parent contributes one line segment (2 vertices).
    let pairCount = 0;
    for (const bone of collected) {
      if (bone.parent instanceof Bone) pairCount++;
    }

    const geom = new BufferGeometry();
    geom.setAttribute('position', new BufferAttribute(new Float32Array(pairCount * 6), 3));

    const mat = new LineBasicMaterial({
      color: '#ffcc00',
      depthTest: false,
      transparent: true,
      opacity: 0.9,
    });

    const ls = new LineSegments(geom, mat);
    ls.frustumCulled = false;
    ls.renderOrder = 999;

    // One small sphere per bone joint.
    const jMeshes = collected.map((bone) => {
      const mesh = new Mesh(
        new SphereGeometry(0.032, 6, 6),
        new MeshBasicMaterial({
          color: '#00e5ff',
          depthTest: false,
          transparent: true,
          opacity: 0.85,
        }),
      );
      mesh.frustumCulled = false;
      mesh.renderOrder = 999;
      return { bone, mesh };
    });

    return { lineSegments: ls, jointMeshes: jMeshes, bones: collected };
  }, [scene]);

  // Dispose GPU resources when the scene changes or the overlay unmounts.
  useEffect(() => {
    return () => {
      lineSegments.geometry.dispose();
      (lineSegments.material as LineBasicMaterial).dispose();
      for (const { mesh } of jointMeshes) {
        mesh.geometry.dispose();
        (mesh.material as MeshBasicMaterial).dispose();
      }
    };
  }, [lineSegments, jointMeshes]);

  // Every frame: write current bone world positions into the line geometry
  // and move each joint sphere to match.
  useFrame(() => {
    const posAttr = lineSegments.geometry.getAttribute('position') as BufferAttribute;
    let j = 0;

    for (const bone of bones) {
      if (!(bone.parent instanceof Bone)) continue;
      bone.getWorldPosition(_pos);
      posAttr.setXYZ(j++, _pos.x, _pos.y, _pos.z);
      bone.parent.getWorldPosition(_parentPos);
      posAttr.setXYZ(j++, _parentPos.x, _parentPos.y, _parentPos.z);
    }

    posAttr.needsUpdate = true;

    for (const { bone, mesh } of jointMeshes) {
      bone.getWorldPosition(_pos);
      mesh.position.copy(_pos);
    }
  });

  return (
    <>
      <primitive object={lineSegments} />
      {jointMeshes.map(({ bone, mesh }) => (
        <primitive key={bone.uuid} object={mesh} />
      ))}
    </>
  );
}
