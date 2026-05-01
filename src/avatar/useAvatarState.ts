import { useCallback, useEffect, useState } from 'react';
import { loadAvatarState, saveAvatarState } from './avatarStore';
import { StoredAvatarState } from './avatarTypes';

export function useAvatarState() {
  const [avatarState, setAvatarState] = useState<StoredAvatarState>(() => loadAvatarState());

  useEffect(() => {
    saveAvatarState(avatarState);
  }, [avatarState]);

  const updateAvatarState = useCallback((updater: (state: StoredAvatarState) => StoredAvatarState) => {
    setAvatarState((current) => updater(current));
  }, []);

  return { avatarState, updateAvatarState };
}
