import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { prewarmCompanionModel } from './avatarSceneLoader';
import { companionResources, type CompanionResource } from './companionResources';

export function useCompanionResources(modelUrl: string | null): CompanionResource {
  const getSnapshot = useCallback(() => companionResources.getSnapshot(modelUrl), [modelUrl]);
  const resource = useSyncExternalStore(companionResources.subscribe, getSnapshot, getSnapshot);
  useEffect(() => {
    void companionResources.prepare(modelUrl).then(snapshot => {
      if (snapshot.status === 'ready' && snapshot.modelUrl) {
        prewarmCompanionModel(snapshot.modelUrl);
      }
    });
  }, [modelUrl]);
  return resource;
}
