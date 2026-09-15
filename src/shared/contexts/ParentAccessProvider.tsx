import React, { useState, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { isProtectedParentPath } from '../services/parentAccessLogic';
import { ParentAccessContext } from './ParentAccessContext';

export function ParentAccessProvider({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const location = useLocation();
  const [prevPathname, setPrevPathname] = useState(location.pathname);

  if (location.pathname !== prevPathname) {
    setPrevPathname(location.pathname);
    if (isProtectedParentPath(prevPathname) && !isProtectedParentPath(location.pathname)) {
      setUnlocked(false);
    }
  }

  const unlock = useCallback(() => setUnlocked(true), []);
  const lock = useCallback(() => setUnlocked(false), []);
  const value = useMemo(() => ({ unlocked, unlock, lock }), [unlocked, unlock, lock]);

  return <ParentAccessContext.Provider value={value}>{children}</ParentAccessContext.Provider>;
}
