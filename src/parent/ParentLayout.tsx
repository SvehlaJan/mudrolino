/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useParentAccess } from '../shared/contexts/useParentAccess';
import { sanitizeChildReturnPath } from '../shared/services/parentAccessLogic';
import { ParentZoneContext, type ParentZoneValue } from './ParentZoneContext';

/**
 * Groups every protected parent route so they share one close-to-child
 * contract without rendering any visual chrome of their own — each screen
 * still owns its full AppScreen/TopBar/heading, matching CustomContentScreen.
 */
export function ParentLayout() {
  const { lock } = useParentAccess();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { returnTo?: unknown } | null;
  const returnTo = sanitizeChildReturnPath(state?.returnTo);

  const closeToChild = useCallback((options?: { state?: Record<string, unknown>; replace?: boolean }) => {
    lock();
    navigate(returnTo, { replace: options?.replace ?? false, state: options?.state });
  }, [lock, navigate, returnTo]);

  const value = useMemo<ParentZoneValue>(() => ({ returnTo, closeToChild }), [returnTo, closeToChild]);

  return (
    <ParentZoneContext.Provider value={value}>
      <Outlet />
    </ParentZoneContext.Provider>
  );
}
