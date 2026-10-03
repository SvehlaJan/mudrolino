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
  fitContents?: readonly string[];
}

export function InsetSlot({ label, state, children, fitContents = [], className = '', ...props }: InsetSlotProps) {
  return (
    <li
      aria-label={label}
      data-slot-state={state}
      className={cn(
        'grid min-h-14 min-w-14 place-items-center rounded-2xl border-[3px] px-3 py-2 font-spline text-[clamp(1.5rem,6vmin,3.25rem)] font-black leading-none',
        // A short viewport height compresses this the same as a narrow one does: a longer word
        // (more InsetSlots) needs the whole rail to wrap less, or a short landscape strip needs
        // less vertical room per slot — either way the fallback is the same smaller slot.
        '[@media(max-height:480px)]:min-h-9 [@media(max-height:480px)]:min-w-9 [@media(max-height:480px)]:px-1.5 [@media(max-height:480px)]:py-1 [@media(max-height:480px)]:text-[clamp(1rem,5vmin,2rem)]',
        '[@media(max-width:380px)]:min-h-9 [@media(max-width:380px)]:min-w-9 [@media(max-width:380px)]:px-1.5 [@media(max-width:380px)]:py-1 [@media(max-width:380px)]:text-[clamp(1rem,5vmin,2rem)]',
        state === 'active' ? 'border-focus bg-selected-surface text-text-main' : 'border-border-subtle bg-surface text-text-main',
        state === 'pending' && 'bg-canvas text-text-muted',
        className,
      )}
      {...props}
    >
      {fitContents.map(text => <span key={text} aria-hidden="true" data-fit-text={text}
        className="invisible col-start-1 row-start-1 whitespace-nowrap px-1 before:content-[attr(data-fit-text)]" />)}
      <span className="col-start-1 row-start-1 grid h-full w-full min-w-0 place-items-center whitespace-nowrap">
        {children ?? <span aria-hidden="true">?</span>}
      </span>
    </li>
  );
}
