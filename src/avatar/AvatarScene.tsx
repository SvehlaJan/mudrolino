import { RefObject, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Object3D } from 'three';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { AvatarModel } from './AvatarModel';
import { AvatarSkeletonOverlay } from './AvatarSkeletonOverlay';
import type { AvatarExternalAsset } from './avatarTypes';
import { AvatarBodyShapeConfig, AvatarInspectionControls, AvatarSceneData } from './avatarTypes';

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

const CAMERA_POSITION = [0, 1.35, 7.2] as const;
const CAMERA_TARGET = [0, 1.25, 0] as const;

function inspectionPose(view: AvatarInspectionControls['view'] | undefined, aspect: number) {
  if (!view) return { position: [...CAMERA_POSITION] as [number, number, number], target: [...CAMERA_TARGET] as [number, number, number] };
  const distance = Math.max(6, 4.5 / Math.max(aspect, 0.1));
  const position: [number, number, number] = view === 'side' ? [distance, 1.35, 0] : view === 'back' ? [0, 1.35, -distance] : view === 'three-quarter' ? [distance * .707, 1.35, distance * .707] : [0, 1.35, distance];
  return { position, target: [0, 1.35, 0] as [number, number, number] };
}

function AvatarCameraRig({ view }: { view?: AvatarInspectionControls['view'] }) {
  const { camera, size } = useThree();

  useEffect(() => {
    const pose = inspectionPose(view, size.width / size.height);
    camera.position.set(...pose.position);
    camera.lookAt(...pose.target);
    camera.updateProjectionMatrix();
  }, [camera, view, size.width, size.height]);

  return null;
}

function CameraResetController({
  onRegister,
  controlsRef,
  view,
}: {
  onRegister?: (reset: () => void) => void;
  view?: AvatarInspectionControls['view'];
  controlsRef: RefObject<OrbitControlsImpl | null>;
}) {
  const { camera, size } = useThree();

  const reset = useCallback(() => {
    const pose = inspectionPose(view, size.width / size.height);
    camera.position.set(...pose.position);
    camera.updateProjectionMatrix();
    const controls = controlsRef.current;
    if (controls) {
      controls.target.set(...pose.target);
      controls.update();
    }
  }, [camera, controlsRef, view, size.width, size.height]);

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

  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 1.35, 7.2], fov: 34 }}
        dpr={[1, 1.5]}
        gl={{ alpha: true, antialias: true }}
        style={{ width: '100%', height: '100%', background: 'transparent' }}
      >
        <AvatarCameraRig view={inspection?.view} />
        <CameraResetController
          onRegister={onRegisterCameraReset}
          controlsRef={controlsRef}
          view={inspection?.view}
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
        <ambientLight intensity={1.4} />
        <directionalLight position={[2.5, 4, 4]} intensity={2.4} />
        <directionalLight position={[-3, 2, 2]} intensity={0.7} />
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
