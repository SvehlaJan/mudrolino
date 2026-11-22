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
import type { ActiveCompanionSlot } from './companionStage';
import { inspectionCameraPose, type InspectionBounds } from './inspectionCamera';

export interface AvatarSceneProps {
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
  onPlaybackComplete?: () => void;
  onSceneData?: (data: AvatarSceneData) => void;
  onRegisterCameraReset?: (reset: () => void) => void;
}

function AvatarCameraRig({ view, bounds, cameraDistance }: { view?: AvatarInspectionControls['view']; bounds?: InspectionBounds; cameraDistance?: number }) {
  const { camera, size } = useThree();

  useLayoutEffect(() => {
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
  const configuredRef = useRef(false);
  const contentRef = useRef<ReactNode>(null);
  useLayoutEffect(() => {
    contentRef.current = <AvatarRuntimeBoundary onError={onError}>{children}</AvatarRuntimeBoundary>;
    if (configuredRef.current) {
      rootRef.current?.render(contentRef.current);
    }
  }, [children, onError]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = canvas?.parentElement;
    if (!canvas || !container) return;
    let active = true;
    let configured = false;
    let renderer: WebGLRenderer | undefined;
    let root: ReturnType<typeof createRoot> | undefined;
    let store: ReturnType<ReturnType<typeof createRoot>['render']> | undefined;
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
    // Passive effects finish StrictMode's setup/cleanup replay before this
    // microtask. A layout effect can create a context before replay, lose it
    // during cleanup, then receive that same lost context from the reused canvas.
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
      const configure = (): Promise<boolean> => {
        // Fiber writes pixel styles onto its canvas. Observe the fixed wrapper instead,
        // using layout dimensions so ancestor entrance transforms cannot feed back.
        const { clientWidth: width, clientHeight: height } = container;
        if (!width || !height || (lastSize?.width === width && lastSize.height === height)) return Promise.resolve(false);
        lastSize = { width, height };
        const { top, left } = container.getBoundingClientRect();
        const initialPose = inspectionCameraPose(undefined, width / height, undefined, cameraDistance);
        return root!.configure({
          gl: renderer,
          flat: true,
          frameloop: store?.getState().frameloop ?? 'always',
          camera: { position: initialPose.position, fov: 34 },
          dpr: [1, 1.5],
          size: { width, height, top, left },
          onCreated: state => {
            state.camera.lookAt(...initialPose.target);
            state.camera.updateProjectionMatrix();
            // R3F schedules root.render through a promise, which may settle after cleanup.
            if (!active) {
              state.setFrameloop('never');
              void Promise.resolve().then(() => root?.unmount());
            }
          },
        }).then(() => {
          configured = true;
          configuredRef.current = true;
          return true;
        });
      };
      const mountRootIfConfigured = () => {
        if (!active || !configured || store || !root) return;
        rootRef.current = root;
        store = root.render(contentRef.current);
        stopRendering = () => { store?.getState().setFrameloop('never'); };
      };
      await configure();
      if (!active) return;
      mountRootIfConfigured();
      observer = new ResizeObserver(() => {
        if (!active || resizeFrame !== undefined) return;
        resizeFrame = requestAnimationFrame(() => {
          resizeFrame = undefined;
          if (!active) return;
          void configure().then(resized => {
            if (!active || !resized) return;
            mountRootIfConfigured();
            if (!store) return;
            const state = store.getState();
            if (state.frameloop === 'never') {
              renderer?.render(state.scene, state.camera);
            }
          }).catch(fail);
        });
      });
      observer.observe(container);
    }).catch(fail);

    return () => {
      active = false;
      configuredRef.current = false;
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

const PERSISTENT_IDLE_DISPOSE_MS = 500;

function PersistentCompanionContent({
  model,
  slot,
  onModelReady,
  onPlaybackComplete,
  onError,
}: {
  model: GLTF;
  slot: ActiveCompanionSlot;
  onModelReady: () => void;
  onPlaybackComplete: () => void;
  onError: (error: unknown) => void;
}) {
  const playback = useMemo(
    () => ({
      ...slot.playback,
      eventKey: `${slot.id}:${slot.playback.eventKey ?? ''}`,
    }),
    [slot.id, slot.playback],
  );

  return (
    <>
      <AvatarCameraRig cameraDistance={slot.cameraDistance} />
      <hemisphereLight args={['#fffaf0', '#d6dde8', 1.3]} />
      <directionalLight position={[2.5, 4, 4]} intensity={1.3} />
      <directionalLight position={[-3, 2, 2]} intensity={0.6} />
      <directionalLight position={[0, 0.2, 5]} intensity={1.1} />
      <AvatarModel
        url={slot.modelUrl}
        preparedModel={model}
        animationName={slot.animationName}
        preserveHipsPosition
        playback={playback}
        interactive={false}
        onError={onError}
        onModelReady={onModelReady}
        onPlaybackComplete={onPlaybackComplete}
      />
    </>
  );
}

function PersistentRendererHost({
  activeSlot,
  slot,
  model,
  onPermanentError,
}: {
  activeSlot: ActiveCompanionSlot | null;
  slot: ActiveCompanionSlot;
  model: GLTF;
  onPermanentError: (error: unknown) => void;
}) {
  const [hostDiv] = useState<HTMLDivElement | null>(() => {
    if (typeof document === 'undefined') return null;
    const div = document.createElement('div');
    div.style.position = 'relative';
    div.style.width = '100%';
    div.style.height = '100%';
    div.style.pointerEvents = 'none';
    return div;
  });

  const activeSlotRef = useRef<ActiveCompanionSlot | null>(activeSlot);
  const slotRef = useRef<ActiveCompanionSlot>(slot);
  const modelReadyRef = useRef(false);
  const configuredRef = useRef(false);
  const rootRef = useRef<ReturnType<typeof createRoot> | null>(null);
  const storeRef = useRef<ReturnType<ReturnType<typeof createRoot>['render']> | null>(null);
  const rendererRef = useRef<WebGLRenderer | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);
  const observedContainerRef = useRef<HTMLElement | null>(null);
  const resizeFrameRef = useRef<number | undefined>(undefined);
  const lastConfigRef = useRef<{ container: HTMLElement; width: number; height: number; cameraDistance: number } | null>(null);
  const configureRef = useRef<((target: HTMLElement, cameraDistance: number, preserveFrameloop?: boolean) => Promise<boolean>) | null>(null);
  const mountRootRef = useRef<(() => void) | null>(null);
  const failRef = useRef<((error: unknown) => void) | null>(null);
  const contentRef = useRef<ReactNode>(null);
  const prevAttachedRef = useRef<{ wasDetached: boolean; id: string | null; eventKey: string | undefined }>({
    wasDetached: false,
    id: null,
    eventKey: undefined,
  });

  const handleModelReady = useCallback(() => {
    modelReadyRef.current = true;
    activeSlotRef.current?.onModelReady();
  }, []);

  const handlePlaybackComplete = useCallback(() => {
    activeSlotRef.current?.onPlaybackComplete?.();
  }, []);

  const handleFatalError = useCallback((error: unknown) => {
    failRef.current?.(error);
  }, []);

  useLayoutEffect(() => {
    activeSlotRef.current = activeSlot;
    slotRef.current = slot;
    contentRef.current = (
      <AvatarRuntimeBoundary onError={handleFatalError}>
        <PersistentCompanionContent
          model={model}
          slot={slot}
          onModelReady={handleModelReady}
          onPlaybackComplete={handlePlaybackComplete}
          onError={handleFatalError}
        />
      </AvatarRuntimeBoundary>
    );
    if (configuredRef.current) {
      rootRef.current?.render(contentRef.current);
    }
  }, [activeSlot, handleFatalError, handleModelReady, handlePlaybackComplete, model, slot]);

  useEffect(() => {
    if (!hostDiv) return;
    const canvas = document.createElement('canvas');
    canvas.tabIndex = -1;
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    hostDiv.appendChild(canvas);

    let active = true;
    let renderer: WebGLRenderer | undefined;
    let root: ReturnType<typeof createRoot> | undefined;
    let store: ReturnType<ReturnType<typeof createRoot>['render']> | undefined;

    const fail = (error: unknown) => {
      if (!active) return;
      active = false;
      store?.getState().setFrameloop('never');
      observerRef.current?.disconnect();
      if (resizeFrameRef.current !== undefined) {
        cancelAnimationFrame(resizeFrameRef.current);
        resizeFrameRef.current = undefined;
      }
      hostDiv.remove();
      onPermanentError(error);
    };
    failRef.current = fail;

    const contextLost = (event: Event) => {
      event.preventDefault();
      fail(new Error('Companion WebGL context lost'));
    };

    const configure = (targetContainer: HTMLElement, cameraDistance: number, preserveFrameloop = true): Promise<boolean> => {
      if (!active || !root || !renderer) return Promise.resolve(false);
      const { clientWidth: width, clientHeight: height } = targetContainer;
      const prev = lastConfigRef.current;
      if (
        !width ||
        !height ||
        (prev &&
          prev.container === targetContainer &&
          prev.width === width &&
          prev.height === height &&
          prev.cameraDistance === cameraDistance)
      ) {
        return Promise.resolve(false);
      }
      lastConfigRef.current = { container: targetContainer, width, height, cameraDistance };
      const { top, left } = targetContainer.getBoundingClientRect();
      const initialPose = inspectionCameraPose(undefined, width / height, undefined, cameraDistance);
      return root
        .configure({
          gl: renderer,
          flat: true,
          frameloop: preserveFrameloop ? (store?.getState().frameloop ?? 'always') : 'always',
          camera: { position: initialPose.position, fov: 34 },
          dpr: [1, 1.5],
          size: { width, height, top, left },
          onCreated: (state) => {
            state.camera.lookAt(...initialPose.target);
            state.camera.updateProjectionMatrix();
            if (!active) {
              state.setFrameloop('never');
              void Promise.resolve().then(() => root?.unmount());
            }
          },
        })
        .then(() => {
          configuredRef.current = true;
          return true;
        });
    };
    configureRef.current = configure;

    const mountRootIfConfigured = () => {
      if (!active || !configuredRef.current || store || !root) return;
      rootRef.current = root;
      store = root.render(contentRef.current);
      storeRef.current = store;
    };
    mountRootRef.current = mountRootIfConfigured;

    void Promise.resolve()
      .then(async () => {
        if (!active) return;
        extend({ Group, HemisphereLight, DirectionalLight });
        renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true });
        renderer.toneMapping = NoToneMapping;
        rendererRef.current = renderer;
        canvas.addEventListener('webglcontextlost', contextLost);
        const render = renderer.render.bind(renderer);
        renderer.render = (scene, camera) => {
          if (!active) return;
          try {
            render(scene, camera);
          } catch (error) {
            fail(error);
          }
        };
        root = createRoot(canvas);

        const currentSlot = activeSlotRef.current;
        if (currentSlot) {
          if (hostDiv.parentElement !== currentSlot.containerEl) {
            currentSlot.containerEl.appendChild(hostDiv);
          }
          await configure(currentSlot.containerEl, currentSlot.cameraDistance, false);
          if (!active) return;
          mountRootIfConfigured();
          observerRef.current?.disconnect();
          observedContainerRef.current = currentSlot.containerEl;
          observerRef.current = new ResizeObserver(() => {
            if (!active || resizeFrameRef.current !== undefined) return;
            resizeFrameRef.current = requestAnimationFrame(() => {
              resizeFrameRef.current = undefined;
              const liveSlot = activeSlotRef.current;
              if (!active || !liveSlot) return;
              void configure(liveSlot.containerEl, liveSlot.cameraDistance, true)
                .then((resized) => {
                  if (!active || !resized) return;
                  mountRootIfConfigured();
                  if (!store) return;
                  const state = store.getState();
                  if (state.frameloop === 'never') {
                    renderer?.render(state.scene, state.camera);
                  }
                })
                .catch(fail);
            });
          });
          observerRef.current.observe(currentSlot.containerEl);
        }
      })
      .catch(fail);

    return () => {
      active = false;
      modelReadyRef.current = false;
      configuredRef.current = false;
      configureRef.current = null;
      mountRootRef.current = null;
      failRef.current = null;
      rootRef.current = null;
      storeRef.current = null;
      rendererRef.current = null;
      lastConfigRef.current = null;
      store?.getState().setFrameloop('never');
      observerRef.current?.disconnect();
      observerRef.current = null;
      observedContainerRef.current = null;
      if (resizeFrameRef.current !== undefined) {
        cancelAnimationFrame(resizeFrameRef.current);
        resizeFrameRef.current = undefined;
      }
      canvas.removeEventListener('webglcontextlost', contextLost);
      hostDiv.remove();
      canvas.remove();
      root?.unmount();
      renderer?.dispose();
      renderer?.forceContextLoss();
    };
  }, [hostDiv, model, onPermanentError]);

  useLayoutEffect(() => {
    if (!hostDiv) return;
    if (!activeSlot) {
      hostDiv.remove();
      storeRef.current?.getState().setFrameloop('never');
      observerRef.current?.disconnect();
      observerRef.current = null;
      observedContainerRef.current = null;
      if (resizeFrameRef.current !== undefined) {
        cancelAnimationFrame(resizeFrameRef.current);
        resizeFrameRef.current = undefined;
      }
      prevAttachedRef.current = {
        wasDetached: true,
        id: prevAttachedRef.current.id,
        eventKey: prevAttachedRef.current.eventKey,
      };
      return;
    }

    if (hostDiv.parentElement !== activeSlot.containerEl) {
      activeSlot.containerEl.appendChild(hostDiv);
    }

    const prev = prevAttachedRef.current;
    const sameEventAfterDetach =
      prev.wasDetached &&
      prev.id === activeSlot.id &&
      prev.eventKey === activeSlot.playback.eventKey;
    prevAttachedRef.current = {
      wasDetached: false,
      id: activeSlot.id,
      eventKey: activeSlot.playback.eventKey,
    };

    if (sameEventAfterDetach && storeRef.current) {
      storeRef.current.getState().setFrameloop('always');
    }

    const renderer = rendererRef.current;
    const configure = configureRef.current;
    const mountRoot = mountRootRef.current;
    if (renderer && configure) {
      const containerChanged = observedContainerRef.current !== activeSlot.containerEl;
      if (containerChanged) {
        observerRef.current?.disconnect();
        observedContainerRef.current = activeSlot.containerEl;
        observerRef.current = new ResizeObserver(() => {
          if (resizeFrameRef.current !== undefined) return;
          resizeFrameRef.current = requestAnimationFrame(() => {
            resizeFrameRef.current = undefined;
            const liveSlot = activeSlotRef.current;
            if (!liveSlot || !configureRef.current) return;
            void configureRef.current(liveSlot.containerEl, liveSlot.cameraDistance, true)
              .then((resized) => {
                if (!resized) return;
                mountRootRef.current?.();
                const state = storeRef.current?.getState();
                if (state && state.frameloop === 'never') {
                  rendererRef.current?.render(state.scene, state.camera);
                }
              })
              .catch((error) => failRef.current?.(error));
          });
        });
        observerRef.current.observe(activeSlot.containerEl);
      }

      void configure(
        activeSlot.containerEl,
        activeSlot.cameraDistance,
        !(sameEventAfterDetach || containerChanged),
      )
        .then((resized) => {
          if (!resized || !activeSlotRef.current) return;
          mountRoot?.();
          const state = storeRef.current?.getState();
          if (state && state.frameloop === 'never') {
            rendererRef.current?.render(state.scene, state.camera);
          }
        })
        .catch((error) => failRef.current?.(error));
    }

    if (modelReadyRef.current) {
      activeSlot.onModelReady();
    }
  }, [activeSlot, hostDiv]);

  return null;
}

export function PersistentCompanionStage({
  activeSlot,
  onPermanentError,
}: {
  activeSlot: ActiveCompanionSlot | null;
  onPermanentError: (error: unknown) => void;
}) {
  const modelUrl = activeSlot?.modelUrl ?? null;
  const cachedModel = modelUrl ? loadCompanionModel.getLoaded(modelUrl) : undefined;
  const [prepared, setPrepared] = useState<{ url: string; model: GLTF } | null>(() =>
    modelUrl && cachedModel ? { url: modelUrl, model: cachedModel } : null,
  );
  const resolvedModel =
    modelUrl === null
      ? prepared?.model ?? null
      : cachedModel ?? (prepared?.url === modelUrl ? prepared.model : null);

  useEffect(() => {
    if (!modelUrl || resolvedModel) return;
    let active = true;
    void loadCompanionModel(modelUrl).then(
      (model) => {
        if (active) setPrepared({ url: modelUrl, model });
      },
      (error) => {
        if (active) onPermanentError(error);
      },
    );
    return () => {
      active = false;
    };
  }, [modelUrl, onPermanentError, resolvedModel]);

  const [retainedSlot, setRetainedSlot] = useState<ActiveCompanionSlot | null>(activeSlot);
  if (activeSlot && activeSlot !== retainedSlot) {
    setRetainedSlot(activeSlot);
  }

  useEffect(() => {
    if (activeSlot || !retainedSlot) return;
    const timer = window.setTimeout(() => {
      setRetainedSlot(null);
    }, PERSISTENT_IDLE_DISPOSE_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [activeSlot, retainedSlot]);

  const effectiveSlot = activeSlot ?? retainedSlot;
  if (!effectiveSlot || !resolvedModel) return null;
  return (
    <PersistentRendererHost
      activeSlot={activeSlot}
      slot={effectiveSlot}
      model={resolvedModel}
      onPermanentError={onPermanentError}
    />
  );
}

export function AvatarScene(props: AvatarSceneProps) {
  if (props.onError && props.interactive === false && !props.animationUrl && !props.externalAssets?.length) {
    return <PreparedCompanionScene {...props} />;
  }
  return <ReadyAvatarScene {...props} />;
}

function PreparedCompanionScene(props: AvatarSceneProps) {
  const { modelUrl, onError } = props;
  const cachedModel = loadCompanionModel.getLoaded(modelUrl);
  const [prepared, setPrepared] = useState<{ url: string; model: GLTF } | null>(() =>
    cachedModel ? { url: modelUrl, model: cachedModel } : null,
  );
  const resolvedModel = cachedModel ?? (prepared?.url === modelUrl ? prepared.model : null);
  useEffect(() => {
    if (resolvedModel) return;
    let active = true;
    void loadCompanionModel(modelUrl).then(
      model => { if (active) setPrepared({ url: modelUrl, model }); },
      error => { if (active) onError?.(error); },
    );
    return () => { active = false; };
  }, [modelUrl, onError, resolvedModel]);
  if (!resolvedModel) return null;
  return <ReadyAvatarScene {...props} preparedModel={resolvedModel} />;
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
  onPlaybackComplete,
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
          onPlaybackComplete={onPlaybackComplete}
          onSceneReady={isInspection || showSkeleton ? setAvatarScene : undefined}
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
