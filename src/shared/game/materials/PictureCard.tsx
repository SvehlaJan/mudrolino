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
        '[@media(max-height:480px)]:min-h-20 [@media(max-height:480px)]:gap-1 [@media(max-height:480px)]:p-2',
        '[@media(max-width:400px)]:min-h-20 [@media(max-width:400px)]:gap-1 [@media(max-width:400px)]:p-2',
        className,
      )}
      {...props}
    >
      <span
        role="img"
        aria-label={label}
        className="text-[clamp(4rem,16vmin,8rem)] leading-none [@media(max-height:480px)]:text-[clamp(2.25rem,11vmin,4.5rem)] [@media(max-width:400px)]:text-[clamp(2.25rem,11vmin,4.5rem)]"
      >
        {emoji}
      </span>
      {caption ? (
        <figcaption className="text-center font-spline text-xl font-bold text-text-main [@media(max-height:480px)]:text-base [@media(max-width:400px)]:text-base">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
