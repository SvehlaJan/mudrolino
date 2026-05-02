import { useEffect, useMemo, useRef } from 'react';
import { useAnimations, useGLTF } from '@react-three/drei';
import { AnimationClip } from 'three';
import { Box3, Group, Object3D, Vector3 } from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { DEFAULT_AVATAR_TOP, getAvatarTopMeshName } from './avatarCatalog';
import { AVATAR_MODEL_URL } from './avatarConstants';
import { AvatarBodyShapeConfig, AvatarSlotSelections } from './avatarTypes';

interface AvatarModelProps {
  url?: string;
  animationUrl?: string;
  animationName?: string | null;
  slotSelections?: AvatarSlotSelections;
  bodyShape?: AvatarBodyShapeConfig;
  onAnimationsChange?: (names: string[]) => void;
}

const TARGET_MODEL_HEIGHT = 2.7;

function sanitizeAnimationClips(clips: AnimationClip[], hipsAnchor: Vector3) {
  return clips.map((clip) => {
    const sanitizedClip = clip.clone();

    sanitizedClip.tracks = sanitizedClip.tracks
      .filter((track) => {
        const suffix = track.name.split('.').pop();
        return suffix === 'quaternion' || track.name === 'Hips.position';
      })
      .map((track) => {
        if (track.name !== 'Hips.position') return track;

        const sanitizedTrack = track.clone();

        for (let index = 0; index < sanitizedTrack.values.length; index += 3) {
          sanitizedTrack.values[index] = hipsAnchor.x;
          sanitizedTrack.values[index + 1] = hipsAnchor.y;
          sanitizedTrack.values[index + 2] = hipsAnchor.z;
        }

        return sanitizedTrack;
      });

    return sanitizedClip;
  });
}

function applySlotVisibility(scene: Object3D, slotSelections?: AvatarSlotSelections) {
  const selectedTop = slotSelections?.top ?? DEFAULT_AVATAR_TOP;
  const selectedTopMeshName = getAvatarTopMeshName(selectedTop);

  scene.traverse((object) => {
    if (!object.name.startsWith('top_')) return;
    object.visible = object.name === selectedTopMeshName;
  });
}

function getPreviewScale(bodyShape?: AvatarBodyShapeConfig) {
  const scale = bodyShape?.scale ?? 1;
  return Math.min(1.2, Math.max(0.8, scale));
}

export function AvatarModel({
  url = AVATAR_MODEL_URL,
  animationUrl,
  animationName,
  slotSelections,
  bodyShape,
  onAnimationsChange,
}: AvatarModelProps) {
  const groupRef = useRef<Group>(null);
  const gltf = useGLTF(url);
  const animationSource = useGLTF(animationUrl ?? url);
  const { scene, hipsAnchor } = useMemo(() => {
    const clonedScene = clone(gltf.scene);
    const hips = clonedScene.getObjectByName('Hips');
    clonedScene.updateMatrixWorld(true);
    clonedScene.traverse((object) => {
      if ('isMesh' in object || 'isSkinnedMesh' in object) {
        object.frustumCulled = false;
      }
    });
    applySlotVisibility(clonedScene, slotSelections);
    const bounds = new Box3().setFromObject(clonedScene);
    const size = new Vector3();
    const center = new Vector3();

    bounds.getSize(size);
    bounds.getCenter(center);

    const scale = (size.y > 0 ? TARGET_MODEL_HEIGHT / size.y : 1) * getPreviewScale(bodyShape);

    clonedScene.scale.setScalar(scale);
    clonedScene.position.set(
      -center.x * scale,
      -bounds.min.y * scale,
      -center.z * scale,
    );

    return {
      scene: clonedScene,
      hipsAnchor: hips?.position.clone() ?? new Vector3(),
    };
  }, [bodyShape, gltf.scene, slotSelections]);
  const animationClips = useMemo(
    () => sanitizeAnimationClips(animationSource.animations, hipsAnchor),
    [animationSource.animations, hipsAnchor],
  );
  const { actions, names } = useAnimations(animationClips, groupRef);

  useEffect(() => {
    onAnimationsChange?.(names);
  }, [names, onAnimationsChange]);

  useEffect(() => {
    const preferredName = animationName && names.includes(animationName) ? animationName : undefined;
    const fallbackName = names.find((name) => name.toLowerCase().includes('idle')) ?? names[0];
    const activeName = preferredName ?? fallbackName;
    if (!activeName) return;

    const action = actions[activeName];
    action?.reset().fadeIn(0.2).play();

    return () => {
      action?.fadeOut(0.2);
    };
  }, [actions, animationName, names]);

  return (
    <group ref={groupRef} position={[0, 0, 0]} rotation={[0, 0, 0]}>
      <primitive object={scene} />
    </group>
  );
}
