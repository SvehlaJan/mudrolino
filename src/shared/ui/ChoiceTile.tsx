/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { uiTokens } from './tokens';
import { cx } from './utils';

type ChoiceTileState = 'neutral' | 'selected' | 'correct' | 'wrong' | 'disabled';
type ChoiceTileShape = 'square' | 'option' | 'pill';

interface ChoiceTileProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  state?: ChoiceTileState;
  shape?: ChoiceTileShape;
  unstyledState?: boolean;
}

const stateClasses: Record<ChoiceTileState, string> = {
  neutral: 'bg-white text-text-main shadow-block',
  selected: 'bg-accent-blue text-white shadow-block scale-105',
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
    ...props
  },
  ref,
) {
  const resolvedState = disabled ? 'disabled' : state;

  return (
    <button
      {...props}
      ref={ref}
      disabled={disabled}
      type={type}
      className={cx(
        'flex items-center justify-center font-bold transition-all disabled:cursor-not-allowed',
        resolvedState !== 'wrong' && resolvedState !== 'disabled' && uiTokens.pressable,
        shapeClasses[shape],
        !unstyledState && stateClasses[resolvedState],
        className,
      )}
    >
      {children}
    </button>
  );
});
