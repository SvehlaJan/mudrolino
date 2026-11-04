/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createContext, useContext } from 'react';

export interface ParentZoneValue {
  /** Locks parent access and navigates to the Home screen. */
  closeToChild(options?: { replace?: boolean }): void;
}

export const ParentZoneContext = createContext<ParentZoneValue | null>(null);

export function useParentZone(): ParentZoneValue {
  const context = useContext(ParentZoneContext);
  if (!context) throw new Error('useParentZone must be used within ParentLayout');
  return context;
}
