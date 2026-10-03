/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ReactNode } from 'react';
import { cn } from '../../ui';

export interface WordRailProps {
  label: string;
  children: ReactNode;
  className?: string;
}

export function WordRail({ label, children, className = '' }: WordRailProps) {
  return (
    <section
      data-testid="word-rail"
      aria-label={label}
      className={cn(
        'w-full rounded-[2rem] bg-surface/80 p-3 sm:p-5 [@media(max-height:480px)]:p-1 [@media(max-width:380px)]:p-1.5',
        className,
      )}
    >
      <ol className="flex min-w-0 flex-wrap items-center justify-center gap-2 sm:gap-3 [@media(max-height:480px)]:gap-1 [@media(max-width:380px)]:gap-1">
        {children}
      </ol>
    </section>
  );
}
