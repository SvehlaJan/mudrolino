/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useAppScreenLayout } from './appScreenLayout';
import { cn } from './utils';

interface TopBarProps extends React.HTMLAttributes<HTMLDivElement> {
  left?: React.ReactNode;
  center?: React.ReactNode;
  right?: React.ReactNode;
}

export function TopBar({ left, center, right, className, ...rest }: TopBarProps) {
  const { layout } = useAppScreenLayout();
  const short = layout === 'short';

  return (
    <div
      {...rest}
      data-layout={layout}
      className={cn(
        'grid grid-cols-[auto_1fr_auto] items-start shrink-0',
        short ? 'gap-2 pb-1' : 'gap-3 pb-3 sm:gap-4 sm:pb-4',
        className,
      )}
    >
      <div>{left ?? <div className="w-12 sm:w-14" />}</div>
      <div className={cn('flex justify-center', short ? 'pt-0.5' : 'pt-1 sm:pt-1.5')}>{center}</div>
      <div>{right ?? <div className="w-12 sm:w-14" />}</div>
    </div>
  );
}
