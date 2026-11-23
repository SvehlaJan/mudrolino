import {
  Suspense,
  lazy,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { CompanionMode } from '../shared/services/appSettingsStore';
import { AvatarRuntimeBoundary } from './AvatarRuntimeBoundary';
import { getLoadedAvatarSceneModule, loadAvatarSceneModule } from './avatarSceneLoader';
import { companionResources } from './companionResources';
import {
  CompanionStageContext,
  reportCompanionStageError,
  sameActiveCompanionSlot,
  selectActiveCompanionSlot,
  type ActiveCompanionSlot,
  type CompanionStageContextValue,
  type CompanionStageSlotRequest,
  type RegisteredCompanionSlot,
} from './companionStage';

const LazyPersistentCompanionStage = lazy(() =>
  loadAvatarSceneModule().then((module) => ({ default: module.PersistentCompanionStage })),
);

export function CompanionStageProvider({
  children,
  companionMode = 'animated',
}: {
  children: ReactNode;
  companionMode?: CompanionMode;
}) {
  const slotsRef = useRef<Map<string, RegisteredCompanionSlot>>(new Map());
  const orderRef = useRef(0);
  const lastModelUrlRef = useRef<string | null>(null);
  const [activeSlot, setActiveSlot] = useState<ActiveCompanionSlot | null>(null);
  const [stageActivated, setStageActivated] = useState(false);
  const [permanentError, setPermanentError] = useState(false);

  const syncActiveSlot = useCallback(() => {
    const next = selectActiveCompanionSlot(slotsRef.current.values());
    if (next?.modelUrl) {
      lastModelUrlRef.current = next.modelUrl;
    }
    setActiveSlot((prev) => (sameActiveCompanionSlot(prev, next) ? prev : next));
    if (next !== null) {
      setStageActivated(true);
    }
  }, []);

  const upsertSlot = useCallback(
    (slot: CompanionStageSlotRequest) => {
      if (slot.modelUrl) {
        lastModelUrlRef.current = slot.modelUrl;
      }
      const existing = slotsRef.current.get(slot.id);
      const order = existing && existing.priority === slot.priority ? existing.order : ++orderRef.current;
      slotsRef.current.set(slot.id, { ...slot, order });
      syncActiveSlot();
    },
    [syncActiveSlot],
  );

  const removeSlot = useCallback(
    (id: string) => {
      if (!slotsRef.current.delete(id)) return;
      syncActiveSlot();
    },
    [syncActiveSlot],
  );

  const activeSlotRef = useRef<ActiveCompanionSlot | null>(null);
  useLayoutEffect(() => {
    activeSlotRef.current = activeSlot;
  }, [activeSlot]);

  const handleStageError = useCallback((error: unknown) => {
    setPermanentError(true);
    setStageActivated(false);
    reportCompanionStageError(
      activeSlotRef.current,
      lastModelUrlRef.current,
      error,
      companionResources.fail,
    );
  }, []);

  const effectiveActiveSlot = companionMode === 'animated' && !permanentError ? activeSlot : null;

  const value = useMemo<CompanionStageContextValue>(
    () => ({
      activeSlotId: effectiveActiveSlot?.id ?? null,
      stageFailed: permanentError,
      companionMode,
      upsertSlot,
      removeSlot,
    }),
    [companionMode, effectiveActiveSlot?.id, permanentError, removeSlot, upsertSlot],
  );

  const StageComponent =
    getLoadedAvatarSceneModule()?.PersistentCompanionStage ?? LazyPersistentCompanionStage;

  return (
    <CompanionStageContext.Provider value={value}>
      {children}
      {stageActivated && !permanentError && companionMode === 'animated' && (
        <AvatarRuntimeBoundary onError={handleStageError}>
          <Suspense fallback={null}>
            <StageComponent activeSlot={effectiveActiveSlot} onPermanentError={handleStageError} />
          </Suspense>
        </AvatarRuntimeBoundary>
      )}
    </CompanionStageContext.Provider>
  );
}
