/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import { cn } from '../../ui';
import { useElementSize } from '../useElementSize';

export interface PlayTrayProps extends React.HTMLAttributes<HTMLElement> {
  label: string;
  density?: 'comfortable' | 'compact';
  children: React.ReactNode;
}

export function PlayTray({ label, density = 'comfortable', children, className, ...props }: PlayTrayProps) {
  const ref = useRef<HTMLElement>(null);
  const { width, height } = useElementSize(ref);
  const measured = width > 0 && height > 0;

  return (
    <section
      {...props}
      ref={ref}
      aria-label={label}
      data-testid="play-tray"
      className={cn(
        'relative flex min-h-0 w-full flex-1 flex-col items-center justify-center rounded-[28px] border border-shadow/15 bg-bg-light/35',
        density === 'compact' ? 'gap-2 p-3' : 'gap-4 p-5 [@media(max-height:480px)]:gap-2 [@media(max-height:480px)]:p-2.5',
        measured && 'overflow-hidden',
        className,
      )}
    >
      {children}
    </section>
  );
}
