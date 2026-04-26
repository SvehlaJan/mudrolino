/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { cx } from './utils';

interface TopBarProps {
  left?: React.ReactNode;
  center?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}

export function TopBar({ left, center, right, className }: TopBarProps) {
  return (
    <div
      className={cx(
        'grid grid-cols-[auto_1fr_auto] items-start gap-3 pb-3 sm:gap-4 sm:pb-4 shrink-0',
        className,
      )}
    >
      <div>{left ?? <div className="w-12 sm:w-14" />}</div>
      <div className="pt-1 sm:pt-1.5 flex justify-center">{center}</div>
      <div>{right ?? <div className="w-12 sm:w-14" />}</div>
    </div>
  );
}
