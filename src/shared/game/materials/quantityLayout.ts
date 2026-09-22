export interface QuantityLayoutInput {
  count: number;
  width: number;
  height: number;
  gap: number;
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
