/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { cva } from 'class-variance-authority';
import { Check, RefreshCw } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { cn } from '../../ui';
import { getUiCopy } from '../../uiCopy';
import { useContentLocale } from '../../contexts/ContentContext';

export type TactileMaterial = 'wood' | 'magnet' | 'felt' | 'picture' | 'counter' | 'paper';
export type TactilePieceState = 'idle' | 'pressed' | 'retry' | 'settled' | 'disabled';

export interface TactilePieceProps extends React.HTMLAttributes<HTMLElement> {
  as?: 'span' | 'button';
  material: TactileMaterial;
  state?: TactilePieceState;
  label?: string;
  disabled?: boolean;
  onPress?: () => void;
  children: React.ReactNode;
}

const tactileMaterialVariants = cva(
  'relative flex min-h-12 min-w-12 items-center justify-center font-black text-text-main transition-all focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      material: {
        wood: 'rounded-2xl border-b-4 border-r-4 border-black/15 bg-bg-light shadow-block',
        magnet: 'rounded-full border-4 border-double border-black/20 bg-white shadow-chip',
        felt: 'rounded-2xl border-2 border-dashed border-black/25 bg-white',
        picture: 'rounded-[22px] border border-white/70 bg-white p-1 shadow-block',
        counter: 'rounded-full border border-black/15 bg-white shadow-sm',
        paper: 'rounded-lg border border-black/10 bg-white shadow-sm [clip-path:polygon(0_0,100%_0,100%_92%,92%_100%,0_100%)]',
      },
    },
    defaultVariants: { material: 'wood' },
  },
);

export const TactilePiece = React.forwardRef<HTMLElement, TactilePieceProps>(function TactilePiece(
  {
    as = 'span',
    material,
    state = 'idle',
    label,
    disabled = false,
    onPress,
    children,
    className,
    ...props
  },
  ref,
) {
  const locale = useContentLocale();
  const prefersReducedMotion = useReducedMotion();
  const resolvedState = disabled ? 'disabled' : state;
  const showStateNote = resolvedState === 'retry' || resolvedState === 'settled';

  if (as === 'button' && !label && import.meta.env.DEV) {
    console.error('TactilePiece as="button" requires a label for its accessible name.');
  }

  const content = (
    <>
      {children}
      {showStateNote && (
        <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 rounded-b-[inherit] bg-white/90 px-1 py-0.5 text-[10px] font-bold text-text-main">
          {resolvedState === 'retry' ? (
            <RefreshCw aria-hidden="true" size={10} />
          ) : (
            <Check aria-hidden="true" size={10} />
          )}
          <span>
            {resolvedState === 'retry'
              ? getUiCopy(locale, 'game.retryPrompt')
              : getUiCopy(locale, 'game.piece.settledLabel')}
          </span>
        </span>
      )}
    </>
  );

  const pressClassName = prefersReducedMotion
    ? 'active:opacity-85'
    : 'active:translate-y-1 active:shadow-block-pressed';
  const sharedClassName = cn(tactileMaterialVariants({ material }), !disabled && pressClassName, className);

  if (as === 'button') {
    return (
      <button
        {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
        ref={ref as React.Ref<HTMLButtonElement>}
        type="button"
        aria-label={label}
        disabled={disabled}
        data-piece-state={resolvedState}
        onClick={() => {
          if (!disabled) onPress?.();
        }}
        className={sharedClassName}
      >
        {content}
      </button>
    );
  }

  return (
    <span
      {...props}
      ref={ref as React.Ref<HTMLSpanElement>}
      data-piece-state={resolvedState}
      className={sharedClassName}
    >
      {content}
    </span>
  );
});
