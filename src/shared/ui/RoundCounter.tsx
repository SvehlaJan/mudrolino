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
  return (
    <div
      className="rounded-full bg-white px-5 py-2 text-base font-bold text-text-main shadow-block sm:text-lg"
      aria-label={`${completed} z ${total} ${label}`}
    >
      ✓ {completed} / {total}
    </div>
  );
}
