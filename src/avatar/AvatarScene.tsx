import { type ReactNode, RefObject, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, createRoot, extend, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Box3, DirectionalLight, Group, HemisphereLight, NoToneMapping, Object3D, WebGLRenderer } from 'three';
import { OrbitControls as OrbitControlsImpl, type GLTF } from 'three-stdlib';
import { loadCompanionModel } from './companionModelLoader';
import { AvatarModel } from './AvatarModel';
import { AvatarSkeletonOverlay } from './AvatarSkeletonOverlay';
import { AvatarRuntimeBoundary } from './AvatarRuntimeBoundary';
import type { AvatarPlaybackOptions, AvatarExternalAsset } from './avatarTypes';
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
  cameraDistance?: number;
  playback?: AvatarPlaybackOptions;
  interactive?: boolean;
  onError?: (error: unknown) => void;
  onAnimationsChange?: (names: string[]) => void;
  onModelReady?: () => void;
  onSceneData?: (data: AvatarSceneData) => void;
  onRegisterCameraReset?: (reset: () => void) => void;
}

function AvatarCameraRig({ view, bounds, cameraDistance }: { view?: AvatarInspectionControls['view']; bounds?: InspectionBounds; cameraDistance?: number }) {
  const { camera, size } = useThree();

  useEffect(() => {
    const pose = inspectionCameraPose(view, size.width / size.height, bounds, cameraDistance);
    camera.position.set(...pose.position);
    camera.lookAt(...pose.target);
    camera.updateProjectionMatrix();
  }, [camera, view, bounds, cameraDistance, size.width, size.height]);

  return null;
}

function CameraResetController({
  onRegister,
  controlsRef,
  view,
  bounds,
  cameraDistance,
}: {
  onRegister?: (reset: () => void) => void;
  view?: AvatarInspectionControls['view'];
  bounds?: InspectionBounds;
  cameraDistance?: number;
  controlsRef: RefObject<OrbitControlsImpl | null>;
}) {
  const { camera, size } = useThree();

  const reset = useCallback(() => {
    const pose = inspectionCameraPose(view, size.width / size.height, bounds, cameraDistance);
    camera.position.set(...pose.position);
    camera.updateProjectionMatrix();
    const controls = controlsRef.current;
    if (controls) {
      controls.target.set(...pose.target);
      controls.update();
    }
  }, [camera, controlsRef, view, bounds, cameraDistance, size.width, size.height]);

  useEffect(() => {
    onRegister?.(reset);
  }, [onRegister, reset]);

  return null;
}

/** Initialize WebGL before creating an R3F root: Canvas does not catch configure rejections. */
function CompanionCanvas({ children, onError, cameraDistance }: { children: ReactNode; onError: (error: unknown) => void; cameraDistance?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rootRef = useRef<ReturnType<typeof createRoot> | null>(null);
  const contentRef = useRef<ReactNode>(null);
  useLayoutEffect(() => {
    contentRef.current = <AvatarRuntimeBoundary onError={onError}>{children}</AvatarRuntimeBoundary>;
    rootRef.current?.render(contentRef.current);
  }, [children, onError]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = canvas?.parentElement;
    if (!canvas || !container) return;
    let active = true;
    let renderer: WebGLRenderer | undefined;
    let root: ReturnType<typeof createRoot> | undefined;
    let observer: ResizeObserver | undefined;
    let resizeFrame: number | undefined;
    let lastSize: { width: number; height: number } | undefined;
    let stopRendering: (() => void) | undefined;
    const fail = (error: unknown) => {
      if (!active) return;
      stopRendering?.();
      onError(error);
    };
    const contextLost = (event: Event) => {
      event.preventDefault();
      fail(new Error('Companion WebGL context lost'));
    };
    // A cancelled mount (including StrictMode's first effect) creates no root or context.
    void Promise.resolve().then(async () => {
      if (!active) return;
      extend({ Group, HemisphereLight, DirectionalLight });
      renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true });
      renderer.toneMapping = NoToneMapping;
      canvas.addEventListener('webglcontextlost', contextLost);
      const render = renderer.render.bind(renderer);
      renderer.render = (scene, camera) => {
        if (!active) return;
        try { render(scene, camera); } catch (error) { fail(error); }
      };
      root = createRoot(canvas);
      const configure = () => {
        // Fiber writes pixel styles onto its canvas. Observe the fixed wrapper instead,
        // using layout dimensions so ancestor entrance transforms cannot feed back.
        const { clientWidth: width, clientHeight: height } = container;
        if (!width || !height || (lastSize?.width === width && lastSize.height === height)) return Promise.resolve();
        lastSize = { width, height };
        const { top, left } = container.getBoundingClientRect();
        return root!.configure({
          gl: renderer,
          flat: true,
          camera: { position: inspectionCameraPose(undefined, 1, undefined, cameraDistance).position, fov: 34 },
          dpr: [1, 1.5],
          size: { width, height, top, left },
          onCreated: state => {
            // R3F schedules root.render through a promise, which may settle after cleanup.
            if (!active) {
              state.setFrameloop('never');
              void Promise.resolve().then(() => root?.unmount());
            }
          },
        });
      };
      await configure();
      if (!active) return;
      rootRef.current = root;
      const store = root.render(contentRef.current);
      stopRendering = () => { store.getState().setFrameloop('never'); };
      observer = new ResizeObserver(() => {
        if (!active || resizeFrame !== undefined) return;
        resizeFrame = requestAnimationFrame(() => {
          resizeFrame = undefined;
          if (active) void configure().catch(fail);
        });
      });
      observer.observe(container);
    }).catch(fail);

    return () => {
      active = false;
      rootRef.current = null;
      stopRendering?.();
      observer?.disconnect();
      if (resizeFrame !== undefined) cancelAnimationFrame(resizeFrame);
      canvas.removeEventListener('webglcontextlost', contextLost);
      root?.unmount();
      renderer?.dispose();
      renderer?.forceContextLoss();
    };
  }, [onError, cameraDistance]);

  return <canvas ref={canvasRef} tabIndex={-1} aria-hidden="true" style={{ display: 'block', width: '100%', height: '100%', pointerEvents: 'none' }} />;
}

export function AvatarScene(props: AvatarSceneProps) {
  if (props.onError && props.interactive === false && !props.animationUrl && !props.externalAssets?.length) {
    return <PreparedCompanionScene {...props} />;
  }
  return <ReadyAvatarScene {...props} />;
}

function PreparedCompanionScene(props: AvatarSceneProps) {
  const { modelUrl, onError } = props;
  const [prepared, setPrepared] = useState<{ url: string; model: GLTF } | null>(null);
  useEffect(() => {
    let active = true;
    void loadCompanionModel(modelUrl).then(
      model => { if (active) setPrepared({ url: modelUrl, model }); },
      error => { if (active) onError?.(error); },
    );
    return () => { active = false; };
  }, [modelUrl, onError]);
  if (prepared?.url !== modelUrl) return null;
  return <ReadyAvatarScene {...props} preparedModel={prepared.model} />;
}

function ReadyAvatarScene({
  preparedModel,
  className,
  modelUrl,
  animationUrl,
  animationName,
  externalAssets,
  bodyShape,
  preserveHipsPosition,
  showSkeleton,
  inspection,
  cameraDistance,
  playback,
  interactive = true,
  onError,
  onAnimationsChange,
  onModelReady,
  onSceneData,
  onRegisterCameraReset,
}: AvatarSceneProps & { preparedModel?: GLTF }) {
  const [avatarScene, setAvatarScene] = useState<Object3D | null>(null);
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const [failed, setFailed] = useState(false);
  const failureReported = useRef(false);
  const reportError = useCallback((error: unknown) => {
    if (failureReported.current) return;
    failureReported.current = true;
    setFailed(true);
    onError?.(error);
  }, [onError]);
  const isInspection = Boolean(inspection);
  const inspectionBounds = useMemo((): InspectionBounds | undefined => {
    if (!isInspection || !avatarScene) return;
    const model = avatarScene.parent ?? avatarScene;
    model.updateMatrixWorld(true);
    const box = new Box3().setFromObject(model);
    if (box.isEmpty()) return;
    return { min: [box.min.x, box.min.y, box.min.z], max: [box.max.x, box.max.y, box.max.z] };
  }, [isInspection, avatarScene]);

  if (failed) return null;
  const content = (
    <>
      <AvatarCameraRig view={inspection?.view} bounds={inspectionBounds} cameraDistance={cameraDistance} />
      <CameraResetController
        onRegister={onRegisterCameraReset}
        controlsRef={controlsRef}
        view={inspection?.view}
        bounds={inspectionBounds}
        cameraDistance={cameraDistance}
      />
      {interactive && <OrbitControls
        ref={controlsRef}
        target={[0, inspection ? 1.35 : 1.25, 0]}
        enablePan={Boolean(inspection)}
        minDistance={inspection ? .5 : 2}
        maxDistance={inspection ? 24 : 14}
        minPolarAngle={Math.PI * 0.1}
        maxPolarAngle={Math.PI * 0.85}
      />}
      <hemisphereLight args={['#fffaf0', '#d6dde8', 1.3]} />
      <directionalLight position={[2.5, 4, 4]} intensity={1.3} />
      <directionalLight position={[-3, 2, 2]} intensity={0.6} />
      <directionalLight position={[0, 0.2, 5]} intensity={1.1} />
      <Suspense fallback={null}>
        <AvatarModel
          url={modelUrl}
          preparedModel={preparedModel}
          animationUrl={animationUrl}
          animationName={animationName}
          externalAssets={externalAssets}
          bodyShape={bodyShape}
          preserveHipsPosition={preserveHipsPosition}
          inspection={inspection}
          playback={playback}
          interactive={interactive}
          onError={onError ? reportError : undefined}
          onAnimationsChange={onAnimationsChange}
          onModelReady={onModelReady}
          onSceneReady={setAvatarScene}
          onSceneData={onSceneData}
        />
      </Suspense>
      {showSkeleton && avatarScene && <AvatarSkeletonOverlay scene={avatarScene} />}
    </>
  );

  return (
    <div className={className}>
      {onError && !interactive ? (
        <CompanionCanvas onError={reportError} cameraDistance={cameraDistance}>{content}</CompanionCanvas>
      ) : (
        <Canvas
          camera={{ position: inspectionCameraPose(undefined, 1, undefined, cameraDistance).position, fov: 34 }}
          dpr={[1, 1.5]}
          gl={{ alpha: true, antialias: true, toneMapping: NoToneMapping }}
          style={{ width: '100%', height: '100%', background: 'transparent' }}
        >
          {content}
        </Canvas>
      )}
    </div>
  );
}
