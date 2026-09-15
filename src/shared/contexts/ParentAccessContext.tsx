import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { isProtectedParentPath } from '../services/parentAccessLogic';

export interface ParentAccessValue {
  unlocked: boolean;
  unlock(): void;
  lock(): void;
}

const ParentAccessContext = createContext<ParentAccessValue | null>(null);

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

export function useParentAccess(): ParentAccessValue {
  const context = useContext(ParentAccessContext);
  if (!context) {
    throw new Error('useParentAccess must be used within a ParentAccessProvider');
  }
  return context;
}
