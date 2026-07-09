/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

interface RoundCounterProps {
  completed: number;
  total: number;
  label?: string;
}

export function RoundCounter({ completed, total, label = 'kolá' }: RoundCounterProps) {
  const currentRound = Math.min(completed + 1, total);
  return (
    <div
      className="rounded-full bg-white px-5 py-2 text-base font-bold text-text-main shadow-block sm:text-lg"
      aria-label={`${currentRound} z ${total} ${label}`}
    >
      ✓ {currentRound} / {total}
    </div>
  );
}
