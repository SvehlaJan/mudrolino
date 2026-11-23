import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from 'react';
import { useAnimations, useGLTF } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import type { GLTF } from 'three-stdlib';
import { AnimationClip, type AnimationAction } from 'three';
import { Box3, Euler, Group, Object3D, Quaternion, Vector3 } from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import {
  computeCalmIdleIntervalMs,
  resolveCompanionClipName,
  shouldPauseAvatarFrameloop,
} from './avatarFrameloop';
import {
  handoffToIdleAction,
  transitionAvatarAction,
} from './avatarPlayback';
import type { AvatarPlaybackOptions, AvatarExternalAsset } from './avatarTypes';
import { AvatarBodyShapeConfig, AvatarInspectionControls, AvatarGarmentFit, AvatarSceneData } from './avatarTypes';
import { hasSkinnedMesh, rebindGarmentToBaseSkeleton } from './skinnedGarment';
import { bindGarmentCorrectives } from './garmentCorrectives';
import { syncCompanionAccessories } from './companionAccessories';

export interface AvatarModelProps {
  url: string;
  preparedModel?: GLTF;
  animationUrl?: string;
  animationName?: string | null;
  externalAssets?: AvatarExternalAsset[];
  bodyShape?: AvatarBodyShapeConfig;
  preserveHipsPosition?: boolean;
  inspection?: AvatarInspectionControls;
  playback?: AvatarPlaybackOptions;
  yawRef?: RefObject<number>;
  pitchRef?: RefObject<number>;
  interactive?: boolean;
  onError?: (error: unknown) => void;
  onAnimationsChange?: (names: string[]) => void;
  onModelReady?: () => void;
  onPlaybackComplete?: () => void;
  onSceneReady?: (scene: Object3D) => void;
  onSceneData?: (data: AvatarSceneData) => void;
}

const _curiosityEuler = new Euler();
const _curiosityQuat = new Quaternion();

const TARGET_MODEL_HEIGHT = 2.7;
const NO_EXTERNAL_ASSETS: AvatarExternalAsset[] = [];
const NO_EXTERNAL_GLTFS: GLTF[] = [];

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
// and preserves the anatomical side convention documented in the archived slot-fitting studies.
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

export function AvatarModel(props: AvatarModelProps) {
  if (props.preparedModel) {
    return <LoadedAvatarModel {...props} gltf={props.preparedModel}
      animationSource={props.preparedModel} externalGltfs={NO_EXTERNAL_GLTFS} />;
  }
  return <SuspendedAvatarModel {...props} />;
}

/** Gallery assets retain Drei's normal Suspense/cache behavior. */
function SuspendedAvatarModel(props: AvatarModelProps) {
  const gltf = useGLTF(props.url);
  const animationSource = useGLTF(props.animationUrl ?? props.url);
  const externalAssets = props.externalAssets ?? NO_EXTERNAL_ASSETS;
  const externalAssetUrls = useMemo(() => externalAssets.map(asset => asset.url), [externalAssets]);
  const externalGltfs = useGLTF(externalAssetUrls);
  return <LoadedAvatarModel {...props} gltf={gltf} animationSource={animationSource} externalGltfs={externalGltfs} />;
}

function LoadedAvatarModel({
  gltf,
  animationSource,
  externalGltfs,
  animationName,
  externalAssets = NO_EXTERNAL_ASSETS,
  bodyShape,
  preserveHipsPosition,
  inspection,
  playback,
  yawRef,
  pitchRef,
  onError,
  onAnimationsChange,
  onModelReady,
  onPlaybackComplete,
  onSceneReady,
  onSceneData,
}: AvatarModelProps & { gltf: GLTF; animationSource: GLTF; externalGltfs: GLTF[] }) {
  const groupRef = useRef<Group>(null);
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

      const slot = externalAssets[index]?.slot;
      if (hasSkinnedMesh(clonedGarmentScene)) {
        rebindGarmentToBaseSkeleton(clonedGarmentScene, clonedScene);
      } else if (slot === 'shoes') {
        attachShoeSceneToFootBones(clonedScene, clonedGarmentScene);
      } else if (slot === 'accessory') {
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
  const garmentCorrectives = useMemo(() => bindGarmentCorrectives([scene, ...garmentScenes]), [scene, garmentScenes]);
  const setFrameloop = useThree((s) => s.setFrameloop);
  const invalidate = useThree((s) => s.invalidate);
  const inspectionAction = useRef<AnimationAction | null>(null);
  const activeActionRef = useRef<AnimationAction | null>(null);
  const idleHandoffActiveRef = useRef(false);
  const documentHiddenRef = useRef(typeof document !== 'undefined' ? document.hidden : false);
  const settledFramesRef = useRef(0);
  const completionNotifiedRef = useRef(false);
  const onPlaybackCompleteRef = useRef(onPlaybackComplete);
  const onModelReadyRef = useRef(onModelReady);
  const onSceneReadyRef = useRef(onSceneReady);
  const onSceneDataRef = useRef(onSceneData);
  const onErrorRef = useRef(onError);
  const headBone = useMemo(() => scene.getObjectByName('Head') ?? null, [scene]);
  const clipsWithHeadTrack = useMemo(
    () =>
      new Set(
        animationClips
          .filter((clip) => clip.tracks.some((track) => track.name.startsWith('Head.quaternion')))
          .map((clip) => clip.name),
      ),
    [animationClips],
  );
  const accessoryOptions = useMemo(() => ({ alwaysShowBrows: names.includes('walk') }), [names]);
  useLayoutEffect(() => {
    onPlaybackCompleteRef.current = onPlaybackComplete;
    onModelReadyRef.current = onModelReady;
    onSceneReadyRef.current = onSceneReady;
    onSceneDataRef.current = onSceneData;
    onErrorRef.current = onError;
  });
  const isInspection = Boolean(inspection);
  const inspectionTimeScale = inspection?.timeScale ?? 1;
  const playbackMode = playback?.mode;
  const playbackEventKey = playback?.eventKey;
  const playbackStartedAtMs = playback?.startedAtMs;
  const playbackIdleAfterOnce = playback?.idleAfterOnce;
  const playbackTimeScale = playback?.timeScale;
  const idleTimerRef = useRef<number | null>(null);
  const unmountedRef = useRef(false);

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current !== null && typeof window !== 'undefined') {
      window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const scheduleCalmIdleFrame = useCallback(
    (frameStartMs: number) => {
      if (
        typeof window === 'undefined' ||
        unmountedRef.current ||
        documentHiddenRef.current ||
        !idleHandoffActiveRef.current
      ) {
        return;
      }
      clearIdleTimer();
      // Yield 0ms so gl.render() finishes in this tick before timing frame cost.
      idleTimerRef.current = window.setTimeout(() => {
        idleTimerRef.current = null;
        if (
          unmountedRef.current ||
          documentHiddenRef.current ||
          !idleHandoffActiveRef.current
        ) {
          return;
        }
        const delayMs = computeCalmIdleIntervalMs(performance.now() - frameStartMs);
        idleTimerRef.current = window.setTimeout(() => {
          idleTimerRef.current = null;
          if (
            unmountedRef.current ||
            documentHiddenRef.current ||
            !idleHandoffActiveRef.current
          ) {
            return;
          }
          invalidate();
        }, delayMs);
      }, 0);
    },
    [clearIdleTimer, invalidate],
  );

  useEffect(() => {
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
      clearIdleTimer();
      activeActionRef.current?.stop();
      activeActionRef.current = null;
    };
  }, [clearIdleTimer]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const handleVisibilityChange = () => {
      const hidden = document.hidden;
      documentHiddenRef.current = hidden;
      if (isInspection) return;
      if (hidden) {
        clearIdleTimer();
        setFrameloop('never');
      } else if (idleHandoffActiveRef.current) {
        setFrameloop('demand');
        invalidate();
      } else if (
        playbackMode !== 'still' &&
        (playbackMode !== 'once' || Boolean(playbackIdleAfterOnce) || !completionNotifiedRef.current)
      ) {
        setFrameloop('always');
        invalidate();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [clearIdleTimer, invalidate, isInspection, playbackIdleAfterOnce, playbackMode, setFrameloop]);

  useFrame(() => {
    const frameStartMs = performance.now();
    if (groupRef.current) {
      groupRef.current.rotation.order = 'YXZ';
      groupRef.current.rotation.y = yawRef?.current ?? 0;
      groupRef.current.rotation.x = pitchRef?.current ?? 0;
    }

    const action = inspectionAction.current;
    if (inspection && action) {
      action.setEffectiveTimeScale(inspectionTimeScale);
      action.paused = inspection.paused;
      if (inspection.paused && inspection.progress !== undefined) {
        action.time = Math.max(0, Math.min(1, inspection.progress)) * Math.max(0, action.getClip().duration - 1e-6);
        action.getMixer().update(0);
      }
    }
    if (action) {
      const clipName = action.getClip().name;
      const dur = Math.max(1e-6, action.getClip().duration);
      const finishedOnce =
        playbackMode === 'once' &&
        !idleHandoffActiveRef.current &&
        (action.paused || action.time >= dur - 1e-6);
      const norm = ((action.time % dur) + dur) % dur / dur;
      const elapsed = finishedOnce ? 0 : action.getMixer().time;
      syncCompanionAccessories(
        scene,
        finishedOnce && !accessoryOptions.alwaysShowBrows ? null : clipName,
        norm,
        elapsed,
        accessoryOptions,
      );

      if (
        !isInspection &&
        playbackMode !== 'still' &&
        !documentHiddenRef.current &&
        !action.paused &&
        headBone &&
        clipsWithHeadTrack.has(clipName) &&
        (clipName === 'idle' || clipName === 'idle_breathe')
      ) {
        const yaw = 0.034 * Math.sin(elapsed * 0.62);
        const pitch = 0.022 * Math.sin(elapsed * 0.43 + 0.7);
        _curiosityEuler.set(pitch, yaw, 0, 'YXZ');
        _curiosityQuat.setFromEuler(_curiosityEuler);
        headBone.quaternion.multiply(_curiosityQuat);
      }

      if (!isInspection && (finishedOnce || playbackMode === 'still')) {
        if (finishedOnce && !completionNotifiedRef.current) {
          completionNotifiedRef.current = true;
          onPlaybackCompleteRef.current?.();
        }
        const idleTarget = playbackIdleAfterOnce
          ? resolveCompanionClipName(playbackIdleAfterOnce, names)
          : undefined;
        if (finishedOnce && idleTarget && actions[idleTarget]) {
          const idleAction = actions[idleTarget]!;
          idleHandoffActiveRef.current = true;
          handoffToIdleAction(action, idleAction);
          inspectionAction.current = idleAction;
          activeActionRef.current = idleAction;
          if (documentHiddenRef.current) {
            clearIdleTimer();
            setFrameloop('never');
          } else {
            setFrameloop('demand');
            scheduleCalmIdleFrame(frameStartMs);
          }
        } else {
          action.paused = true;
          const shouldPause = shouldPauseAvatarFrameloop({
            mode: playbackMode,
            isInspection,
            actionPaused: action.paused,
            actionTime: action.time,
            duration: dur,
            settledFramesRendered: settledFramesRef.current,
            documentHidden: documentHiddenRef.current,
            hasIdleAfterOnce: Boolean(idleTarget),
          });
          settledFramesRef.current += 1;
          if (shouldPause) {
            setFrameloop('never');
          }
        }
      } else if (!isInspection && documentHiddenRef.current) {
        clearIdleTimer();
        setFrameloop('never');
      } else if (!isInspection && idleHandoffActiveRef.current) {
        scheduleCalmIdleFrame(frameStartMs);
      }
    } else {
      syncCompanionAccessories(scene, animationName, 0.5, 0, accessoryOptions);
      if (!isInspection && (playbackMode === 'still' || playbackMode === 'once')) {
        if (playbackMode === 'once' && !completionNotifiedRef.current) {
          completionNotifiedRef.current = true;
          onPlaybackCompleteRef.current?.();
        }
        const shouldPause = shouldPauseAvatarFrameloop({
          mode: playbackMode,
          isInspection,
          actionPaused: true,
          actionTime: 0,
          duration: 0,
          settledFramesRendered: settledFramesRef.current,
          documentHidden: documentHiddenRef.current,
          hasIdleAfterOnce: false,
        });
        settledFramesRef.current += 1;
        if (shouldPause) {
          setFrameloop('never');
        }
      }
    }
    try {
      garmentCorrectives.update();
    } catch (error) {
      if (!onErrorRef.current) throw error;
      onErrorRef.current(error);
    }
  });

  useEffect(() => {
    onAnimationsChange?.(names);
  }, [names, onAnimationsChange]);

  useLayoutEffect(() => {
    settledFramesRef.current = 0;
    completionNotifiedRef.current = false;

    const activeName = resolveCompanionClipName(animationName, names);
    const action = activeName ? (actions[activeName] ?? null) : null;
    const prevAction = activeActionRef.current;
    const continuingHandoff =
      !isInspection &&
      idleHandoffActiveRef.current &&
      prevAction !== null &&
      action === prevAction;
    const enteringCalmIdle =
      !isInspection &&
      !continuingHandoff &&
      activeName === 'idle_breathe' &&
      playbackMode === 'once' &&
      Boolean(playbackIdleAfterOnce);

    if (!continuingHandoff) {
      clearIdleTimer();
    }
    const useCalmIdle = continuingHandoff || enteringCalmIdle;
    idleHandoffActiveRef.current = useCalmIdle;
    if (!isInspection) {
      if (documentHiddenRef.current) {
        clearIdleTimer();
        setFrameloop('never');
      } else {
        setFrameloop(useCalmIdle ? 'demand' : 'always');
        invalidate();
      }
    }

    if (!activeName) return;

    inspectionAction.current = action;
    activeActionRef.current = action;

    if (!continuingHandoff) {
      const instant = isInspection || playbackMode === 'still';
      const elapsedSeconds =
        enteringCalmIdle || playbackStartedAtMs === undefined
          ? 0
          : (performance.now() - playbackStartedAtMs) / 1000;
      const targetOptions: AvatarPlaybackOptions = enteringCalmIdle
        ? { mode: 'loop' }
        : playbackMode
          ? { mode: playbackMode }
          : { mode: 'loop' };
      transitionAvatarAction(
        prevAction,
        action,
        targetOptions,
        playbackMode && !enteringCalmIdle ? elapsedSeconds : 0,
        isInspection ? inspectionTimeScale : (playbackTimeScale ?? 1),
        instant,
      );
    }

    if (action) {
      const dur = Math.max(1e-6, action.getClip().duration);
      const finishedOnce =
        !idleHandoffActiveRef.current &&
        playbackMode === 'once' &&
        (action.paused || action.time >= dur - 1e-6);
      const norm = ((action.time % dur) + dur) % dur / dur;
      syncCompanionAccessories(
        scene,
        finishedOnce && !accessoryOptions.alwaysShowBrows ? null : action.getClip().name,
        norm,
        finishedOnce ? 0 : action.getMixer().time,
        accessoryOptions,
      );
    } else {
      syncCompanionAccessories(scene, animationName, 0.5, 0, accessoryOptions);
    }
    try {
      garmentCorrectives.update();
    } catch (error) {
      if (!onErrorRef.current) throw error;
      onErrorRef.current(error);
    }
    groupRef.current?.updateMatrixWorld(true);
  }, [
    accessoryOptions,
    actions,
    animationName,
    clearIdleTimer,
    garmentCorrectives,
    names,
    isInspection,
    inspectionTimeScale,
    playbackIdleAfterOnce,
    playbackMode,
    playbackEventKey,
    playbackStartedAtMs,
    playbackTimeScale,
    scene,
    invalidate,
    setFrameloop,
  ]);

  useLayoutEffect(() => {
    groupRef.current?.updateMatrixWorld(true);
    onModelReadyRef.current?.();
    onSceneReadyRef.current?.(scene);
    if (onSceneDataRef.current) {
      onSceneDataRef.current(computeAvatarSceneData(scene, externalAssets));
    }
  }, [externalAssets, garmentScenes, scene]);

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
