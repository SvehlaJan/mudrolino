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
      className={cn('grid min-h-32 place-items-center gap-2 rounded-3xl border border-border-subtle bg-surface p-4 shadow-card', className)}
      {...props}
    >
      <span role="img" aria-label={label} className="text-[clamp(4rem,16vmin,8rem)] leading-none">
        {emoji}
      </span>
      {caption ? <figcaption className="text-center font-spline text-xl font-bold text-text-main">{caption}</figcaption> : null}
    </figure>
  );
}
