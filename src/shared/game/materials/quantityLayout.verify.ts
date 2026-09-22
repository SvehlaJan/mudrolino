import { buildQuantityLayout, rectanglesOverlap } from './quantityLayout';

const sizes = [
  { width: 128, height: 112 },
  { width: 220, height: 120 },
  { width: 320, height: 180 },
];

for (const bounds of sizes) {
  for (let count = 1; count <= 20; count += 1) {
    const layout = buildQuantityLayout({ count, ...bounds, gap: 6 });
    if (layout.slots.length !== count) throw new Error(`${bounds.width}x${bounds.height}: wrong slot count`);
    for (const slot of layout.slots) {
      if (slot.x < 0 || slot.y < 0) throw new Error('slot starts outside the tray');
      if (slot.x + slot.size > bounds.width + 0.01) throw new Error('slot exceeds tray width');
      if (slot.y + slot.size > bounds.height + 0.01) throw new Error('slot exceeds tray height');
    }
    for (let left = 0; left < layout.slots.length; left += 1) {
      for (let right = left + 1; right < layout.slots.length; right += 1) {
        if (rectanglesOverlap(layout.slots[left], layout.slots[right])) {
          throw new Error(`slots ${left}/${right} overlap at count ${count}`);
        }
      }
    }
  }
}

const repeated = buildQuantityLayout({ count: 10, width: 220, height: 120, gap: 6 });
const repeatedAgain = buildQuantityLayout({ count: 10, width: 220, height: 120, gap: 6 });
if (JSON.stringify(repeated) !== JSON.stringify(repeatedAgain)) throw new Error('layout must be deterministic');

for (const input of [
  { count: 0, width: 220, height: 120, gap: 6 },
  { count: 4, width: 0, height: 120, gap: 6 },
  { count: 4, width: 220, height: 0, gap: 6 },
  { count: -4, width: 220, height: 120, gap: 6 },
  { count: 4, width: -220, height: 120, gap: 6 },
  { count: 4, width: 220, height: -120, gap: 6 },
  { count: 4, width: Number.NaN, height: 120, gap: 6 },
  { count: Number.POSITIVE_INFINITY, width: 220, height: 120, gap: 6 },
]) {
  if (buildQuantityLayout(input).slots.length !== 0) throw new Error('empty bounds must return no slots');
}

const tiny = buildQuantityLayout({ count: 20, width: 1, height: 1, gap: 6 });
for (const slot of tiny.slots) {
  if (slot.x < 0 || slot.y < 0 || slot.x + slot.size > 1 || slot.y + slot.size > 1) {
    throw new Error('tiny tray slot exceeds bounds');
  }
}

const feasible = buildQuantityLayout({ count: 20, width: 320, height: 180, gap: 6 });
if (feasible.slotSize <= 0) throw new Error('feasible tray must produce positive-size slots');
console.log('✓ quantity layout contracts passed');
