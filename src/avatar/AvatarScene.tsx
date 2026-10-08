import { RefObject, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Box3, NoToneMapping, Object3D } from 'three';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { AvatarModel } from './AvatarModel';
import { AvatarSkeletonOverlay } from './AvatarSkeletonOverlay';
import type { AvatarExternalAsset } from './avatarTypes';
import { AvatarBodyShapeConfig, AvatarInspectionControls, AvatarSceneData } from './avatarTypes';
import { inspectionCameraPose, type InspectionBounds } from './inspectionCamera';

interface AvatarSceneProps {
  className?: string;
  modelUrl: string;
  animationUrl?: string;
  animationName?: string | null;
  externalAssets?: AvatarExternalAsset[];
  bodyShape?: AvatarBodyShapeConfig;
  preserveHipsPosition?: boolean;
  showSkeleton?: boolean;
  inspection?: AvatarInspectionControls;
  onAnimationsChange?: (names: string[]) => void;
  onModelReady?: () => void;
  onSceneData?: (data: AvatarSceneData) => void;
  onRegisterCameraReset?: (reset: () => void) => void;
}

function AvatarCameraRig({ view, bounds }: { view?: AvatarInspectionControls['view']; bounds?: InspectionBounds }) {
  const { camera, size } = useThree();

  useEffect(() => {
    const pose = inspectionCameraPose(view, size.width / size.height, bounds);
    camera.position.set(...pose.position);
    camera.lookAt(...pose.target);
    camera.updateProjectionMatrix();
  }, [camera, view, bounds, size.width, size.height]);

  return null;
}

function CameraResetController({
  onRegister,
  controlsRef,
  view,
  bounds,
}: {
  onRegister?: (reset: () => void) => void;
  view?: AvatarInspectionControls['view'];
  bounds?: InspectionBounds;
  controlsRef: RefObject<OrbitControlsImpl | null>;
}) {
  const { camera, size } = useThree();

  const reset = useCallback(() => {
    const pose = inspectionCameraPose(view, size.width / size.height, bounds);
    camera.position.set(...pose.position);
    camera.updateProjectionMatrix();
    const controls = controlsRef.current;
    if (controls) {
      controls.target.set(...pose.target);
      controls.update();
    }
  }, [camera, controlsRef, view, bounds, size.width, size.height]);

  useEffect(() => {
    onRegister?.(reset);
  }, [onRegister, reset]);

  return null;
}

export function AvatarScene({
  className,
  modelUrl,
  animationUrl,
  animationName,
  externalAssets,
  bodyShape,
  preserveHipsPosition,
  showSkeleton,
  inspection,
  onAnimationsChange,
  onModelReady,
  onSceneData,
  onRegisterCameraReset,
}: AvatarSceneProps) {
  const [avatarScene, setAvatarScene] = useState<Object3D | null>(null);
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const isInspection = Boolean(inspection);
  const inspectionBounds = useMemo((): InspectionBounds | undefined => {
    if (!isInspection || !avatarScene) return;
    const model = avatarScene.parent ?? avatarScene;
    model.updateMatrixWorld(true);
    const box = new Box3().setFromObject(model);
    if (box.isEmpty()) return;
    return { min: [box.min.x, box.min.y, box.min.z], max: [box.max.x, box.max.y, box.max.z] };
  }, [isInspection, avatarScene]);

  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 1.35, 7.2], fov: 34 }}
        dpr={[1, 1.5]}
        gl={{ alpha: true, antialias: true, toneMapping: NoToneMapping }}
        style={{ width: '100%', height: '100%', background: 'transparent' }}
      >
        <AvatarCameraRig view={inspection?.view} bounds={inspectionBounds} />
        <CameraResetController
          onRegister={onRegisterCameraReset}
          controlsRef={controlsRef}
          view={inspection?.view}
          bounds={inspectionBounds}
        />
        <OrbitControls
          ref={controlsRef}
          target={[0, inspection ? 1.35 : 1.25, 0]}
          enablePan={Boolean(inspection)}
          minDistance={inspection ? .5 : 2}
          maxDistance={inspection ? 24 : 14}
          minPolarAngle={Math.PI * 0.1}
          maxPolarAngle={Math.PI * 0.85}
        />
        <hemisphereLight args={['#fffaf0', '#d6dde8', 1.3]} />
        <directionalLight position={[2.5, 4, 4]} intensity={1.3} />
        <directionalLight position={[-3, 2, 2]} intensity={0.6} />
        <directionalLight position={[0, 0.2, 5]} intensity={1.1} />
        <Suspense fallback={null}>
          <AvatarModel
            url={modelUrl}
            animationUrl={animationUrl}
            animationName={animationName}
            externalAssets={externalAssets}
            bodyShape={bodyShape}
            preserveHipsPosition={preserveHipsPosition}
            inspection={inspection}
            onAnimationsChange={onAnimationsChange}
            onModelReady={onModelReady}
            onSceneReady={setAvatarScene}
            onSceneData={onSceneData}
          />
        </Suspense>
        {showSkeleton && avatarScene && <AvatarSkeletonOverlay scene={avatarScene} />}
      </Canvas>
    </div>
  );
}
