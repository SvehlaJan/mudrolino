import { useEffect, useMemo, useRef } from 'react';
import { useAnimations, useGLTF } from '@react-three/drei';
import { AnimationClip } from 'three';
import { Box3, Group, Object3D, Vector3 } from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { AvatarExternalAsset } from './avatarAssetResolver';
import { AVATAR_MODEL_URL } from './avatarConstants';
import { AvatarBodyShapeConfig, AvatarGarmentFit, AvatarSceneData } from './avatarTypes';

interface AvatarModelProps {
  url?: string;
  animationUrl?: string;
  animationName?: string | null;
  externalAssets?: AvatarExternalAsset[];
  bodyShape?: AvatarBodyShapeConfig;
  preserveHipsPosition?: boolean;
  onAnimationsChange?: (names: string[]) => void;
  onModelReady?: () => void;
  onSceneReady?: (scene: Object3D) => void;
  onSceneData?: (data: AvatarSceneData) => void;
}

const TARGET_MODEL_HEIGHT = 2.7;

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

// Attach each shoe root to the foot bone on the same side of X=0.
// Shoe GLBs follow viewer-left naming (negative X = viewer's left = character's anatomical
// right), while bones use anatomical naming (LeftFoot = character's left = positive X).
// Matching by X position instead of object name keeps both conventions working correctly
// and stays consistent with the Blender render_avatar_runtime_slots.py debug script.
function attachShoeSceneToFootBones(baseScene: Object3D, garmentScene: Object3D) {
  baseScene.updateMatrixWorld(true);
  garmentScene.updateMatrixWorld(true);

  // Snapshot children before iteration — attach() removes each child from garmentScene mid-loop.
  const roots = [...garmentScene.children];
  const worldPos = new Vector3();

  for (const root of roots) {
    root.getWorldPosition(worldPos);
    // Positive X = character's anatomical left → LeftFoot
    // Negative X = character's anatomical right → RightFoot
    const boneName = worldPos.x >= 0 ? 'LeftToeBase' : 'RightToeBase';
    const footBone = baseScene.getObjectByName(boneName);
    footBone?.attach(root);
  }
}

function attachAccessoryToHeadBone(baseScene: Object3D, garmentScene: Object3D) {
  baseScene.updateMatrixWorld(true);
  garmentScene.updateMatrixWorld(true);

  const headBone = baseScene.getObjectByName('Head');
  if (!headBone) return;

  const roots = [...garmentScene.children];
  for (const root of roots) {
    headBone.attach(root);
  }
}

function getPreviewScale(bodyShape?: AvatarBodyShapeConfig) {
  const scale = bodyShape?.scale ?? 1;
  return Math.min(1.2, Math.max(0.8, scale));
}

const SNAPSHOT_BONES = ['Head', 'Hips', 'LeftFoot', 'RightFoot', 'LeftToeBase', 'RightToeBase'];

function r3(n: number) {
  return Math.round(n * 1000) / 1000;
}

function vec3(v: Vector3) {
  return { x: r3(v.x), y: r3(v.y), z: r3(v.z) };
}

function computeAvatarSceneData(
  scene: Object3D,
  externalAssets: AvatarExternalAsset[],
): AvatarSceneData {
  scene.updateMatrixWorld(true);
  const worldPos = new Vector3();

  const bones: AvatarSceneData['bones'] = {};
  for (const name of SNAPSHOT_BONES) {
    const bone = scene.getObjectByName(name);
    if (bone) {
      bone.getWorldPosition(worldPos);
      bones[name] = vec3(worldPos);
    }
  }

  const garments: AvatarSceneData['garments'] = {};

  for (const asset of externalAssets) {
    if (asset.slot === 'accessory') {
      const headBone = scene.getObjectByName('Head');
      if (!headBone) continue;
      headBone.getWorldPosition(worldPos);
      const boneWorld = vec3(worldPos);
      const bounds = new Box3();
      headBone.traverse((obj) => {
        if ('isMesh' in obj && obj.isMesh) bounds.expandByObject(obj);
      });
      if (bounds.isEmpty()) continue;
      const center = new Vector3();
      bounds.getCenter(center);
      garments['accessory'] = {
        targetBone: 'Head',
        boneWorld,
        meshCenter: vec3(center),
        meshBounds: { zMin: r3(bounds.min.z), zMax: r3(bounds.max.z) },
      } satisfies AvatarGarmentFit;
    } else if (asset.slot === 'shoes') {
      for (const [key, boneName] of [
        ['shoes_L', 'LeftToeBase'],
        ['shoes_R', 'RightToeBase'],
      ] as const) {
        const footBone = scene.getObjectByName(boneName);
        if (!footBone) continue;
        footBone.getWorldPosition(worldPos);
        const boneWorld = vec3(worldPos);
        const bounds = new Box3();
        footBone.traverse((obj) => {
          if ('isMesh' in obj && obj.isMesh) bounds.expandByObject(obj);
        });
        if (bounds.isEmpty()) continue;
        const center = new Vector3();
        bounds.getCenter(center);
        garments[key] = {
          targetBone: boneName,
          boneWorld,
          meshCenter: vec3(center),
          meshBounds: { zMin: r3(bounds.min.z), zMax: r3(bounds.max.z) },
        } satisfies AvatarGarmentFit;
      }
    }
  }

  return { bones, garments };
}

export function AvatarModel({
  url = AVATAR_MODEL_URL,
  animationUrl,
  animationName,
  externalAssets = [],
  bodyShape,
  preserveHipsPosition,
  onAnimationsChange,
  onModelReady,
  onSceneReady,
  onSceneData,
}: AvatarModelProps) {
  const groupRef = useRef<Group>(null);
  const gltf = useGLTF(url);
  const animationSource = useGLTF(animationUrl ?? url);
  const externalAssetUrls = useMemo(
    () => externalAssets.map((asset) => asset.url),
    [externalAssets],
  );
  const externalGltfs = useGLTF(externalAssetUrls);
  const { scene, garmentScenes, hipsAnchor, rootScale, rootPosition } = useMemo(() => {
    const clonedScene = clone(gltf.scene);
    const hips = clonedScene.getObjectByName('Hips');
    clonedScene.updateMatrixWorld(true);
    disableMeshFrustumCulling(clonedScene);
    const bounds = new Box3().setFromObject(clonedScene);
    const size = new Vector3();
    const center = new Vector3();

    bounds.getSize(size);
    bounds.getCenter(center);

    const scale = (size.y > 0 ? TARGET_MODEL_HEIGHT / size.y : 1) * getPreviewScale(bodyShape);
    const position = new Vector3(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
    const clonedGarmentScenes = externalGltfs.map((externalGltf, index) => {
      const clonedGarmentScene = clone(externalGltf.scene);
      clonedGarmentScene.updateMatrixWorld(true);
      disableMeshFrustumCulling(clonedGarmentScene);

      if (externalAssets[index]?.slot === 'shoes') {
        attachShoeSceneToFootBones(clonedScene, clonedGarmentScene);
      }
      if (externalAssets[index]?.slot === 'accessory') {
        attachAccessoryToHeadBone(clonedScene, clonedGarmentScene);
      }

      return clonedGarmentScene;
    });

    return {
      scene: clonedScene,
      garmentScenes: clonedGarmentScenes,
      hipsAnchor: hips?.position.clone() ?? new Vector3(),
      rootScale: scale,
      rootPosition: position,
    };
  }, [bodyShape, externalAssets, externalGltfs, gltf.scene]);
  const animationClips = useMemo(
    () => sanitizeAnimationClips(animationSource.animations, hipsAnchor, preserveHipsPosition),
    [animationSource.animations, hipsAnchor, preserveHipsPosition],
  );
  const { actions, names } = useAnimations(animationClips, groupRef);

  useEffect(() => {
    groupRef.current?.updateMatrixWorld(true);
    onModelReady?.();
    onSceneReady?.(scene);
    onSceneData?.(computeAvatarSceneData(scene, externalAssets));
  }, [externalAssets, garmentScenes, onModelReady, onSceneData, onSceneReady, scene]);

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
