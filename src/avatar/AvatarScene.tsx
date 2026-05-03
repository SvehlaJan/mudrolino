import { Suspense, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { AvatarModel } from './AvatarModel';
import { AvatarBodyShapeConfig, AvatarSlotSelections } from './avatarTypes';

interface AvatarSceneProps {
  className?: string;
  modelUrl?: string;
  animationUrl?: string;
  animationName?: string | null;
  slotSelections?: AvatarSlotSelections;
  bodyShape?: AvatarBodyShapeConfig;
  preserveHipsPosition?: boolean;
  onAnimationsChange?: (names: string[]) => void;
  onModelReady?: () => void;
}

function AvatarCameraRig() {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(0, 1.35, 7.2);
    camera.lookAt(0, 1.25, 0);
    camera.updateProjectionMatrix();
  }, [camera]);

  return null;
}

export function AvatarScene({
  className,
  modelUrl,
  animationUrl,
  animationName,
  slotSelections,
  bodyShape,
  preserveHipsPosition,
  onAnimationsChange,
  onModelReady,
}: AvatarSceneProps) {
  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 1.35, 7.2], fov: 34 }}
        dpr={[1, 1.5]}
        gl={{ alpha: true, antialias: true }}
        style={{ width: '100%', height: '100%', background: 'transparent' }}
      >
        <AvatarCameraRig />
        <OrbitControls
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
            bodyShape={bodyShape}
            preserveHipsPosition={preserveHipsPosition}
            onAnimationsChange={onAnimationsChange}
            onModelReady={onModelReady}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
