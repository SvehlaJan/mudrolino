import { useEffect, useMemo, useRef } from 'react';
import { useAnimations, useGLTF } from '@react-three/drei';
import { Group } from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { AVATAR_MODEL_URL } from './avatarConstants';

interface AvatarModelProps {
  url?: string;
}

export function AvatarModel({ url = AVATAR_MODEL_URL }: AvatarModelProps) {
  const groupRef = useRef<Group>(null);
  const gltf = useGLTF(url);
  const scene = useMemo(() => clone(gltf.scene), [gltf.scene]);
  const { actions, names } = useAnimations(gltf.animations, groupRef);

  useEffect(() => {
    const idleName = names.find((name) => name.toLowerCase().includes('idle')) ?? names[0];
    if (!idleName) return;

    const action = actions[idleName];
    action?.reset().fadeIn(0.2).play();

    return () => {
      action?.fadeOut(0.2);
    };
  }, [actions, names]);

  return (
    <group ref={groupRef} position={[0, -1.65, 0]} rotation={[0, 0, 0]} scale={1.45}>
      <primitive object={scene} />
    </group>
  );
}
