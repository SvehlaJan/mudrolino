import {
  createContext,
  useContext,
  useId,
  useLayoutEffect,
  type RefObject,
} from 'react';
import type { CompanionMode } from '../shared/services/appSettingsStore';
import type { AvatarPlaybackOptions } from './avatarTypes';

export const COMPANION_STAGE_PRIORITY = {
  home: 10,
  prompt: 20,
  overlay: 30,
} as const;

export interface CompanionStageSlotRequest {
  id: string;
  priority: number;
  containerEl: HTMLElement | null;
  canRender: boolean;
  modelUrl: string;
  animationName: string;
  cameraDistance: number;
  playback: AvatarPlaybackOptions;
  onModelReady: () => void;
  onPlaybackComplete?: () => void;
  onError: (error: unknown) => void;
}

export interface ActiveCompanionSlot {
  id: string;
  priority: number;
  containerEl: HTMLElement;
  modelUrl: string;
  animationName: string;
  cameraDistance: number;
  playback: AvatarPlaybackOptions;
  onModelReady: () => void;
  onPlaybackComplete?: () => void;
  onError: (error: unknown) => void;
}

export interface RegisteredCompanionSlot extends CompanionStageSlotRequest {
  order: number;
}

export interface CompanionStageContextValue {
  activeSlotId: string | null;
  stageFailed: boolean;
  companionMode: CompanionMode;
  upsertSlot: (slot: CompanionStageSlotRequest) => void;
  removeSlot: (id: string) => void;
}

export const CompanionStageContext = createContext<CompanionStageContextValue | null>(null);

export function reportCompanionStageError(
  activeSlot: Pick<ActiveCompanionSlot, 'onError'> | null,
  lastModelUrl: string | null,
  error: unknown,
  failResource: (url: string) => void,
): void {
  if (activeSlot) {
    activeSlot.onError(error);
  } else if (lastModelUrl) {
    failResource(lastModelUrl);
  }
}

export function selectActiveCompanionSlot(
  slots: Iterable<RegisteredCompanionSlot>,
): ActiveCompanionSlot | null {
  let best: RegisteredCompanionSlot | null = null;
  for (const slot of slots) {
    if (!slot.canRender || !slot.containerEl) continue;
    if (
      !best ||
      slot.priority > best.priority ||
      (slot.priority === best.priority && slot.order >= best.order)
    ) {
      best = slot;
    }
  }
  if (!best || !best.containerEl) return null;
  return {
    id: best.id,
    priority: best.priority,
    containerEl: best.containerEl,
    modelUrl: best.modelUrl,
    animationName: best.animationName,
    cameraDistance: best.cameraDistance,
    playback: best.playback,
    onModelReady: best.onModelReady,
    onPlaybackComplete: best.onPlaybackComplete,
    onError: best.onError,
  };
}

export function sameActiveCompanionSlot(
  a: ActiveCompanionSlot | null,
  b: ActiveCompanionSlot | null,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.id === b.id &&
    a.priority === b.priority &&
    a.containerEl === b.containerEl &&
    a.modelUrl === b.modelUrl &&
    a.animationName === b.animationName &&
    a.cameraDistance === b.cameraDistance &&
    a.playback.mode === b.playback.mode &&
    a.playback.eventKey === b.playback.eventKey &&
    a.playback.startedAtMs === b.playback.startedAtMs &&
    a.playback.idleAfterOnce === b.playback.idleAfterOnce &&
    a.onModelReady === b.onModelReady &&
    a.onPlaybackComplete === b.onPlaybackComplete &&
    a.onError === b.onError
  );
}

export interface UseCompanionStageSlotOptions {
  priority: number;
  containerRef: RefObject<HTMLElement | null>;
  canRender: boolean;
  modelUrl: string;
  animationName: string;
  cameraDistance: number;
  playback: AvatarPlaybackOptions;
  onModelReady: () => void;
  onPlaybackComplete?: () => void;
  onError: (error: unknown) => void;
}

export interface CompanionStageSlotState {
  hasProvider: boolean;
  isOwner: boolean;
  activeSlotId: string | null;
  stageFailed: boolean;
  slotId: string;
}

export function useHasCompanionStage(): boolean {
  return useContext(CompanionStageContext) !== null;
}

export function useCompanionMode(): CompanionMode {
  return useContext(CompanionStageContext)?.companionMode ?? 'animated';
}

export function useCompanionStageFailed(): boolean {
  return useContext(CompanionStageContext)?.stageFailed ?? false;
}

export function useCompanionStageSlot(
  options: UseCompanionStageSlotOptions | null,
): CompanionStageSlotState {
  const ctx = useContext(CompanionStageContext);
  const slotId = useId();
  const upsertSlot = ctx?.upsertSlot;
  const removeSlot = ctx?.removeSlot;

  const canRender = Boolean(options?.canRender);
  const priority = options?.priority ?? 0;
  const containerRef = options?.containerRef;
  const modelUrl = options?.modelUrl;
  const animationName = options?.animationName;
  const cameraDistance = options?.cameraDistance;
  const playbackMode = options?.playback.mode;
  const playbackEventKey = options?.playback.eventKey;
  const playbackStartedAtMs = options?.playback.startedAtMs;
  const playbackIdleAfterOnce = options?.playback.idleAfterOnce;
  const onModelReady = options?.onModelReady;
  const onPlaybackComplete = options?.onPlaybackComplete;
  const onError = options?.onError;

  useLayoutEffect(() => {
    if (!removeSlot) return;
    return () => {
      removeSlot(slotId);
    };
  }, [removeSlot, slotId]);

  useLayoutEffect(() => {
    if (!upsertSlot || !removeSlot) return;
    const containerEl = containerRef?.current ?? null;
    if (
      !canRender ||
      !containerEl ||
      !modelUrl ||
      !animationName ||
      cameraDistance === undefined ||
      !playbackMode ||
      !onModelReady ||
      !onError
    ) {
      removeSlot(slotId);
      return;
    }

    upsertSlot({
      id: slotId,
      priority,
      containerEl,
      canRender,
      modelUrl,
      animationName,
      cameraDistance,
      playback: {
        mode: playbackMode,
        eventKey: playbackEventKey,
        startedAtMs: playbackStartedAtMs,
        idleAfterOnce: playbackIdleAfterOnce,
      },
      onModelReady,
      onPlaybackComplete,
      onError,
    });
  }, [
    animationName,
    cameraDistance,
    canRender,
    containerRef,
    modelUrl,
    onError,
    onModelReady,
    onPlaybackComplete,
    playbackEventKey,
    playbackIdleAfterOnce,
    playbackMode,
    playbackStartedAtMs,
    priority,
    removeSlot,
    slotId,
    upsertSlot,
  ]);

  return {
    hasProvider: ctx !== null,
    isOwner: ctx !== null && ctx.activeSlotId === slotId,
    activeSlotId: ctx?.activeSlotId ?? null,
    stageFailed: ctx?.stageFailed ?? false,
    slotId,
  };
}
