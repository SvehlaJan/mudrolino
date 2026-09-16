/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useAppScreenLayout } from './appScreenLayout';
import { cn } from './utils';

interface RoundCounterProps {
  completed: number;
  total: number;
  label?: string;
}

export function RoundCounter({ completed, total, label = 'kolá' }: RoundCounterProps) {
  const { layout } = useAppScreenLayout();
  const short = layout === 'short';
  const currentRound = Math.min(completed + 1, total);

  return (
    <div
      data-layout={layout}
      className={cn(
        'rounded-full bg-white font-bold text-text-main shadow-block',
        short ? 'px-3 py-1 text-sm' : 'px-5 py-2 text-base sm:text-lg',
      )}
      aria-label={`${currentRound} z ${total} ${label}`}
    >
      ✓ {currentRound} / {total}
    </div>
  );
}
