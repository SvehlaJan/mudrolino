/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useMemo } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useParentAccess } from '../shared/contexts/useParentAccess';
import { ParentZoneContext, type ParentZoneValue } from './ParentZoneContext';

/**
 * Groups every protected parent route so they share one close-to-child
 * contract without rendering any visual chrome of their own — each screen
 * still owns its full AppScreen/TopBar/heading, matching CustomContentScreen.
 */
export function ParentLayout() {
  const { lock } = useParentAccess();
  const navigate = useNavigate();

  const closeToChild = useCallback((options?: { replace?: boolean }) => {
    lock();
    navigate('/', { replace: options?.replace ?? false });
  }, [lock, navigate]);

  const value = useMemo<ParentZoneValue>(() => ({ closeToChild }), [closeToChild]);

  return (
    <ParentZoneContext.Provider value={value}>
      <Outlet />
    </ParentZoneContext.Provider>
  );
}
