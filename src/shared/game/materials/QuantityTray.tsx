/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useRef, useState, type HTMLAttributes } from 'react';
import { cn } from '../../ui';
import { useElementSize } from '../useElementSize';
import { TactilePiece } from './TactilePiece';
import { buildQuantityLayout } from './quantityLayout';

export interface QuantityTrayProps extends Omit<HTMLAttributes<HTMLDivElement>, 'aria-label' | 'children' | 'role'> {
  count: number;
  emoji: string;
  mode: 'objects' | 'numerals';
  arrangement?: 'grid' | 'scattered';
  label: string;
  interactiveTokens?: boolean;
  onTokenPress?: (index: number) => void;
  className?: string;
}

/** A measured quantity surface whose visible token bounds never overlap. */
export function QuantityTray({
  count,
  emoji,
  mode,
  arrangement = 'grid',
  label,
  interactiveTokens = false,
  onTokenPress,
  className,
  ...props
}: QuantityTrayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const size = useElementSize(containerRef);
  const [seed] = useState(() => arrangement === 'scattered' ? Math.floor(Math.random() * 0x100000000) : 0);
  const layout = buildQuantityLayout({ count, width: size.width, height: size.height, gap: 6, arrangement, seed, minimumSize: interactiveTokens ? 48 : 24 });

  return (
    <div
      {...props}
      ref={containerRef}
      role={interactiveTokens ? 'group' : 'img'}
      aria-label={label}
      data-quantity-mode={mode}
      data-quantity-arrangement={arrangement}
      className={cn('relative min-h-24 overflow-hidden [container-type:inline-size]', className)}
    >
      {mode === 'numerals' ? (
        <span
          aria-hidden="true"
          className="absolute inset-0 grid place-items-center font-spline text-[clamp(3rem,12cqi,6rem)] font-black leading-none"
        >
          {count}
        </span>
      ) : layout.slots.filter((slot) => slot.size > 0).map((slot) => {
        const style = { left: slot.x, top: slot.y, width: slot.size, height: slot.size };
        const token = (
          <TactilePiece
            material="counter"
            aria-hidden="true"
            className="h-full w-full min-h-0 min-w-0 text-[clamp(1rem,8cqi,3rem)] leading-none"
          >
            {emoji}
          </TactilePiece>
        );

        if (interactiveTokens && slot.size >= 48) {
          return (
            <button
              key={slot.index}
              type="button"
              data-quantity-token
              aria-label={`Predmet ${slot.index + 1} z ${count}`}
              onClick={() => onTokenPress?.(slot.index)}
              style={style}
              className="absolute grid min-h-12 min-w-12 place-items-center rounded-xl focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-focus"
            >
              {token}
            </button>
          );
        }

        return (
          <span key={slot.index} data-quantity-token aria-hidden="true" style={style} className="absolute grid place-items-center">
            {token}
          </span>
        );
      })}
    </div>
  );
}
