/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  AppScreenLayoutContext,
  type AppScreenLayout,
  type AppScreenLayoutContextValue,
  type AppScreenMode,
} from './appScreenLayout';
import { uiTokens } from './tokens';
import { cn } from './utils';

export type { AppScreenLayout, AppScreenMode } from './appScreenLayout';

export type AppScreenHeight = 'viewport' | 'content';
export type AppScreenScroll = 'locked' | 'vertical';

/**
 * Below this available content height a screen switches to its short layout.
 * Driven by measured container height, not orientation, so a tall landscape
 * tablet stays "regular" while a short phone-landscape strip goes "short".
 */
const SHORT_LAYOUT_MAX_HEIGHT = 480;

interface AppScreenProps {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  maxWidth?: keyof typeof uiTokens.maxWidth;
  /** Child surfaces are spacious and tactile; parent surfaces are calmer and denser. */
  mode?: AppScreenMode;
  height?: AppScreenHeight;
  scroll?: AppScreenScroll;
  /** @deprecated use `height="viewport" | "content"` instead. */
  fixedHeight?: boolean;
  /** @deprecated use `scroll="vertical" | "locked"` instead. */
  scrollable?: boolean;
  position?: 'relative' | 'fixed';
}

export function AppScreen({
  children,
  className,
  contentClassName,
  maxWidth = 'game',
  mode = 'child',
  height,
  scroll,
  fixedHeight = true,
  scrollable = false,
  position = 'relative',
}: AppScreenProps) {
  const resolvedHeight: AppScreenHeight = height ?? (fixedHeight ? 'viewport' : 'content');
  const resolvedScroll: AppScreenScroll = scroll ?? (scrollable ? 'vertical' : 'locked');

  const [layout, setLayout] = useState<AppScreenLayout>('regular');

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    // Measure the real viewport, not this screen's own rendered box: a scrollable
    // (`height="content"`) screen's content can be far taller than the space actually
    // available, which would otherwise never report "short". `document.documentElement`'s
    // layout box grows with overflowing content too, so only `window.innerHeight` (or a
    // resize of it) reports the space genuinely available to the screen.
    const updateLayout = () => {
      const availableHeight = window.innerHeight;
      setLayout(availableHeight > 0 && availableHeight < SHORT_LAYOUT_MAX_HEIGHT ? 'short' : 'regular');
    };
    updateLayout();
    window.addEventListener('resize', updateLayout);
    return () => window.removeEventListener('resize', updateLayout);
  }, []);

  const contextValue = useMemo<AppScreenLayoutContextValue>(() => ({ mode, layout }), [mode, layout]);

  return (
    <AppScreenLayoutContext.Provider value={contextValue}>
      <main
        data-mode={mode}
        data-layout={layout}
        className={cn(
          resolvedHeight === 'viewport' ? 'min-h-[100svh] h-[100svh]' : 'min-h-screen',
          resolvedScroll === 'vertical' ? 'overflow-y-auto overflow-x-hidden' : 'overflow-hidden',
          position,
          // Fixed, edge-aligned screens (e.g. the parent gate overlay) sit outside body's own
          // safe-area padding, so they need their own inset added on top of screenPadding.
          position === 'fixed' &&
            'mt-[env(safe-area-inset-top)] mr-[env(safe-area-inset-right)] mb-[env(safe-area-inset-bottom)] ml-[env(safe-area-inset-left)]',
          'flex flex-col',
          uiTokens.screenBg,
          uiTokens.screenPadding,
          className,
        )}
      >
        <div
          className={cn(
            'mx-auto flex w-full flex-1 min-h-0 flex-col',
            uiTokens.maxWidth[maxWidth],
            contentClassName,
          )}
        >
          {children}
        </div>
      </main>
    </AppScreenLayoutContext.Provider>
  );
}
