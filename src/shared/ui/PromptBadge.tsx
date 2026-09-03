/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Card } from './Card';
import { cx } from './utils';

export interface PromptBadgeProps {
  children: React.ReactNode;
  ariaLabel?: string;
  className?: string;
  onClick?: () => void;
}

export function PromptBadge({ children, ariaLabel, className, onClick }: PromptBadgeProps) {
  return (
    <Card
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={ariaLabel}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault?.();
                onClick();
              }
            }
          : undefined
      }
      className={cx(
        'inline-flex items-center justify-center min-w-[140px] sm:min-w-[200px] !rounded-[28px] sm:!rounded-[44px] !px-6 !py-4 sm:!px-10 sm:!py-6 text-center !shadow-block select-none',
        onClick && 'cursor-pointer active:scale-95 transition-transform hover:brightness-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40',
        className
      )}
    >
      {children}
    </Card>
  );
}
