/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { fisherYatesShuffle } from '../../shared/utils';

export interface CompareGridSlot {
  slotIndex: number;
  emoji: string;
  rotation: number; // -15 to +15 deg
  offsetX: number;  // -4 to +4 px
  offsetY: number;  // -4 to +4 px
}

export const COMPARE_GRID_TOTAL_SLOTS = 12; // 3 cols x 4 rows

export function generateCompareGridSlots(count: number, emoji: string): CompareGridSlot[] {
  const safeCount = Math.max(0, Math.min(count, COMPARE_GRID_TOTAL_SLOTS));
  const selectedSlots = fisherYatesShuffle(
    Array.from({ length: COMPARE_GRID_TOTAL_SLOTS }, (_, i) => i),
  )
    .slice(0, safeCount)
    .sort((a, b) => a - b);

  return selectedSlots.map((slotIndex) => ({
    slotIndex,
    emoji,
    rotation: Math.round((Math.random() * 30 - 15) * 10) / 10,
    offsetX: Math.round((Math.random() * 8 - 4) * 10) / 10,
    offsetY: Math.round((Math.random() * 8 - 4) * 10) / 10,
  }));
}
