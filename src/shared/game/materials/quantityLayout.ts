export interface QuantityLayoutInput {
  count: number;
  width: number;
  height: number;
  gap: number;
  arrangement?: 'grid' | 'scattered';
  seed?: number;
  minimumSize?: number;
}

export interface QuantitySlot {
  index: number;
  x: number;
  y: number;
  size: number;
}

export interface QuantityLayout {
  columns: number;
  rows: number;
  slotSize: number;
  slots: QuantitySlot[];
}

function nonNegativeFinite(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function rectanglesOverlap(left: QuantitySlot, right: QuantitySlot): boolean {
  return !(
    left.x + left.size <= right.x ||
    right.x + right.size <= left.x ||
    left.y + left.size <= right.y ||
    right.y + right.size <= left.y
  );
}

export function buildQuantityLayout(input: QuantityLayoutInput): QuantityLayout {
  const count = Math.floor(nonNegativeFinite(input.count));
  const width = nonNegativeFinite(input.width);
  const height = nonNegativeFinite(input.height);
  const gap = nonNegativeFinite(input.gap);
  if (count === 0 || width === 0 || height === 0) {
    return { columns: 0, rows: 0, slotSize: 0, slots: [] };
  }

  if (input.arrangement === 'scattered') {
    // Disjoint cells leave room for random positions without rejection loops or
    // overlapping hit targets. Keep a small gutter for counter shadows/focus.
    const minimumSize = nonNegativeFinite(input.minimumSize ?? 24);
    let inset = Math.min(4, width / 2, height / 2);
    let safe = buildQuantityLayout({ count, width: width - inset * 2, height: height - inset * 2, gap });
    if (safe.slotSize < minimumSize) {
      const full = buildQuantityLayout({ count, width, height, gap });
      if (full.slotSize >= minimumSize) { inset = 0; safe = full; }
    }
    const slotSize = Math.min(safe.slotSize, 64, Math.max(minimumSize, Math.floor(safe.slotSize * 0.72)));
    const cellWidth = Math.max(0, (width - inset * 2 - gap * (safe.columns - 1)) / safe.columns);
    const cellHeight = Math.max(0, (height - inset * 2 - gap * (safe.rows - 1)) / safe.rows);
    let seed = (input.seed ?? 0) >>> 0;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 0x100000000;
    };
    // Degenerate bounds still need count-preserving, zero-size slots.
    if (safe.slots.length === 0 || slotSize === 0) {
      return { ...safe, slotSize: 0, slots: Array.from({ length: count }, (_, index) => ({ index, x: width / 2, y: height / 2, size: 0 })) };
    }
    return {
      columns: safe.columns, rows: safe.rows, slotSize,
      slots: Array.from({ length: count }, (_, index) => ({
        index,
        x: inset + (index % safe.columns) * (cellWidth + gap) + random() * (cellWidth - slotSize),
        y: inset + Math.floor(index / safe.columns) * (cellHeight + gap) + random() * (cellHeight - slotSize),
        size: slotSize,
      })),
    };
  }

  const candidates = Array.from({ length: Math.min(count, 6) }, (_, index) => index + 1)
    .map(columns => {
      const rows = Math.ceil(count / columns);
      const availableWidth = width - gap * (columns - 1);
      const availableHeight = height - gap * (rows - 1);
      const slotSize = Math.max(0, Math.floor(Math.min(availableWidth / columns, availableHeight / rows)));
      return { columns, rows, slotSize };
    })
    .sort((left, right) => right.slotSize - left.slotSize || left.rows - right.rows)[0];

  const gridWidth = candidates.columns * candidates.slotSize + gap * (candidates.columns - 1);
  const gridHeight = candidates.rows * candidates.slotSize + gap * (candidates.rows - 1);
  const originX = Math.max(0, (width - gridWidth) / 2);
  const originY = Math.max(0, (height - gridHeight) / 2);
  const gridFits = gridWidth <= width && gridHeight <= height;
  const slots = Array.from({ length: count }, (_, index) => ({
    index,
    x: gridFits ? originX + (index % candidates.columns) * (candidates.slotSize + gap) : width / 2,
    y: gridFits ? originY + Math.floor(index / candidates.columns) * (candidates.slotSize + gap) : height / 2,
    size: candidates.slotSize,
  }));

  return { ...candidates, slots };
}
