import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { AvatarModel } from './AvatarModel';

interface AvatarSceneProps {
  className?: string;
}

export function AvatarScene({ className }: AvatarSceneProps) {
  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 1.2, 5.2], fov: 32 }}
        dpr={[1, 1.5]}
        gl={{ alpha: true, antialias: true }}
        style={{ width: '100%', height: '100%', background: 'transparent' }}
      >
        <ambientLight intensity={1.4} />
        <directionalLight position={[2.5, 4, 4]} intensity={2.4} />
        <directionalLight position={[-3, 2, 2]} intensity={0.7} />
        <Suspense fallback={null}>
          <AvatarModel />
        </Suspense>
      </Canvas>
    </div>
  );
}
