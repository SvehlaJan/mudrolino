/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Button } from './Button';
import { Card } from './Card';
import { cn } from './utils';

export interface PromptBadgeProps {
  children: React.ReactNode;
  ariaLabel?: string;
  className?: string;
  onClick?: () => void;
}

const promptBadgeClassName =
  'inline-flex min-w-[140px] items-center justify-center rounded-[28px] px-6 py-4 text-center shadow-block select-none sm:min-w-[200px] sm:rounded-[44px] sm:px-10 sm:py-6';

export function PromptBadge({ children, ariaLabel, className, onClick }: PromptBadgeProps) {
  if (onClick) {
    return (
      <Button
        type="button"
        tone="neutral"
        onClick={onClick}
        aria-label={ariaLabel}
        data-testid="prompt-badge"
        className={cn(
          promptBadgeClassName,
          'cursor-pointer transition-transform hover:brightness-105 active:scale-95',
          className,
        )}
      >
        {children}
      </Button>
    );
  }

  return (
    <Card aria-label={ariaLabel} data-testid="prompt-badge" className={cn(promptBadgeClassName, className)}>
      {children}
    </Card>
  );
}
