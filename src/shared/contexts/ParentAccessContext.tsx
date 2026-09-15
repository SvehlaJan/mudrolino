import React, { createContext, useContext, useState, useRef, useEffect, useMemo } from 'react';
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
  const wasProtected = useRef(isProtectedParentPath(location.pathname));

  useEffect(() => {
    const protectedNow = isProtectedParentPath(location.pathname);
    if (wasProtected.current && !protectedNow) setUnlocked(false); // eslint-disable-line react-hooks/set-state-in-effect
    wasProtected.current = protectedNow;
  }, [location.pathname]);

  const value = useMemo(() => ({
    unlocked,
    unlock: () => setUnlocked(true),
    lock: () => setUnlocked(false),
  }), [unlocked]);

  return <ParentAccessContext.Provider value={value}>{children}</ParentAccessContext.Provider>;
}

export function useParentAccess(): ParentAccessValue {
  const context = useContext(ParentAccessContext);
  if (!context) {
    throw new Error('useParentAccess must be used within a ParentAccessProvider');
  }
  return context;
}
