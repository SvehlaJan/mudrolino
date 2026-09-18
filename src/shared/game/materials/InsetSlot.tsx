/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../ui';

export type InsetSlotState = 'fixed' | 'active' | 'pending' | 'filled';

export interface InsetSlotProps extends Omit<HTMLAttributes<HTMLLIElement>, 'aria-label'> {
  label: string;
  state: InsetSlotState;
  children?: ReactNode;
}

export function InsetSlot({ label, state, children, className = '', ...props }: InsetSlotProps) {
  return (
    <li
      aria-label={label}
      data-slot-state={state}
      className={cn(
        'grid min-h-14 min-w-14 place-items-center rounded-2xl border-[3px] px-3 py-2 font-spline text-[clamp(1.5rem,6vmin,3.25rem)] font-black leading-none',
        state === 'active' ? 'border-focus bg-selected-surface text-text-main' : 'border-border-subtle bg-surface text-text-main',
        state === 'pending' && 'bg-canvas text-text-muted',
        className,
      )}
      {...props}
    >
      {children ?? <span aria-hidden="true">?</span>}
    </li>
  );
}
