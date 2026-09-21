/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { cn } from '../../ui';

export interface PlayTrayProps extends React.HTMLAttributes<HTMLElement> {
  label: string;
  density?: 'comfortable' | 'compact';
  children: React.ReactNode;
}

export function PlayTray({ label, density = 'comfortable', children, className, ...props }: PlayTrayProps) {
  return (
    <section
      {...props}
      aria-label={label}
      data-testid="play-tray"
      className={cn(
        // Always clips. This used to be gated on a measured, non-zero box, which inverted exactly
        // when it was needed most: a tray squeezed to a zero-height content box (a retry banner
        // appearing on a short screen) reported "unmeasured", dropped the clip, and let the
        // answer tiles paint straight over whatever sat below the tray. Assembly's flight clones
        // are appended to document.body as `position: fixed` nodes, so they are unaffected.
        'relative flex min-h-0 w-full flex-1 flex-col items-center justify-center overflow-hidden rounded-[28px] border border-shadow/15 bg-bg-light/35',
        // The comfortable padding is the tray's own share of the vertical budget; on a short or
        // narrow screen it competes directly with the 48px minimum tile size, so it gives ground
        // at the same two breakpoints PictureCard and the literacy prompt stacks already use.
        density === 'compact'
          ? 'gap-2 p-3'
          : 'gap-4 p-5 [@media(max-width:380px)]:gap-2 [@media(max-width:380px)]:p-3 [@media(max-height:480px)]:gap-2 [@media(max-height:480px)]:p-1.5',
        className,
      )}
    >
      {children}
    </section>
  );
}
