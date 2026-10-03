import { expect, it } from 'vitest';
import { buildQuantityLayout, rectanglesOverlap } from './quantityLayout';

it('scatters counters in both axes instead of aligning them in a row', () => {
  const layout = buildQuantityLayout({ count: 3, width: 1000, height: 156, gap: 6, arrangement: 'scattered', seed: 42, minimumSize: 48 });
  expect(new Set(layout.slots.map(slot => slot.y)).size).toBe(3);
  expect(layout.slotSize).toBeGreaterThanOrEqual(48);
  expect(layout.slotSize).toBeLessThanOrEqual(64);
});

it('keeps seeded scattered positions stable and changes them with another seed', () => {
  const input = { count: 7, width: 450, height: 270, gap: 6, arrangement: 'scattered' as const, seed: 42 };
  expect(buildQuantityLayout(input)).toEqual(buildQuantityLayout(input));
  expect(buildQuantityLayout({ ...input, seed: 43 }).slots).not.toEqual(buildQuantityLayout(input).slots);
});

it('fits every counter without overlap across quantities, seeds and constrained trays', () => {
  for (const [width, height] of [[128, 112], [282, 146], [1000, 156], [450, 270], [1, 1]]) {
    for (let count = 1; count <= 20; count += 1) {
      for (const seed of [0, 1, 42, 0xffffffff]) {
        const layout = buildQuantityLayout({ count, width, height, gap: 6, arrangement: 'scattered', seed });
        expect(layout.slots).toHaveLength(count);
        for (const slot of layout.slots) {
          expect(slot.x).toBeGreaterThanOrEqual(0);
          expect(slot.y).toBeGreaterThanOrEqual(0);
          expect(slot.x + slot.size).toBeLessThanOrEqual(width + 0.01);
          expect(slot.y + slot.size).toBeLessThanOrEqual(height + 0.01);
        }
        for (let left = 0; left < count; left += 1) for (let right = left + 1; right < count; right += 1) {
          expect(rectanglesOverlap(layout.slots[left], layout.slots[right])).toBe(false);
        }
      }
    }
  }
});

it('preserves 48px counting targets for ten counters at narrow-phone size', () => {
  const layout = buildQuantityLayout({ count: 10, width: 282, height: 146, gap: 6, arrangement: 'scattered', seed: 42, minimumSize: 48 });
  expect(layout.slotSize).toBeGreaterThanOrEqual(48);
});

it('preserves counting hit targets when a short landscape tray has no spare vertical gutter', () => {
  const layout = buildQuantityLayout({ count: 10, width: 619, height: 102.5, gap: 6, arrangement: 'scattered', seed: 42, minimumSize: 48 });
  expect(layout.slotSize).toBeGreaterThanOrEqual(48);
});
