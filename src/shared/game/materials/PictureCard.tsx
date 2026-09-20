/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { HTMLAttributes } from 'react';
import { cn } from '../../ui';

export interface PictureCardProps extends Omit<HTMLAttributes<HTMLElement>, 'aria-label'> {
  emoji: string;
  label: string;
  caption?: string;
}

export function PictureCard({ emoji, label, caption, className = '', ...props }: PictureCardProps) {
  return (
    <figure
      data-testid="picture-card"
      className={cn(
        'grid min-h-32 place-items-center gap-2 rounded-3xl border border-border-subtle bg-surface p-4 shadow-card',
        // A short landscape strip (max-height) leaves very little total room once the sibling
        // WordRail also needs to stay visible below this card — see WordRail/InsetSlot's own
        // comment on the same breakpoint. This card is decorative next to WordRail's essential
        // blanks, so it shrinks further here than the width-only case below, which — unlike a
        // short landscape strip — usually still has ample height to spare (e.g. a narrow but
        // tall phone) and only needs a mild reduction.
        '[@media(max-height:480px)]:min-h-8 [@media(max-height:480px)]:gap-0 [@media(max-height:480px)]:p-0.5',
        '[@media(max-width:380px)]:min-h-20 [@media(max-width:380px)]:gap-1 [@media(max-width:380px)]:p-2',
        className,
      )}
      {...props}
    >
      <span
        role="img"
        aria-label={label}
        className="text-[clamp(4rem,16vmin,8rem)] leading-none [@media(max-height:480px)]:text-[clamp(1.5rem,8vmin,3rem)] [@media(max-width:380px)]:text-[clamp(2.25rem,11vmin,4.5rem)]"
      >
        {emoji}
      </span>
      {caption ? (
        <figcaption className="text-center font-spline text-xl font-bold text-text-main [@media(max-height:480px)]:text-xs [@media(max-width:380px)]:text-base">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
