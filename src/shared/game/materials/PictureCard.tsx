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
        'grid place-items-center gap-2',
        // The circle replaces the old padded card within the same prompt height budget.
        // WordRail needs the remaining space, particularly in short landscape layouts.
        '[@media(max-height:480px)]:gap-0 [@media(max-width:380px)]:gap-1',
        className,
      )}
      {...props}
    >
      <span
        role="img"
        aria-label={label}
        className="grid aspect-square size-[clamp(8rem,calc(16vmin+2rem),10rem)] place-items-center rounded-full border border-border-subtle bg-surface text-[clamp(4rem,16vmin,8rem)] leading-none [@media(max-width:380px)]:size-20 [@media(max-width:380px)]:text-[clamp(2.25rem,11vmin,4.5rem)] [@media(max-height:480px)]:size-[clamp(2rem,calc(8vmin+0.25rem),3.5rem)] [@media(max-height:480px)]:text-[clamp(1.5rem,8vmin,3rem)]"
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
