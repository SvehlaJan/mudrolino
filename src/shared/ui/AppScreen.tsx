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
  scrollable?: boolean;
}

export function AppScreen({
  children,
  className,
  contentClassName,
  maxWidth = 'game',
  fixedHeight = true,
  scrollable = false,
}: AppScreenProps) {
  return (
    <div
      className={cx(
        fixedHeight ? 'min-h-[100svh] h-[100svh]' : 'min-h-screen',
        scrollable ? 'overflow-y-auto overflow-x-hidden' : 'overflow-hidden',
        'relative flex flex-col',
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
