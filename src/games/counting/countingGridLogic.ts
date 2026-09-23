/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface GridItemSlot {
  slotIndex: number;
  emoji: string;
  rotation: number; // -15 to +15 deg
  offsetX: number;  // -10 to +10 px
  offsetY: number;  // -10 to +10 px
}

export const COUNTING_GRID_TOTAL_SLOTS = 15; // 3 rows x 5 cols on desktop, 5 rows x 3 cols on mobile

export function generateGridItems(count: number, emojis: string[], random: () => number = Math.random): GridItemSlot[] {
  const safeCount = Math.max(0, Math.min(count, COUNTING_GRID_TOTAL_SLOTS));
  const emoji = emojis.length > 0 ? emojis[Math.floor(random() * emojis.length)] : '⭐';
  const allSlots = Array.from({ length: COUNTING_GRID_TOTAL_SLOTS }, (_, i) => i);
  for (let index = allSlots.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [allSlots[index], allSlots[swapIndex]] = [allSlots[swapIndex], allSlots[index]];
  }
  const selectedSlots = allSlots.slice(0, safeCount).sort((a, b) => a - b);

  return selectedSlots.map((slotIndex) => ({
    slotIndex,
    emoji,
    rotation: Math.round((random() * 30 - 15) * 10) / 10,
    offsetX: Math.round((random() * 20 - 10) * 10) / 10,
    offsetY: Math.round((random() * 20 - 10) * 10) / 10,
  }));
}
