/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { uiTokens } from './tokens';
import { cx } from './utils';

interface AppScreenProps {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  maxWidth?: keyof typeof uiTokens.maxWidth;
  fixedHeight?: boolean;
  position?: 'relative' | 'fixed';
  scrollable?: boolean;
}

export function AppScreen({
  children,
  className,
  contentClassName,
  maxWidth = 'game',
  fixedHeight = true,
  position = 'relative',
  scrollable = false,
}: AppScreenProps) {
  return (
    <div
      className={cx(
        fixedHeight ? 'min-h-[100svh] h-[100svh]' : 'min-h-screen',
        scrollable ? 'overflow-y-auto overflow-x-hidden' : 'overflow-hidden',
        position,
        'flex flex-col',
        uiTokens.screenBg,
        uiTokens.screenPadding,
        className,
      )}
    >
      <div
        className={cx(
          'mx-auto flex w-full flex-1 min-h-0 flex-col',
          uiTokens.maxWidth[maxWidth],
          contentClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}
