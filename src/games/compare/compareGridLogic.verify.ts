/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { COMPARE_GRID_TOTAL_SLOTS, generateCompareGridSlots } from './compareGridLogic';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

// 1. Verify counts 1 to 10 across randomized iterations
for (let count = 1; count <= 10; count++) {
  for (let iteration = 0; iteration < 50; iteration++) {
    const slots = generateCompareGridSlots(count, '🍎');

    assert(
      slots.length === count,
      `Expected ${count} slots, but got ${slots.length}`,
    );

    for (const slot of slots) {
      assert(
        Number.isInteger(slot.slotIndex) &&
          slot.slotIndex >= 0 &&
          slot.slotIndex < COMPARE_GRID_TOTAL_SLOTS,
        `slotIndex ${slot.slotIndex} out of bounds [0, ${COMPARE_GRID_TOTAL_SLOTS - 1}]`,
      );
      assert(
        slot.emoji === '🍎',
        `Expected emoji to be 🍎, got ${slot.emoji}`,
      );
      assert(
        slot.rotation >= -15 && slot.rotation <= 15,
        `Rotation ${slot.rotation} out of bounds [-15, 15]`,
      );
      assert(
        slot.offsetX >= -4 && slot.offsetX <= 4,
        `offsetX ${slot.offsetX} out of bounds [-4, 4]`,
      );
      assert(
        slot.offsetY >= -4 && slot.offsetY <= 4,
        `offsetY ${slot.offsetY} out of bounds [-4, 4]`,
      );
    }

    const uniqueIndices = new Set(slots.map((s) => s.slotIndex));
    assert(
      uniqueIndices.size === count,
      `Expected ${count} unique slot indices, got ${uniqueIndices.size}`,
    );
  }
}

// 2. Edge case: count = 0
assert(generateCompareGridSlots(0, '🍎').length === 0, 'count=0 should return empty array');

// 3. Edge case: count exceeding total slots
const capped = generateCompareGridSlots(20, '🍎');
assert(
  capped.length === COMPARE_GRID_TOTAL_SLOTS,
  `count > ${COMPARE_GRID_TOTAL_SLOTS} should be capped to ${COMPARE_GRID_TOTAL_SLOTS}`,
);

console.log('compareGridLogic verify tests passed successfully!');
