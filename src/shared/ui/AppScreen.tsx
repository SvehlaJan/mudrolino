/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
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
/** `'main'` for a real page; `'div'` for a screen stacked on top of one that already owns it, so the DOM never carries two simultaneous main landmarks. */
export type AppScreenElement = 'main' | 'div';

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
  /** @default 'main' */
  as?: AppScreenElement;
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
  as = 'main',
}: AppScreenProps) {
  const resolvedHeight: AppScreenHeight = height ?? (fixedHeight ? 'viewport' : 'content');
  const resolvedScroll: AppScreenScroll = scroll ?? (scrollable ? 'vertical' : 'locked');

  const [layout, setLayout] = useState<AppScreenLayout>('regular');
  const sizerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const applyHeight = (availableHeight: number) => {
      setLayout(availableHeight > 0 && availableHeight < SHORT_LAYOUT_MAX_HEIGHT ? 'short' : 'regular');
    };

    const sizer = sizerRef.current;
    if (!sizer || typeof ResizeObserver === 'undefined') {
      // Safe fallback (no ResizeObserver support): the previous window-driven signal.
      const updateFromWindow = () => applyHeight(window.innerHeight);
      updateFromWindow();
      window.addEventListener('resize', updateFromWindow);
      return () => window.removeEventListener('resize', updateFromWindow);
    }

    // Measure a dedicated `position: fixed; inset: 0` node, not this screen's own rendered
    // box: a scrollable (`height="content"`) screen's content can be far taller than the
    // space actually available, which would otherwise never report "short". A fixed,
    // inset-0 node's own box is immune to that content growth, and — unlike
    // `window.innerHeight` — it also tracks the real available box when an ancestor
    // redefines the fixed containing block (e.g. via `transform`), so a screen nested in a
    // shorter container than the browser viewport still gets the right reading.
    const observer = new ResizeObserver((entries) => {
      const observedHeight = entries[0]?.contentRect.height;
      applyHeight(observedHeight ?? window.innerHeight);
    });
    observer.observe(sizer);
    return () => observer.disconnect();
  }, []);

  const contextValue = useMemo<AppScreenLayoutContextValue>(() => ({ mode, layout }), [mode, layout]);
  const Element = as;

  return (
    <AppScreenLayoutContext.Provider value={contextValue}>
      <div ref={sizerRef} aria-hidden="true" className="fixed inset-0 invisible pointer-events-none" />
      <Element
        data-mode={mode}
        data-layout={layout}
        className={cn(
          resolvedHeight === 'viewport' && 'min-h-[100svh] h-[100svh]',
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
      </Element>
    </AppScreenLayoutContext.Provider>
  );
}
