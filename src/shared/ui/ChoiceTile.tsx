/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Check, X } from 'lucide-react';
import { uiTokens } from './tokens';
import { cn } from './utils';

export type ChoiceTileState = 'neutral' | 'selected' | 'correct' | 'wrong' | 'disabled';
export type ChoiceTileShape = 'square' | 'option' | 'pill';

export interface ChoiceTileProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  state?: ChoiceTileState;
  shape?: ChoiceTileShape;
  unstyledState?: boolean;
}

const stateClasses: Record<ChoiceTileState, string> = {
  neutral: 'bg-white text-text-main shadow-block',
  selected: 'bg-accent-blue text-text-main shadow-chip -translate-y-0.5',
  correct: 'bg-success text-primary shadow-block-correct -translate-y-1',
  wrong: 'bg-white text-text-main opacity-50 shadow-block-pressed scale-95',
  disabled: 'bg-bg-light text-text-main opacity-50',
};

const shapeClasses: Record<ChoiceTileShape, string> = {
  square: 'aspect-square rounded-[22px] p-2 sm:rounded-[28px] sm:p-3',
  option: 'rounded-2xl px-4 py-4',
  pill: 'rounded-full px-4 py-2',
};

export const ChoiceTile = React.forwardRef<HTMLButtonElement, ChoiceTileProps>(function ChoiceTile(
  {
    children,
    className,
    disabled,
    shape = 'square',
    state = 'neutral',
    type = 'button',
    unstyledState = false,
    'aria-pressed': ariaPressedProp,
    ...props
  },
  ref,
) {
  const resolvedState = disabled ? 'disabled' : state;
  // 'selected' must be discoverable to assistive tech, not only expressed by background color.
  const ariaPressed = ariaPressedProp ?? (resolvedState === 'selected' ? true : undefined);

  return (
    <button
      {...props}
      ref={ref}
      disabled={disabled}
      type={type}
      aria-pressed={ariaPressed}
      className={cn(
        'relative flex items-center justify-center font-bold transition-all disabled:cursor-not-allowed',
        resolvedState !== 'wrong' && resolvedState !== 'disabled' && uiTokens.pressable,
        shapeClasses[shape],
        !unstyledState && stateClasses[resolvedState],
        className,
      )}
    >
      {children}
      {resolvedState === 'correct' && (
        <span
          data-testid="choice-tile-correct-icon"
          aria-hidden="true"
          className="pointer-events-none absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-green-600 shadow-sm sm:h-6 sm:w-6"
        >
          <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5" strokeWidth={3.5} />
        </span>
      )}
      {resolvedState === 'wrong' && (
        <span
          data-testid="choice-tile-wrong-icon"
          aria-hidden="true"
          className="pointer-events-none absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-action-danger shadow-sm sm:h-6 sm:w-6"
        >
          <X className="h-3 w-3 sm:h-3.5 sm:w-3.5" strokeWidth={3.5} />
        </span>
      )}
    </button>
  );
});
