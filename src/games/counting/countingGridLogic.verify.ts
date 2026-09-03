import { COUNTING_GRID_TOTAL_SLOTS, generateGridItems } from './countingGridLogic';
import { COUNTING_EMOJIS } from '../../shared/contentRegistry';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

// 1. Verify counts 1 to 10 across multiple randomized iterations
for (let count = 1; count <= 10; count++) {
  for (let iteration = 0; iteration < 50; iteration++) {
    const items = generateGridItems(count, COUNTING_EMOJIS);

    // Item count match
    assert(
      items.length === count,
      `Expected ${count} items for count=${count}, but got ${items.length}`
    );

    // All slotIndex within [0, COUNTING_GRID_TOTAL_SLOTS - 1]
    for (const item of items) {
      assert(
        Number.isInteger(item.slotIndex) &&
          item.slotIndex >= 0 &&
          item.slotIndex < COUNTING_GRID_TOTAL_SLOTS,
        `slotIndex ${item.slotIndex} out of bounds [0, ${COUNTING_GRID_TOTAL_SLOTS - 1}]`
      );

      // Emoji selection
      assert(
        COUNTING_EMOJIS.includes(item.emoji),
        `Item emoji ${item.emoji} is not in COUNTING_EMOJIS`
      );

      // Bounded jitter
      assert(
        item.rotation >= -15 && item.rotation <= 15,
        `Rotation ${item.rotation} out of bounds [-15, 15]`
      );
      assert(
        item.offsetX >= -10 && item.offsetX <= 10,
        `offsetX ${item.offsetX} out of bounds [-10, 10]`
      );
      assert(
        item.offsetY >= -10 && item.offsetY <= 10,
        `offsetY ${item.offsetY} out of bounds [-10, 10]`
      );
    }

    // All slotIndex are unique
    const uniqueSlots = new Set(items.map((it) => it.slotIndex));
    assert(
      uniqueSlots.size === count,
      `Expected ${count} unique slots, but got ${uniqueSlots.size}`
    );

    // Single emoji consistency across all items in the round
    const uniqueEmojis = new Set(items.map((it) => it.emoji));
    assert(
      uniqueEmojis.size === 1,
      `Expected all items in round to share the same emoji, but found ${uniqueEmojis.size} different emojis`
    );
  }
}

// 2. Edge case: count = 0
const zeroItems = generateGridItems(0, COUNTING_EMOJIS);
assert(zeroItems.length === 0, 'Count 0 should return empty array');

// 3. Edge case: count exceeding total slots (e.g. 20)
const cappedItems = generateGridItems(20, COUNTING_EMOJIS);
assert(
  cappedItems.length === COUNTING_GRID_TOTAL_SLOTS,
  `Count > ${COUNTING_GRID_TOTAL_SLOTS} should be capped to ${COUNTING_GRID_TOTAL_SLOTS}`
);
const cappedSlots = new Set(cappedItems.map((it) => it.slotIndex));
assert(
  cappedSlots.size === COUNTING_GRID_TOTAL_SLOTS,
  'All slots should be unique when capped'
);

// 4. Edge case: empty emojis array fallback
const fallbackItems = generateGridItems(3, []);
assert(fallbackItems.length === 3, 'Items generated with empty emojis list');
assert(fallbackItems[0].emoji === '⭐', 'Defaults to ⭐ when emojis list is empty');

console.log('countingGridLogic verify tests passed successfully!');
