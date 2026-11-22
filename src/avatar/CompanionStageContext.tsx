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
import { AvatarRuntimeBoundary } from './AvatarRuntimeBoundary';
import { getLoadedAvatarSceneModule, loadAvatarSceneModule } from './avatarSceneLoader';
import {
  CompanionStageContext,
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

export function CompanionStageProvider({ children }: { children: ReactNode }) {
  const slotsRef = useRef<Map<string, RegisteredCompanionSlot>>(new Map());
  const orderRef = useRef(0);
  const [activeSlot, setActiveSlot] = useState<ActiveCompanionSlot | null>(null);
  const [stageActivated, setStageActivated] = useState(false);
  const [permanentError, setPermanentError] = useState(false);

  const syncActiveSlot = useCallback(() => {
    const next = selectActiveCompanionSlot(slotsRef.current.values());
    setActiveSlot((prev) => (sameActiveCompanionSlot(prev, next) ? prev : next));
    if (next !== null) {
      setStageActivated(true);
    }
  }, []);

  const upsertSlot = useCallback(
    (slot: CompanionStageSlotRequest) => {
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
    activeSlotRef.current?.onError(error);
  }, []);

  const value = useMemo<CompanionStageContextValue>(
    () => ({
      activeSlotId: permanentError ? null : (activeSlot?.id ?? null),
      upsertSlot,
      removeSlot,
    }),
    [activeSlot?.id, permanentError, removeSlot, upsertSlot],
  );

  const StageComponent =
    getLoadedAvatarSceneModule()?.PersistentCompanionStage ?? LazyPersistentCompanionStage;

  return (
    <CompanionStageContext.Provider value={value}>
      {children}
      {stageActivated && !permanentError && (
        <AvatarRuntimeBoundary onError={handleStageError}>
          <Suspense fallback={null}>
            <StageComponent activeSlot={activeSlot} onPermanentError={handleStageError} />
          </Suspense>
        </AvatarRuntimeBoundary>
      )}
    </CompanionStageContext.Provider>
  );
}
