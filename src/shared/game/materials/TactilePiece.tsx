/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { cva } from 'class-variance-authority';
import { Check } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { cn } from '../../ui';
import { getUiCopy } from '../../uiCopy';
import { useContentLocale } from '../../contexts/ContentContext';

export type TactileMaterial = 'wood' | 'magnet' | 'felt' | 'picture' | 'counter' | 'paper';
export type TactilePieceState = 'idle' | 'pressed' | 'retry' | 'settled' | 'disabled';
export type TactileVisualRole = 'answer' | 'task';

export interface TactilePieceProps extends React.HTMLAttributes<HTMLElement> {
  as?: 'span' | 'button';
  material: TactileMaterial;
  visualRole: TactileVisualRole;
  state?: TactilePieceState;
  label?: string;
  disabled?: boolean;
  onPress?: () => void;
  children: React.ReactNode;
}

const tactileMaterialVariants = cva(
  'relative flex min-h-12 min-w-12 items-center justify-center font-black text-text-main transition-[transform,box-shadow,opacity,background-color,border-color] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      material: {
        wood: 'border-b-4 border-r-4 border-black/15 bg-bg-light',
        magnet: 'border-4 border-double border-black/20 bg-white',
        felt: 'border-2 border-dashed border-black/25 bg-white',
        picture: 'border border-white/70 bg-white p-1',
        counter: 'border border-black/15 bg-white',
        paper: 'border border-black/10 bg-white',
      },
      visualRole: {
        answer: 'rounded-[22px] border border-white/70 bg-white p-1 shadow-block',
        task: 'rounded-full',
      },
    },
    defaultVariants: { material: 'wood' },
  },
);

export const TactilePiece = React.forwardRef<HTMLElement, TactilePieceProps>(function TactilePiece(
  {
    as = 'span',
    material,
    visualRole,
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
  const isEffectiveDisabled = disabled || state === 'disabled';
  // An explicit non-idle state (pressed/retry/settled) must stay visible even while the
  // group locks input for that same answer — only a plain disabled idle tile falls back
  // to the generic disabled look, so retry/settled semantics never collapse into it.
  const resolvedState = state !== 'idle' ? state : (isEffectiveDisabled ? 'disabled' : 'idle');
  const showStateNote = resolvedState === 'settled';

  if (as === 'button' && !label && import.meta.env.DEV) {
    console.error('TactilePiece as="button" requires a label for its accessible name.');
  }

  const stateNoteText =
    resolvedState === 'retry'
      ? getUiCopy(locale, 'game.retryPrompt')
      : resolvedState === 'settled'
      ? getUiCopy(locale, 'game.piece.settledLabel')
      : null;

  const content = (
    <>
      {children}
      {showStateNote && (
        <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 rounded-b-[inherit] bg-white/90 px-1 py-0.5 text-[10px] font-bold text-text-main">
          <Check aria-hidden="true" size={10} />
          <span>{stateNoteText}</span>
        </span>
      )}
    </>
  );

  const isPressed = resolvedState === 'pressed';
  const pressClassName = prefersReducedMotion
    ? cn('active:opacity-85', isPressed && 'opacity-85')
    : cn('active:translate-y-1 active:shadow-block-pressed', isPressed && 'translate-y-1 shadow-block-pressed');
  const sharedClassName = cn(
    // Answers share the Words picture-card appearance; material decoration belongs to tasks.
    tactileMaterialVariants({ material: visualRole === 'task' ? material : null, visualRole }),
    as === 'button' && !isEffectiveDisabled &&
      (visualRole === 'answer' ? pressClassName : 'active:opacity-85'),
    className,
  );

  if (as === 'button') {
    const buttonProps = props as React.ButtonHTMLAttributes<HTMLButtonElement>;
    return (
      <button
        {...buttonProps}
        ref={ref as React.Ref<HTMLButtonElement>}
        type="button"
        aria-label={label}
        aria-description={stateNoteText ?? undefined}
        disabled={isEffectiveDisabled}
        data-material={material}
        data-visual-role={visualRole}
        data-piece-state={resolvedState}
        onClick={(e) => {
          buttonProps.onClick?.(e);
          if (!isEffectiveDisabled) onPress?.();
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
      aria-label={label}
      data-material={material}
      data-visual-role={visualRole}
      data-piece-state={resolvedState}
      className={sharedClassName}
    >
      {content}
    </span>
  );
});
