/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CompareGridSlot, COMPARE_GRID_TOTAL_SLOTS } from '../scatterGridLogic';

interface QuantityClusterProps {
  mode: 'objects' | 'numerals';
  value: number;
  /** Precomputed scatter layout for 'objects' mode — generate once per round (e.g. in round-start logic), never per render, or the objects will visibly jump around on unrelated re-renders. Ignored in 'numerals' mode. */
  slots?: CompareGridSlot[];
  numeralClassName?: string;
}

export function QuantityCluster({ mode, value, slots = [], numeralClassName }: QuantityClusterProps) {
  if (mode === 'numerals') {
    return (
      <span className={numeralClassName ?? 'font-spline text-5xl font-black leading-none sm:text-7xl'}>
        {value}
      </span>
    );
  }

  return (
    <div className="grid h-full w-full grid-cols-3 auto-rows-fr place-items-center p-1 sm:p-2">
      {Array.from({ length: COMPARE_GRID_TOTAL_SLOTS }, (_, slotIndex) => {
        const item = slots.find((s) => s.slotIndex === slotIndex);
        if (!item) {
          return <div key={`empty-${slotIndex}`} className="h-full w-full" aria-hidden="true" />;
        }
        return (
          <span
            key={`slot-${slotIndex}`}
            aria-hidden="true"
            className="relative flex items-center justify-center text-3xl leading-none select-none sm:text-4xl md:text-5xl"
            style={{
              transform: `rotate(${item.rotation}deg) translate(${item.offsetX}px, ${item.offsetY}px)`,
            }}
          >
            {item.emoji}
          </span>
        );
      })}
    </div>
  );
}
