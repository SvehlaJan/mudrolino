/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createContext, useContext } from 'react';

export type AppScreenMode = 'child' | 'parent';
export type AppScreenLayout = 'regular' | 'short';

export interface AppScreenLayoutContextValue {
  mode: AppScreenMode;
  layout: AppScreenLayout;
}

export const AppScreenLayoutContext = createContext<AppScreenLayoutContextValue>({
  mode: 'child',
  layout: 'regular',
});

/** Lets a screen's children (TopBar, RoundCounter, ...) read the nearest AppScreen's mode and available-height layout. */
export function useAppScreenLayout(): AppScreenLayoutContextValue {
  return useContext(AppScreenLayoutContext);
}
