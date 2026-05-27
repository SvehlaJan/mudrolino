import { RefObject, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Object3D } from 'three';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { AvatarModel } from './AvatarModel';
import { AvatarSkeletonOverlay } from './AvatarSkeletonOverlay';
import { AvatarExternalAsset } from './avatarAssetResolver';
import { AvatarBodyShapeConfig, AvatarSceneData, AvatarSlotSelections } from './avatarTypes';

interface AvatarSceneProps {
  className?: string;
  modelUrl?: string;
  animationUrl?: string;
  animationName?: string | null;
  slotSelections?: AvatarSlotSelections;
  embeddedMeshNames?: string[];
  externalAssets?: AvatarExternalAsset[];
  bodyShape?: AvatarBodyShapeConfig;
  preserveHipsPosition?: boolean;
  showSkeleton?: boolean;
  onAnimationsChange?: (names: string[]) => void;
  onModelReady?: () => void;
  onSceneData?: (data: AvatarSceneData) => void;
  onRegisterCameraReset?: (reset: () => void) => void;
}

const CAMERA_POSITION = [0, 1.35, 7.2] as const;
const CAMERA_TARGET = [0, 1.25, 0] as const;

function AvatarCameraRig() {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(...CAMERA_POSITION);
    camera.lookAt(...CAMERA_TARGET);
    camera.updateProjectionMatrix();
  }, [camera]);

  return null;
}

function CameraResetController({
  onRegister,
  controlsRef,
}: {
  onRegister?: (reset: () => void) => void;
  controlsRef: RefObject<OrbitControlsImpl | null>;
}) {
  const { camera } = useThree();

  const reset = useCallback(() => {
    camera.position.set(...CAMERA_POSITION);
    camera.updateProjectionMatrix();
    const controls = controlsRef.current;
    if (controls) {
      controls.target.set(...CAMERA_TARGET);
      controls.update();
    }
  }, [camera, controlsRef]);

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
  slotSelections,
  embeddedMeshNames,
  externalAssets,
  bodyShape,
  preserveHipsPosition,
  showSkeleton,
  onAnimationsChange,
  onModelReady,
  onSceneData,
  onRegisterCameraReset,
}: AvatarSceneProps) {
  const [avatarScene, setAvatarScene] = useState<Object3D | null>(null);
  const controlsRef = useRef<OrbitControlsImpl>(null);

  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 1.35, 7.2], fov: 34 }}
        dpr={[1, 1.5]}
        gl={{ alpha: true, antialias: true }}
        style={{ width: '100%', height: '100%', background: 'transparent' }}
      >
        <AvatarCameraRig />
        <CameraResetController
          onRegister={onRegisterCameraReset}
          controlsRef={controlsRef}
        />
        <OrbitControls
          ref={controlsRef}
          target={[0, 1.25, 0]}
          enablePan={false}
          minDistance={2}
          maxDistance={14}
          minPolarAngle={Math.PI * 0.1}
          maxPolarAngle={Math.PI * 0.85}
        />
        <ambientLight intensity={1.4} />
        <directionalLight position={[2.5, 4, 4]} intensity={2.4} />
        <directionalLight position={[-3, 2, 2]} intensity={0.7} />
        <Suspense fallback={null}>
          <AvatarModel
            url={modelUrl}
            animationUrl={animationUrl}
            animationName={animationName}
            slotSelections={slotSelections}
            embeddedMeshNames={embeddedMeshNames}
            externalAssets={externalAssets}
            bodyShape={bodyShape}
            preserveHipsPosition={preserveHipsPosition}
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
