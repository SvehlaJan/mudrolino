/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useAppScreenLayout } from './appScreenLayout';
import { cn } from './utils';

export interface RoundCounterProps {
  completed: number;
  total: number;
  label?: string;
  progressLabel?: string;
  ariaLabel?: string;
}

export function RoundCounter({
  completed,
  total,
  label = 'kolá',
  progressLabel,
  ariaLabel,
}: RoundCounterProps) {
  const { layout } = useAppScreenLayout();
  const short = layout === 'short';
  const currentRound = Math.min(completed + 1, total);
  const progressAriaLabel = ariaLabel ?? progressLabel;

  return (
    <div
      role={progressAriaLabel ? 'progressbar' : undefined}
      data-layout={layout}
      className={cn(
        'rounded-full bg-white font-bold text-text-main shadow-block',
        short ? 'px-3 py-1 text-sm' : 'px-5 py-2 text-base sm:text-lg',
      )}
      aria-label={progressAriaLabel ?? `${currentRound} z ${total} ${label}`}
      aria-valuenow={progressAriaLabel ? currentRound : undefined}
      aria-valuemin={progressAriaLabel ? 1 : undefined}
      aria-valuemax={progressAriaLabel ? total : undefined}
      aria-valuetext={progressAriaLabel ? `${currentRound} z ${total} ${label}` : undefined}
    >
      ✓ {currentRound} / {total}
    </div>
  );
}
