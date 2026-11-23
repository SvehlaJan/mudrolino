import { useCallback, useLayoutEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { GameState } from '../shared/game/gameState';
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
  IDLE_NUDGE_DELAY_MS,
  SECOND_IDLE_NUDGE_DELAY_MS,
  selectIdleNudgeClip,
  shouldArmIdleNudge,
} from './companionCelebration';
import type { CompanionConfig } from './companionConfig';
import { companionResources, type CompanionResource } from './companionResources';
import bearStill from './companions/bear-still.png';
import {
  createPromptCompanionState,
  promptCompanionReducer,
  type CompanionNudgeEvent,
} from './promptCompanionState';

// eslint-disable-next-line react-refresh/only-export-components
export { IDLE_NUDGE_DELAY_MS, SECOND_IDLE_NUDGE_DELAY_MS, selectIdleNudgeClip, shouldArmIdleNudge };
export type { CompanionNudgeEvent };

export interface PromptCompanionProps {
  locale?: string;
  gameId?: string;
  config: CompanionConfig | null;
  resource: CompanionResource;
  reducedMotion: boolean;
  stillUrl?: string;
  state: Pick<GameState, 'phase' | 'paused' | 'roundsPlayed' | 'wrongAttempts' | 'feedback'>;
  promptReplaying?: boolean;
  idleNudge?: CompanionNudgeEvent | null;
  disabled?: boolean;
  onReplay?: () => void;
  className?: string;
}

export function PromptCompanion({
  locale = 'sk',
  gameId,
  config,
  resource,
  reducedMotion,
  stillUrl = bearStill,
  state,
  promptReplaying = false,
  idleNudge = null,
  disabled = false,
  onReplay,
  className,
}: PromptCompanionProps) {
  const companionMode = useCompanionMode();
  if (!config || companionMode === 'off') return null;

  return (
    <ActivePromptCompanion
      key={config.modelUrl}
      locale={locale}
      gameId={gameId}
      config={config}
      resource={resource}
      reducedMotion={reducedMotion || companionMode === 'static'}
      stillUrl={stillUrl}
      state={state}
      promptReplaying={promptReplaying}
      idleNudge={idleNudge}
      disabled={disabled}
      onReplay={onReplay}
      className={className}
    />
  );
}

function ActivePromptCompanion({
  locale,
  gameId,
  config,
  resource,
  reducedMotion,
  stillUrl,
  state,
  promptReplaying,
  idleNudge,
  disabled,
  onReplay,
  className,
}: {
  locale: string;
  gameId?: string;
  config: CompanionConfig;
  resource: CompanionResource;
  reducedMotion: boolean;
  stillUrl: string;
  state: Pick<GameState, 'phase' | 'paused' | 'roundsPlayed' | 'wrongAttempts' | 'feedback'>;
  promptReplaying: boolean;
  idleNudge: CompanionNudgeEvent | null;
  disabled: boolean;
  onReplay?: () => void;
  className?: string;
}) {
  const [guideState, dispatch] = useReducer(
    promptCompanionReducer,
    {
      phase: state.phase,
      paused: state.paused,
      gameId,
      roundsPlayed: state.roundsPlayed,
      wrongAttempts: state.wrongAttempts,
      feedback: state.feedback,
      promptReplaying,
      idleNudge,
    },
    createPromptCompanionState,
  );
  const [modelReady, setModelReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const failureReported = useRef(false);
  const slotRef = useRef<HTMLSpanElement>(null);
  const modelUrl = config.modelUrl;

  useLayoutEffect(() => {
    dispatch({
      type: 'observe',
      observation: {
        phase: state.phase,
        paused: state.paused,
        gameId,
        roundsPlayed: state.roundsPlayed,
        wrongAttempts: state.wrongAttempts,
        feedback: state.feedback,
        promptReplaying,
        idleNudge,
      },
      nowMs: performance.now(),
    });
  }, [
    gameId,
    idleNudge,
    promptReplaying,
    state.feedback,
    state.paused,
    state.phase,
    state.roundsPlayed,
    state.wrongAttempts,
  ]);

  const onModelReady = useCallback(() => {
    setModelReady(true);
  }, []);

  const onError = useCallback(() => {
    if (failureReported.current) return;
    failureReported.current = true;
    setFailed(true);
    companionResources.fail(modelUrl);
  }, [modelUrl]);

  const canTap = !disabled && Boolean(onReplay);
  const handleTap = useCallback(() => {
    if (!canTap) return;
    dispatch({ type: 'tap', nowMs: performance.now(), willReplay: true });
    onReplay?.();
  }, [canTap, onReplay]);

  const stageFailed = useCompanionStageFailed();
  const canRender =
    !state.paused &&
    !reducedMotion &&
    !failed &&
    !stageFailed &&
    resource.status === 'ready' &&
    resource.modelUrl === modelUrl;

  const playback = useMemo(
    () => ({
      mode: 'once' as const,
      eventKey: guideState.eventKey,
      startedAtMs: guideState.startedAtMs,
      idleAfterOnce: state.paused ? undefined : 'idle_breathe',
    }),
    [guideState.eventKey, guideState.startedAtMs, state.paused],
  );

  const stage = useCompanionStageSlot({
    priority: COMPANION_STAGE_PRIORITY.prompt,
    containerRef: slotRef,
    canRender,
    modelUrl,
    animationName: guideState.activeClip,
    cameraDistance: 5.6,
    playback,
    onModelReady,
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
      data-testid="prompt-companion"
      aria-label={getUiCopy(locale, 'game.companionReplay')}
      disabled={!canTap}
      onClick={handleTap}
      data-companion-animation={guideState.activeClip}
      data-companion-reason={guideState.reason}
      data-companion-representation={rendered ? 'rendered3D' : 'still'}
      data-companion-resource-status={resource.status}
      data-companion-nudge-active={idleNudge ? 'true' : undefined}
      className={cn(
        'group relative min-h-12 min-w-12 h-24 w-[84px] max-sm:h-[76px] max-sm:w-[66px] [@media(max-width:380px)]:h-16 [@media(max-width:380px)]:w-14 [@media(max-height:480px)]:!h-14 [@media(max-height:480px)]:!w-12 shrink-0 cursor-pointer rounded-2xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40 active:scale-95 transition-transform disabled:cursor-default disabled:active:scale-100',
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
            animationName={guideState.activeClip}
            preserveHipsPosition
            cameraDistance={5.6}
            interactive={false}
            playback={playback}
            assetStatusOverride="available"
            onModelReady={onModelReady}
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
