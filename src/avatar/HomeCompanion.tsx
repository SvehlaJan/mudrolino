import { useCallback, useMemo, useReducer, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { getUiCopy } from '../shared/uiCopy';
import { cn } from '../shared/ui/utils';
import { AvatarPresenter } from './AvatarPresenter';
import {
  COMPANION_STAGE_PRIORITY,
  useCompanionMode,
  useCompanionStageFailed,
  useCompanionStageSlot,
} from './companionStage';
import {
  createHomeCompanionState,
  homeCompanionReducer,
  type HomeCompanionAction,
  type HomeCompanionState,
} from './companionCelebration';
import { getCompanionConfig, type CompanionConfig } from './companionConfig';
import { companionResources, type CompanionResource } from './companionResources';
import { useCompanionResources } from './useCompanionResources';
import bearStill from './companions/bear-still.png';

// eslint-disable-next-line react-refresh/only-export-components
export { createHomeCompanionState, homeCompanionReducer };
export type { HomeCompanionAction, HomeCompanionState };

export interface HomeCompanionProps {
  locale?: string;
  config?: CompanionConfig | null;
  resource?: CompanionResource;
  reducedMotion?: boolean;
  stillUrl?: string;
  className?: string;
}

export function HomeCompanion({
  locale = 'sk',
  config: configProp,
  resource: resourceProp,
  reducedMotion: reducedMotionProp,
  stillUrl = bearStill,
  className,
}: HomeCompanionProps) {
  const [defaultConfig] = useState(getCompanionConfig);
  const config = configProp === undefined ? defaultConfig : configProp;
  const companionMode = useCompanionMode();
  const prefersReducedMotion = useReducedMotion();
  const reducedMotion = Boolean(reducedMotionProp ?? prefersReducedMotion) || companionMode === 'static';
  const fetchedResource = useCompanionResources(
    companionMode !== 'animated' || reducedMotion || resourceProp !== undefined ? null : config?.modelUrl ?? null,
  );
  const resource = resourceProp ?? fetchedResource;

  if (!config || companionMode === 'off') return null;

  return (
    <ActiveHomeCompanion
      key={config.modelUrl}
      locale={locale}
      config={config}
      resource={resource}
      reducedMotion={reducedMotion}
      stillUrl={stillUrl}
      className={className}
    />
  );
}

function ActiveHomeCompanion({
  locale,
  config,
  resource,
  reducedMotion,
  stillUrl,
  className,
}: {
  locale: string;
  config: CompanionConfig;
  resource: CompanionResource;
  reducedMotion: boolean;
  stillUrl: string;
  className?: string;
}) {
  const [state, dispatch] = useReducer(homeCompanionReducer, undefined, createHomeCompanionState);
  const [modelReady, setModelReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const failureReported = useRef(false);
  const slotRef = useRef<HTMLSpanElement>(null);
  const modelUrl = config.modelUrl;

  const onModelReady = useCallback(() => {
    setModelReady(true);
  }, []);

  const onError = useCallback(() => {
    if (failureReported.current) return;
    failureReported.current = true;
    setFailed(true);
    companionResources.fail(modelUrl);
  }, [modelUrl]);

  const onPlaybackComplete = useCallback(() => {
    dispatch({ type: 'playbackComplete', nowMs: performance.now() });
  }, []);

  const onTap = useCallback(() => {
    dispatch({ type: 'tap', nowMs: performance.now() });
  }, []);

  const stageFailed = useCompanionStageFailed();
  const canRender =
    !reducedMotion && !failed && !stageFailed && resource.status === 'ready' && resource.modelUrl === modelUrl;
  const playback = useMemo(
    () => ({
      mode: 'once' as const,
      eventKey: state.eventKey,
      startedAtMs: state.startedAtMs,
      idleAfterOnce: 'idle_breathe',
    }),
    [state.eventKey, state.startedAtMs],
  );

  const stage = useCompanionStageSlot({
    priority: COMPANION_STAGE_PRIORITY.home,
    containerRef: slotRef,
    canRender,
    modelUrl,
    animationName: state.activeClip,
    cameraDistance: 5.6,
    playback,
    onModelReady,
    onPlaybackComplete,
    onError,
  });

  const isSlotEligible = canRender && (!stage.hasProvider || stage.isOwner);
  if (!isSlotEligible && modelReady) {
    setModelReady(false);
  }

  const showStill = !canRender || stageFailed;
  const rendered = isSlotEligible && modelReady;

  return (
    <button
      type="button"
      data-testid="home-companion"
      aria-label={getUiCopy(locale, 'home.companionGreet')}
      onClick={onTap}
      data-companion-animation={state.activeClip}
      data-companion-representation={rendered ? 'rendered3D' : 'still'}
      data-companion-resource-status={resource.status}
      className={cn(
        'group relative min-h-12 min-w-12 h-20 w-[72px] sm:h-28 sm:w-24 lg:h-32 lg:w-28 shrink-0 cursor-pointer rounded-2xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40 active:scale-95 transition-transform',
        className,
      )}
    >
      <span aria-hidden="true" className="pointer-events-none relative block h-full w-full">
        {showStill && (
          <img src={stillUrl} alt="" className="absolute inset-0 h-full w-full object-contain" />
        )}
        {!stage.hasProvider && canRender && (
          <AvatarPresenter
            className="absolute inset-0 h-full w-full"
            modelUrl={modelUrl}
            animationName={state.activeClip}
            preserveHipsPosition
            cameraDistance={5.6}
            interactive={false}
            playback={playback}
            assetStatusOverride="available"
            onModelReady={onModelReady}
            onPlaybackComplete={onPlaybackComplete}
            onError={onError}
          />
        )}
        {stage.hasProvider && (
          <span ref={slotRef} className="absolute inset-0 block h-full w-full" />
        )}
      </span>
    </button>
  );
}
