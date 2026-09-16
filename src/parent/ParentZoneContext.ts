/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createContext, useContext } from 'react';

export interface ParentZoneValue {
  /** Validated catalogued child destination for this exact protected entry — a lobby path, or '/'. */
  returnTo: string;
  /** Locks parent access and navigates to the validated child destination. */
  closeToChild(options?: { state?: Record<string, unknown>; replace?: boolean }): void;
}

export const ParentZoneContext = createContext<ParentZoneValue | null>(null);

export function useParentZone(): ParentZoneValue {
  const context = useContext(ParentZoneContext);
  if (!context) throw new Error('useParentZone must be used within ParentLayout');
  return context;
}
