import { useEffect, useMemo, useRef } from 'react';
import { useAnimations, useGLTF } from '@react-three/drei';
import { AnimationClip } from 'three';
import { Box3, Group, Object3D, Vector3 } from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { DEFAULT_AVATAR_TOP, getAvatarTopMeshName } from './avatarCatalog';
import { AvatarExternalAsset } from './avatarAssetResolver';
import { AVATAR_MODEL_URL } from './avatarConstants';
import { AvatarBodyShapeConfig, AvatarSlotSelections } from './avatarTypes';

interface AvatarModelProps {
  url?: string;
  animationUrl?: string;
  animationName?: string | null;
  slotSelections?: AvatarSlotSelections;
  embeddedMeshNames?: string[];
  externalAssets?: AvatarExternalAsset[];
  bodyShape?: AvatarBodyShapeConfig;
  preserveHipsPosition?: boolean;
  onAnimationsChange?: (names: string[]) => void;
  onModelReady?: () => void;
}

const TARGET_MODEL_HEIGHT = 2.7;
const EMBEDDED_MESH_PREFIXES = ['top_'];

function sanitizeAnimationClips(
  clips: AnimationClip[],
  hipsAnchor: Vector3,
  preserveHipsPosition = false,
) {
  return clips.map((clip) => {
    const sanitizedClip = clip.clone();

    sanitizedClip.tracks = sanitizedClip.tracks
      .filter((track) => {
        const suffix = track.name.split('.').pop();
        return suffix === 'quaternion' || track.name === 'Hips.position';
      })
      .map((track) => {
        if (track.name !== 'Hips.position' || preserveHipsPosition) return track;

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

function disableMeshFrustumCulling(scene: Object3D) {
  scene.traverse((object) => {
    if ('isMesh' in object || 'isSkinnedMesh' in object) {
      object.frustumCulled = false;
    }
  });
}

function applyEmbeddedMeshVisibility(scene: Object3D, selectedMeshNames: string[]) {
  const selectedMeshNameSet = new Set(selectedMeshNames);
  scene.traverse((object) => {
    if (!EMBEDDED_MESH_PREFIXES.some((prefix) => object.name.startsWith(prefix))) return;
    object.visible = selectedMeshNameSet.has(object.name);
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
  embeddedMeshNames,
  externalAssets = [],
  bodyShape,
  preserveHipsPosition,
  onAnimationsChange,
  onModelReady,
}: AvatarModelProps) {
  const groupRef = useRef<Group>(null);
  const gltf = useGLTF(url);
  const animationSource = useGLTF(animationUrl ?? url);
  const externalAssetUrls = useMemo(
    () => externalAssets.map((asset) => asset.url),
    [externalAssets],
  );
  const externalGltfs = useGLTF(externalAssetUrls);
  const selectedEmbeddedMeshNames = useMemo(() => {
    if (embeddedMeshNames) return embeddedMeshNames;

    const selectedTop = slotSelections?.top ?? DEFAULT_AVATAR_TOP;
    return [getAvatarTopMeshName(selectedTop)];
  }, [embeddedMeshNames, slotSelections]);
  const { scene, garmentScenes, hipsAnchor, rootScale, rootPosition } = useMemo(() => {
    const clonedScene = clone(gltf.scene);
    const hips = clonedScene.getObjectByName('Hips');
    clonedScene.updateMatrixWorld(true);
    disableMeshFrustumCulling(clonedScene);
    applyEmbeddedMeshVisibility(clonedScene, selectedEmbeddedMeshNames);
    const bounds = new Box3().setFromObject(clonedScene);
    const size = new Vector3();
    const center = new Vector3();

    bounds.getSize(size);
    bounds.getCenter(center);

    const scale = (size.y > 0 ? TARGET_MODEL_HEIGHT / size.y : 1) * getPreviewScale(bodyShape);
    const position = new Vector3(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
    const clonedGarmentScenes = externalGltfs.map((externalGltf) => {
      const clonedGarmentScene = clone(externalGltf.scene);
      clonedGarmentScene.updateMatrixWorld(true);
      disableMeshFrustumCulling(clonedGarmentScene);
      return clonedGarmentScene;
    });

    return {
      scene: clonedScene,
      garmentScenes: clonedGarmentScenes,
      hipsAnchor: hips?.position.clone() ?? new Vector3(),
      rootScale: scale,
      rootPosition: position,
    };
  }, [bodyShape, externalGltfs, gltf.scene, selectedEmbeddedMeshNames]);
  const animationClips = useMemo(
    () => sanitizeAnimationClips(animationSource.animations, hipsAnchor, preserveHipsPosition),
    [animationSource.animations, hipsAnchor, preserveHipsPosition],
  );
  const { actions, names } = useAnimations(animationClips, groupRef);

  useEffect(() => {
    onModelReady?.();
  }, [garmentScenes, onModelReady, scene]);

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
    <group ref={groupRef} position={rootPosition} rotation={[0, 0, 0]} scale={rootScale}>
      <primitive object={scene} />
      {garmentScenes.map((garmentScene, index) => (
        <primitive
          key={`${externalAssets[index]?.id ?? externalAssets[index]?.url ?? 'garment'}-${index}`}
          object={garmentScene}
        />
      ))}
    </group>
  );
}
