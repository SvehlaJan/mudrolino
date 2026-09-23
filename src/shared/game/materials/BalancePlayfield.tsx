/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../ui';
import { AnswerGroup } from '../AnswerGroup';
import { TactilePiece, type TactilePieceState } from './TactilePiece';

export interface BalancePlayfieldProps {
  left: ReactNode;
  right: ReactNode;
  leftLabel: string;
  rightLabel: string;
  onChoose(side: 'left' | 'right'): void;
  disabled?: boolean;
  leftButtonProps?: ButtonHTMLAttributes<HTMLButtonElement>;
  rightButtonProps?: ButtonHTMLAttributes<HTMLButtonElement>;
  leftState?: TactilePieceState;
  rightState?: TactilePieceState;
  className?: string;
}

/** Two directly-operable quantity choices with decorative balance fulcrums. */
export function BalancePlayfield({
  left,
  right,
  leftLabel,
  rightLabel,
  onChoose,
  disabled = false,
  leftButtonProps,
  rightButtonProps,
  leftState = 'idle',
  rightState = 'idle',
  className,
}: BalancePlayfieldProps) {
  const { disabled: leftButtonDisabled = false, className: leftButtonClassName, ...leftButtonAttributes } = leftButtonProps ?? {};
  const { disabled: rightButtonDisabled = false, className: rightButtonClassName, ...rightButtonAttributes } = rightButtonProps ?? {};

  return (
    <AnswerGroup label="Porovnanie množstiev" orientation="horizontal" className={cn('min-h-0', className)}>
      <TactilePiece
        as="button"
        material="wood"
        label={leftLabel}
        state={leftState}
        disabled={disabled || leftButtonDisabled}
        onPress={() => onChoose('left')}
        {...leftButtonAttributes}
        data-answer-side="left"
        className={cn('relative h-full w-full min-h-12 min-w-12 overflow-hidden p-1', leftButtonClassName)}
      >
        {left}
        <span aria-hidden="true" className="pointer-events-none absolute bottom-1 left-1/2 h-2 w-8 -translate-x-1/2 rounded-full bg-shadow/25" />
      </TactilePiece>
      <TactilePiece
        as="button"
        material="wood"
        label={rightLabel}
        state={rightState}
        disabled={disabled || rightButtonDisabled}
        onPress={() => onChoose('right')}
        {...rightButtonAttributes}
        data-answer-side="right"
        className={cn('relative h-full w-full min-h-12 min-w-12 overflow-hidden p-1', rightButtonClassName)}
      >
        {right}
        <span aria-hidden="true" className="pointer-events-none absolute bottom-1 left-1/2 h-2 w-8 -translate-x-1/2 rounded-full bg-shadow/25" />
      </TactilePiece>
    </AnswerGroup>
  );
}
