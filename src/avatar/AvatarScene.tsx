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
import {
  planCompanionWalk,
  sampleCompanionWalk,
  type CompanionRect,
  type CompanionTravelStyle,
} from './companionWalkTransition';
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

function createCompanionRenderer(
  canvas: HTMLCanvasElement,
  isActive: () => boolean,
  onFatalError: (error: unknown) => void,
) {
  extend({ Group, HemisphereLight, DirectionalLight });
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.toneMapping = NoToneMapping;
  const contextLost = (event: Event) => {
    event.preventDefault();
    onFatalError(new Error('Companion WebGL context lost'));
  };
  canvas.addEventListener('webglcontextlost', contextLost);
  const render = renderer.render.bind(renderer);
  renderer.render = (scene, camera) => {
    if (!isActive()) return;
    try {
      render(scene, camera);
    } catch (error) {
      onFatalError(error);
    }
  };
  return {
    renderer,
    removeListeners: () => canvas.removeEventListener('webglcontextlost', contextLost),
    dispose: () => {
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}

function paintCompanionAfterConfigure(
  store: ReturnType<ReturnType<typeof createRoot>['render']> | null | undefined,
  renderer: WebGLRenderer | null | undefined,
  width: number,
  height: number,
  cameraDistance?: number,
) {
  if (!store || !renderer || width <= 0 || height <= 0) return;
  const state = store.getState();
  const pose = inspectionCameraPose(undefined, width / height, undefined, cameraDistance);
  state.camera.position.set(...pose.position);
  state.camera.lookAt(...pose.target);
  state.camera.updateProjectionMatrix();
  renderer.render(state.scene, state.camera);
  if (state.frameloop === 'demand') {
    state.invalidate();
  }
}

function resumeCompanionFrameloop(
  store: { getState: () => { setFrameloop: (mode: 'always' | 'never') => void; invalidate: () => void } } | null | undefined,
) {
  if (!store) return;
  const state = store.getState();
  state.setFrameloop('always');
  // Calling setFrameloop('always') after 'never' updates state and clock, but R3F
  // only re-arms its stopped rAF loop when invalidate() runs.
  state.invalidate();
}

function observeCompanionContainer(
  targetContainer: HTMLElement,
  isActive: () => boolean,
  onResizeFrame: () => void,
): () => void {
  let frameId: number | undefined;
  const observer = new ResizeObserver(() => {
    if (!isActive() || frameId !== undefined) return;
    frameId = requestAnimationFrame(() => {
      frameId = undefined;
      if (!isActive()) return;
      onResizeFrame();
    });
  });
  observer.observe(targetContainer);
  return () => {
    observer.disconnect();
    if (frameId !== undefined) {
      cancelAnimationFrame(frameId);
      frameId = undefined;
    }
  };
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
    let rendererHandle: ReturnType<typeof createCompanionRenderer> | undefined;
    let root: ReturnType<typeof createRoot> | undefined;
    let store: ReturnType<ReturnType<typeof createRoot>['render']> | undefined;
    let stopObservingResize: (() => void) | undefined;
    let lastSize: { width: number; height: number } | undefined;
    let stopRendering: (() => void) | undefined;
    const fail = (error: unknown) => {
      if (!active) return;
      stopRendering?.();
      onError(error);
    };
    // Passive effects finish StrictMode's setup/cleanup replay before this
    // microtask. A layout effect can create a context before replay, lose it
    // during cleanup, then receive that same lost context from the reused canvas.
    void Promise.resolve().then(async () => {
      if (!active) return;
      rendererHandle = createCompanionRenderer(canvas, () => active, fail);
      const { renderer } = rendererHandle;
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
      stopObservingResize = observeCompanionContainer(container, () => active, () => {
        void configure().then(resized => {
          if (!active || !resized) return;
          mountRootIfConfigured();
          if (lastSize) {
            paintCompanionAfterConfigure(store, renderer, lastSize.width, lastSize.height, cameraDistance);
          }
        }).catch(fail);
      });
    }).catch(fail);

    return () => {
      active = false;
      configuredRef.current = false;
      rootRef.current = null;
      stopRendering?.();
      stopObservingResize?.();
      rendererHandle?.removeListeners();
      root?.unmount();
      rendererHandle?.dispose();
    };
  }, [onError, cameraDistance]);

  return <canvas ref={canvasRef} tabIndex={-1} aria-hidden="true" style={{ display: 'block', width: '100%', height: '100%', pointerEvents: 'none' }} />;
}

const PERSISTENT_IDLE_DISPOSE_MS = 500;
const DETACH_GRACE_MS = 80;

function captureElementRect(el: HTMLElement | null | undefined): CompanionRect | null {
  if (!el || !el.isConnected) return null;
  const r = el.getBoundingClientRect();
  if (r.width < 12 || r.height < 12) return null;
  return { left: r.left, top: r.top, width: r.width, height: r.height };
}

function applyHostFixedPinStyles(hostDiv: HTMLDivElement, rect: CompanionRect): void {
  hostDiv.style.position = 'fixed';
  hostDiv.style.left = '0px';
  hostDiv.style.top = '0px';
  hostDiv.style.width = `${rect.width}px`;
  hostDiv.style.height = `${rect.height}px`;
  hostDiv.style.margin = '0';
  hostDiv.style.zIndex = '60';
  hostDiv.style.pointerEvents = 'none';
  hostDiv.style.transformOrigin = 'top left';
  hostDiv.style.transform = `translate3d(${rect.left}px, ${rect.top}px, 0)`;
}

type TravelOverride = {
  clipName: 'walk' | 'jump';
  eventKey: string;
  timeScale: number;
};

function applyHostWalkStartStyles(
  hostDiv: HTMLDivElement,
  from: CompanionRect,
  style: CompanionTravelStyle,
): void {
  hostDiv.dataset.companionWalking = 'true';
  hostDiv.dataset.companionTravelStyle = style;
  applyHostFixedPinStyles(hostDiv, from);
}

function resetHostDockStyles(hostDiv: HTMLDivElement): void {
  delete hostDiv.dataset.companionWalking;
  delete hostDiv.dataset.companionTravelStyle;
  hostDiv.style.position = 'relative';
  hostDiv.style.left = '';
  hostDiv.style.top = '';
  hostDiv.style.width = '100%';
  hostDiv.style.height = '100%';
  hostDiv.style.margin = '';
  hostDiv.style.zIndex = '';
  hostDiv.style.transformOrigin = '';
  hostDiv.style.transform = '';
  hostDiv.style.pointerEvents = 'none';
}

function PersistentCompanionContent({
  model,
  slot,
  overrideAnimation,
  overridePlayback,
  yawRef,
  pitchRef,
  onModelReady,
  onPlaybackComplete,
  onError,
}: {
  model: GLTF;
  slot: ActiveCompanionSlot;
  overrideAnimation?: string | null;
  overridePlayback?: AvatarPlaybackOptions | null;
  yawRef?: RefObject<number>;
  pitchRef?: RefObject<number>;
  onModelReady: () => void;
  onPlaybackComplete: () => void;
  onError: (error: unknown) => void;
}) {
  const playback = useMemo(
    () =>
      overridePlayback ?? {
        ...slot.playback,
        eventKey: `${slot.id}:${slot.playback.eventKey ?? ''}`,
      },
    [overridePlayback, slot.id, slot.playback],
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
        animationName={overrideAnimation !== undefined ? overrideAnimation : slot.animationName}
        preserveHipsPosition
        playback={playback}
        yawRef={yawRef}
        pitchRef={pitchRef}
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
  const hostDivRef = useRef<HTMLDivElement | null>(null);
  const activeSlotRef = useRef<ActiveCompanionSlot | null>(activeSlot);
  const slotRef = useRef<ActiveCompanionSlot>(slot);
  const modelReadyRef = useRef(false);
  const configuredRef = useRef(false);
  const rootRef = useRef<ReturnType<typeof createRoot> | null>(null);
  const storeRef = useRef<ReturnType<ReturnType<typeof createRoot>['render']> | null>(null);
  const rendererRef = useRef<WebGLRenderer | null>(null);
  const stopObservingRef = useRef<(() => void) | null>(null);
  const observedContainerRef = useRef<HTMLElement | null>(null);
  const lastConfigRef = useRef<{ width: number; height: number; cameraDistance: number } | null>(null);
  const configureRef = useRef<((target: HTMLElement, cameraDistance: number, preserveFrameloop?: boolean) => Promise<boolean>) | null>(null);
  const mountRootRef = useRef<(() => void) | null>(null);
  const failRef = useRef<((error: unknown) => void) | null>(null);
  const buildContentRef = useRef<((travelOverride?: TravelOverride | null) => ReactNode) | null>(null);
  const contentRef = useRef<ReactNode>(null);
  const yawRef = useRef(0);
  const pitchRef = useRef(0);
  const isWalkingRef = useRef(false);
  const walkTargetRef = useRef<{ id: string; containerEl: HTMLElement } | null>(null);
  const walkSeqRef = useRef(0);
  const walkCancelRef = useRef<(() => void) | null>(null);
  const detachGraceTimerRef = useRef<number | null>(null);
  const lastDockedRef = useRef<{ slotId: string; rect: CompanionRect; capturedAtMs: number } | null>(null);
  const prevAttachedRef = useRef<{ wasDetached: boolean; id: string | null; eventKey: string | undefined }>({
    wasDetached: false,
    id: null,
    eventKey: undefined,
  });

  const clearDetachGrace = useCallback(() => {
    if (detachGraceTimerRef.current !== null && typeof window !== 'undefined') {
      window.clearTimeout(detachGraceTimerRef.current);
      detachGraceTimerRef.current = null;
    }
  }, []);

  const handleModelReady = useCallback(() => {
    modelReadyRef.current = true;
    const liveSlot = activeSlotRef.current;
    if (liveSlot && !isWalkingRef.current) {
      const rect = captureElementRect(liveSlot.containerEl);
      if (rect) {
        lastDockedRef.current = {
          slotId: liveSlot.id,
          rect,
          capturedAtMs: performance.now(),
        };
      }
    }
    liveSlot?.onModelReady();
  }, []);

  const handlePlaybackComplete = useCallback(() => {
    activeSlotRef.current?.onPlaybackComplete?.();
  }, []);

  const handleFatalError = useCallback((error: unknown) => {
    failRef.current?.(error);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const hostDiv = document.createElement('div');
    resetHostDockStyles(hostDiv);
    hostDivRef.current = hostDiv;
    const canvas = document.createElement('canvas');
    canvas.tabIndex = -1;
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    hostDiv.appendChild(canvas);

    let active = true;
    let rendererHandle: ReturnType<typeof createCompanionRenderer> | undefined;
    let root: ReturnType<typeof createRoot> | undefined;
    let store: ReturnType<ReturnType<typeof createRoot>['render']> | undefined;

    const captureDockedBeforeInteraction = () => {
      const liveSlot = activeSlotRef.current;
      if (!liveSlot || isWalkingRef.current) return;
      const rect = captureElementRect(liveSlot.containerEl);
      if (rect) {
        lastDockedRef.current = {
          slotId: liveSlot.id,
          rect,
          capturedAtMs: performance.now(),
        };
      }
    };
    window.addEventListener('pointerdown', captureDockedBeforeInteraction, { capture: true, passive: true });
    window.addEventListener('keydown', captureDockedBeforeInteraction, { capture: true, passive: true });
    window.addEventListener('scroll', captureDockedBeforeInteraction, { capture: true, passive: true });
    window.addEventListener('resize', captureDockedBeforeInteraction, { passive: true });

    const fail = (error: unknown) => {
      if (!active) return;
      active = false;
      clearDetachGrace();
      walkCancelRef.current?.();
      walkCancelRef.current = null;
      isWalkingRef.current = false;
      walkTargetRef.current = null;
      store?.getState().setFrameloop('never');
      stopObservingRef.current?.();
      stopObservingRef.current = null;
      resetHostDockStyles(hostDiv);
      hostDiv.remove();
      onPermanentError(error);
    };
    failRef.current = fail;

    const configure = (targetContainer: HTMLElement, cameraDistance: number, preserveFrameloop = true): Promise<boolean> => {
      if (!active || !root || !rendererRef.current) return Promise.resolve(false);
      const { clientWidth: width, clientHeight: height } = targetContainer;
      const prev = lastConfigRef.current;
      if (
        !width ||
        !height ||
        (prev &&
          prev.width === width &&
          prev.height === height &&
          prev.cameraDistance === cameraDistance)
      ) {
        return Promise.resolve(false);
      }
      lastConfigRef.current = { width, height, cameraDistance };
      const { top, left } = targetContainer.getBoundingClientRect();
      const initialPose = inspectionCameraPose(undefined, width / height, undefined, cameraDistance);
      return root
        .configure({
          gl: rendererRef.current,
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
      const nextContent = contentRef.current ?? buildContentRef.current?.(null) ?? null;
      contentRef.current = nextContent;
      store = root.render(nextContent);
      storeRef.current = store;
    };
    mountRootRef.current = mountRootIfConfigured;

    void Promise.resolve()
      .then(async () => {
        if (!active) return;
        rendererHandle = createCompanionRenderer(canvas, () => active, fail);
        rendererRef.current = rendererHandle.renderer;
        root = createRoot(canvas);

        const currentSlot = activeSlotRef.current;
        if (currentSlot) {
          if (hostDiv.parentElement !== currentSlot.containerEl) {
            currentSlot.containerEl.appendChild(hostDiv);
          }
          const rect = captureElementRect(currentSlot.containerEl);
          if (rect) {
            lastDockedRef.current = {
              slotId: currentSlot.id,
              rect,
              capturedAtMs: performance.now(),
            };
          }
          await configure(currentSlot.containerEl, currentSlot.cameraDistance, false);
          if (!active) return;
          prevAttachedRef.current = {
            wasDetached: false,
            id: currentSlot.id,
            eventKey: currentSlot.playback.eventKey,
          };
          mountRootIfConfigured();
          stopObservingRef.current?.();
          observedContainerRef.current = currentSlot.containerEl;
          stopObservingRef.current = observeCompanionContainer(currentSlot.containerEl, () => active, () => {
            const liveSlot = activeSlotRef.current;
            if (!liveSlot || isWalkingRef.current) return;
            const liveRect = captureElementRect(liveSlot.containerEl);
            if (liveRect) {
              lastDockedRef.current = {
                slotId: liveSlot.id,
                rect: liveRect,
                capturedAtMs: performance.now(),
              };
            }
            void configure(liveSlot.containerEl, liveSlot.cameraDistance, true)
              .then((resized) => {
                if (!active || !resized) return;
                mountRootIfConfigured();
                paintCompanionAfterConfigure(
                  store,
                  rendererHandle?.renderer,
                  liveSlot.containerEl.clientWidth,
                  liveSlot.containerEl.clientHeight,
                  liveSlot.cameraDistance,
                );
              })
              .catch(fail);
          });
        }
      })
      .catch(fail);

    return () => {
      active = false;
      clearDetachGrace();
      modelReadyRef.current = false;
      configuredRef.current = false;
      configureRef.current = null;
      mountRootRef.current = null;
      failRef.current = null;
      prevAttachedRef.current = { wasDetached: false, id: null, eventKey: undefined };
      rootRef.current = null;
      storeRef.current = null;
      rendererRef.current = null;
      lastConfigRef.current = null;
      walkCancelRef.current?.();
      walkCancelRef.current = null;
      isWalkingRef.current = false;
      walkTargetRef.current = null;
      yawRef.current = 0;
      pitchRef.current = 0;
      window.removeEventListener('pointerdown', captureDockedBeforeInteraction, { capture: true });
      window.removeEventListener('keydown', captureDockedBeforeInteraction, { capture: true });
      window.removeEventListener('scroll', captureDockedBeforeInteraction, { capture: true });
      window.removeEventListener('resize', captureDockedBeforeInteraction);
      store?.getState().setFrameloop('never');
      stopObservingRef.current?.();
      stopObservingRef.current = null;
      observedContainerRef.current = null;
      rendererHandle?.removeListeners();
      resetHostDockStyles(hostDiv);
      hostDiv.remove();
      hostDivRef.current = null;
      canvas.remove();
      root?.unmount();
      rendererHandle?.dispose();
    };
  }, [clearDetachGrace, model, onPermanentError]);

  useLayoutEffect(() => {
    activeSlotRef.current = activeSlot;
    slotRef.current = slot;
    const buildContent = (travelOverride: TravelOverride | null = null): ReactNode => (
      <AvatarRuntimeBoundary onError={handleFatalError}>
        <PersistentCompanionContent
          model={model}
          slot={slot}
          overrideAnimation={travelOverride?.clipName}
          overridePlayback={
            travelOverride
              ? {
                  mode: travelOverride.clipName === 'jump' ? 'once' : 'loop',
                  eventKey: travelOverride.eventKey,
                  timeScale: travelOverride.timeScale,
                }
              : undefined
          }
          yawRef={yawRef}
          pitchRef={pitchRef}
          onModelReady={handleModelReady}
          onPlaybackComplete={handlePlaybackComplete}
          onError={handleFatalError}
        />
      </AvatarRuntimeBoundary>
    );
    buildContentRef.current = buildContent;

    const hostDiv = hostDivRef.current;
    if (!hostDiv) {
      contentRef.current = buildContent(null);
      return;
    }

    const attachResizeObserver = (targetSlot: ActiveCompanionSlot) => {
      stopObservingRef.current?.();
      observedContainerRef.current = targetSlot.containerEl;
      stopObservingRef.current = observeCompanionContainer(
        targetSlot.containerEl,
        () => Boolean(configureRef.current) && !isWalkingRef.current,
        () => {
          const liveSlot = activeSlotRef.current;
          if (!liveSlot || !configureRef.current || isWalkingRef.current) return;
          const liveRect = captureElementRect(liveSlot.containerEl);
          if (liveRect) {
            lastDockedRef.current = {
              slotId: liveSlot.id,
              rect: liveRect,
              capturedAtMs: performance.now(),
            };
          }
          void configureRef.current(liveSlot.containerEl, liveSlot.cameraDistance, true)
            .then((resized) => {
              if (!resized) return;
              mountRootRef.current?.();
              paintCompanionAfterConfigure(
                storeRef.current,
                rendererRef.current,
                liveSlot.containerEl.clientWidth,
                liveSlot.containerEl.clientHeight,
                liveSlot.cameraDistance,
              );
            })
            .catch((error) => failRef.current?.(error));
        },
      );
    };

    // Branch 1: transient or final detach (activeSlot === null)
    if (!activeSlot) {
      clearDetachGrace();
      let parkRect: CompanionRect | null = null;
      if (isWalkingRef.current) {
        parkRect = captureElementRect(hostDiv);
        walkCancelRef.current?.();
        walkCancelRef.current = null;
        isWalkingRef.current = false;
        walkTargetRef.current = null;
        yawRef.current = 0;
        pitchRef.current = 0;
        if (parkRect) {
          lastDockedRef.current = {
            slotId: prevAttachedRef.current.id ?? '__midwalk__',
            rect: parkRect,
            capturedAtMs: performance.now(),
          };
        }
      } else {
        parkRect = captureElementRect(hostDiv);
        if (parkRect && prevAttachedRef.current.id) {
          lastDockedRef.current = {
            slotId: prevAttachedRef.current.id,
            rect: parkRect,
            capturedAtMs: performance.now(),
          };
        } else if (
          !prevAttachedRef.current.wasDetached &&
          prevAttachedRef.current.id &&
          lastDockedRef.current?.slotId === prevAttachedRef.current.id
        ) {
          parkRect = lastDockedRef.current.rect;
          lastDockedRef.current = {
            ...lastDockedRef.current,
            capturedAtMs: performance.now(),
          };
        } else if (
          lastDockedRef.current &&
          performance.now() - lastDockedRef.current.capturedAtMs < 1400
        ) {
          parkRect = lastDockedRef.current.rect;
        }
      }
      storeRef.current?.getState().setFrameloop('never');
      stopObservingRef.current?.();
      stopObservingRef.current = null;
      observedContainerRef.current = null;
      prevAttachedRef.current = {
        wasDetached: true,
        id: prevAttachedRef.current.id,
        eventKey: prevAttachedRef.current.eventKey,
      };
      if (modelReadyRef.current && parkRect && typeof document !== 'undefined' && document.body) {
        delete hostDiv.dataset.companionWalking;
        delete hostDiv.dataset.companionTravelStyle;
        applyHostFixedPinStyles(hostDiv, parkRect);
        if (hostDiv.parentElement !== document.body) {
          document.body.appendChild(hostDiv);
        }
        detachGraceTimerRef.current = window.setTimeout(() => {
          detachGraceTimerRef.current = null;
          if (activeSlotRef.current) return;
          resetHostDockStyles(hostDiv);
          hostDiv.remove();
        }, DETACH_GRACE_MS);
      } else {
        resetHostDockStyles(hostDiv);
        hostDiv.remove();
      }
      return;
    }

    clearDetachGrace();
    const prev = prevAttachedRef.current;

    // Branch 2: same walk target updated mid-walk (e.g. phase transitions ready -> listening -> awaiting-answer)
    if (
      isWalkingRef.current &&
      walkTargetRef.current?.id === activeSlot.id &&
      walkTargetRef.current?.containerEl === activeSlot.containerEl
    ) {
      prevAttachedRef.current = {
        wasDetached: false,
        id: activeSlot.id,
        eventKey: activeSlot.playback.eventKey,
      };
      if (modelReadyRef.current) {
        activeSlot.onModelReady();
      }
      return;
    }

    // Branch 3: same docked slot updated in-place (tap, retry, nudge, round change) -> no DOM/style churn
    if (
      !isWalkingRef.current &&
      !prev.wasDetached &&
      prev.id === activeSlot.id &&
      observedContainerRef.current === activeSlot.containerEl &&
      hostDiv.parentElement === activeSlot.containerEl
    ) {
      prevAttachedRef.current = {
        wasDetached: false,
        id: activeSlot.id,
        eventKey: activeSlot.playback.eventKey,
      };
      const sameRect = captureElementRect(activeSlot.containerEl);
      if (sameRect) {
        lastDockedRef.current = {
          slotId: activeSlot.id,
          rect: sameRect,
          capturedAtMs: performance.now(),
        };
      }
      contentRef.current = buildContent(null);
      if (configuredRef.current) {
        rootRef.current?.render(contentRef.current);
      }
      if (rendererRef.current && configureRef.current) {
        void configureRef.current(activeSlot.containerEl, activeSlot.cameraDistance, true)
          .then((resized) => {
            if (!resized || !activeSlotRef.current) return;
            mountRootRef.current?.();
            paintCompanionAfterConfigure(
              storeRef.current,
              rendererRef.current,
              activeSlot.containerEl.clientWidth,
              activeSlot.containerEl.clientHeight,
              activeSlot.cameraDistance,
            );
          })
          .catch((error) => failRef.current?.(error));
      }
      if (modelReadyRef.current) {
        activeSlot.onModelReady();
      }
      return;
    }

    // Branch 4: transitioning to a different slot or re-attaching from detach
    let fromCandidate = lastDockedRef.current;
    if (isWalkingRef.current) {
      const midRect = captureElementRect(hostDiv);
      walkCancelRef.current?.();
      walkCancelRef.current = null;
      isWalkingRef.current = false;
      walkTargetRef.current = null;
      yawRef.current = 0;
      pitchRef.current = 0;
      if (midRect) {
        fromCandidate = {
          slotId: '__midwalk__',
          rect: midRect,
          capturedAtMs: performance.now(),
        };
      }
    } else if (prev.id && prev.id !== activeSlot.id) {
      const leavingRect = observedContainerRef.current
        ? captureElementRect(observedContainerRef.current)
        : null;
      if (leavingRect) {
        fromCandidate = {
          slotId: prev.id,
          rect: leavingRect,
          capturedAtMs: performance.now(),
        };
        lastDockedRef.current = fromCandidate;
      } else if (!prev.wasDetached && lastDockedRef.current?.slotId === prev.id) {
        fromCandidate = {
          slotId: prev.id,
          rect: lastDockedRef.current.rect,
          capturedAtMs: performance.now(),
        };
        lastDockedRef.current = fromCandidate;
      }
    }

    const destRect = captureElementRect(activeSlot.containerEl);
    const reducedMotion =
      typeof window !== 'undefined' &&
      Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
    const recentTransition =
      Boolean(fromCandidate) &&
      fromCandidate!.slotId !== activeSlot.id &&
      performance.now() - fromCandidate!.capturedAtMs < 1400;
    const walkPlan =
      modelReadyRef.current &&
      configuredRef.current &&
      recentTransition &&
      destRect &&
      typeof document !== 'undefined' &&
      document.body
        ? planCompanionWalk(fromCandidate!.rect, destRect, reducedMotion)
        : null;

    const sameEventAfterDetach =
      prev.wasDetached &&
      prev.id === activeSlot.id &&
      prev.eventKey === activeSlot.playback.eventKey;
    prevAttachedRef.current = {
      wasDetached: false,
      id: activeSlot.id,
      eventKey: activeSlot.playback.eventKey,
    };

    if (walkPlan) {
      isWalkingRef.current = true;
      walkTargetRef.current = { id: activeSlot.id, containerEl: activeSlot.containerEl };
      walkSeqRef.current += 1;
      const walkKey = `walk:${walkSeqRef.current}`;
      const walkTargetId = activeSlot.id;
      const walkTargetContainer = activeSlot.containerEl;

      applyHostWalkStartStyles(hostDiv, walkPlan.from, walkPlan.style);
      if (hostDiv.parentElement !== document.body) {
        document.body.appendChild(hostDiv);
      }

      stopObservingRef.current?.();
      stopObservingRef.current = null;
      observedContainerRef.current = walkTargetContainer;

      contentRef.current = buildContent({
        clipName: walkPlan.clipName,
        eventKey: walkKey,
        timeScale: walkPlan.clipTimeScale,
      });
      if (configuredRef.current) {
        rootRef.current?.render(contentRef.current);
      }
      resumeCompanionFrameloop(storeRef.current);
      if (configureRef.current) {
        void configureRef.current(hostDiv, activeSlot.cameraDistance, false)
          .then((resized) => {
            if (!resized) return;
            mountRootRef.current?.();
            paintCompanionAfterConfigure(
              storeRef.current,
              rendererRef.current,
              hostDiv.clientWidth,
              hostDiv.clientHeight,
              activeSlot.cameraDistance,
            );
          })
          .catch((error) => failRef.current?.(error));
      }

      let rafId = 0;
      let cancelled = false;
      const startMs = performance.now();

      const finishDock = () => {
        if (cancelled) return;
        isWalkingRef.current = false;
        walkCancelRef.current = null;
        walkTargetRef.current = null;
        yawRef.current = 0;
        pitchRef.current = 0;
        const liveSlot = activeSlotRef.current;
        if (!liveSlot || liveSlot.id !== walkTargetId || liveSlot.containerEl !== walkTargetContainer) {
          return;
        }
        resetHostDockStyles(hostDiv);
        if (hostDiv.parentElement !== liveSlot.containerEl) {
          liveSlot.containerEl.appendChild(hostDiv);
        }
        const landedRect = captureElementRect(liveSlot.containerEl);
        if (landedRect) {
          lastDockedRef.current = {
            slotId: liveSlot.id,
            rect: landedRect,
            capturedAtMs: performance.now(),
          };
        }
        contentRef.current = buildContentRef.current?.(null) ?? contentRef.current;
        if (configuredRef.current) {
          rootRef.current?.render(contentRef.current);
        }
        resumeCompanionFrameloop(storeRef.current);
        if (configureRef.current) {
          void configureRef.current(liveSlot.containerEl, liveSlot.cameraDistance, false)
            .then((resized) => {
              if (!resized || activeSlotRef.current?.id !== liveSlot.id) return;
              mountRootRef.current?.();
              paintCompanionAfterConfigure(
                storeRef.current,
                rendererRef.current,
                liveSlot.containerEl.clientWidth,
                liveSlot.containerEl.clientHeight,
                liveSlot.cameraDistance,
              );
            })
            .catch((error) => failRef.current?.(error));
        }
        attachResizeObserver(liveSlot);
      };

      const step = () => {
        if (cancelled) return;
        const liveToRect = captureElementRect(walkTargetContainer);
        const sample = sampleCompanionWalk(walkPlan, performance.now() - startMs, liveToRect);
        yawRef.current = sample.yawRad;
        pitchRef.current = sample.pitchRad;
        hostDiv.style.transform = `translate3d(${sample.translateX.toFixed(1)}px, ${sample.translateY.toFixed(1)}px, 0) scale(${sample.scaleX.toFixed(4)}, ${sample.scaleY.toFixed(4)})`;
        if (sample.complete) {
          finishDock();
        } else {
          rafId = window.requestAnimationFrame(step);
        }
      };

      walkCancelRef.current = () => {
        if (cancelled) return;
        cancelled = true;
        if (rafId) window.cancelAnimationFrame(rafId);
        yawRef.current = 0;
        pitchRef.current = 0;
        isWalkingRef.current = false;
        walkTargetRef.current = null;
        resetHostDockStyles(hostDiv);
      };
      rafId = window.requestAnimationFrame(step);

      if (modelReadyRef.current) {
        activeSlot.onModelReady();
      }
      return;
    }

    resetHostDockStyles(hostDiv);
    if (hostDiv.parentElement !== activeSlot.containerEl) {
      activeSlot.containerEl.appendChild(hostDiv);
    }
    if (destRect) {
      lastDockedRef.current = {
        slotId: activeSlot.id,
        rect: destRect,
        capturedAtMs: performance.now(),
      };
    }

    contentRef.current = buildContent(null);
    if (configuredRef.current) {
      rootRef.current?.render(contentRef.current);
    }
    if (sameEventAfterDetach) {
      resumeCompanionFrameloop(storeRef.current);
    }

    const renderer = rendererRef.current;
    const configure = configureRef.current;
    const mountRoot = mountRootRef.current;
    if (renderer && configure) {
      const containerChanged = observedContainerRef.current !== activeSlot.containerEl;
      if (containerChanged) {
        attachResizeObserver(activeSlot);
      }

      void configure(
        activeSlot.containerEl,
        activeSlot.cameraDistance,
        !(sameEventAfterDetach || containerChanged),
      )
        .then((resized) => {
          if (!resized || !activeSlotRef.current) return;
          mountRoot?.();
          paintCompanionAfterConfigure(
            storeRef.current,
            rendererRef.current,
            activeSlot.containerEl.clientWidth,
            activeSlot.containerEl.clientHeight,
            activeSlot.cameraDistance,
          );
        })
        .catch((error) => failRef.current?.(error));
    }

    if (modelReadyRef.current) {
      activeSlot.onModelReady();
    }
  }, [activeSlot, clearDetachGrace, handleFatalError, handleModelReady, handlePlaybackComplete, model, slot]);

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
          gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true, toneMapping: NoToneMapping }}
          style={{ width: '100%', height: '100%', background: 'transparent' }}
        >
          {content}
        </Canvas>
      )}
    </div>
  );
}
