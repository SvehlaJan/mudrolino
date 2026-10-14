import { describe, expect, it } from 'vitest';
import { createAssemblyBoard, moveTileToSlot, returnTileToTray } from './assemblyLogic';

function board() {
  let id = 0;
  return createAssemblyBoard(['ma', 'ma', 'da'], () => String(id++), tiles => tiles);
}

describe('assembly targeted placement', () => {
  it('places a tile into the requested slot without filling earlier holes or mutating the source', () => {
    const original = board();
    const next = moveTileToSlot(original, '1', 2);
    expect(next.placedTiles.map(tile => tile?.id ?? null)).toEqual([null, null, '1']);
    expect(next.trayTiles.map(tile => tile.id)).toEqual(['0', '2']);
    expect(original.placedTiles).toEqual([null, null, null]);
    expect(original.trayTiles).toHaveLength(3);
  });

  it('rejects occupied, out-of-bounds, non-integer and missing targets without losing tiles', () => {
    const placed = moveTileToSlot(board(), '0', 1);
    for (const slot of [-1, 3, 0.5, NaN, 1]) expect(moveTileToSlot(placed, '2', slot)).toBe(placed);
    expect(moveTileToSlot(placed, 'missing', 0)).toBe(placed);
    expect(moveTileToSlot(placed, '0', 0)).toBe(placed);
  });

  it('returns the exact repeated syllable to its original tray order and allows replacement', () => {
    const placed = moveTileToSlot(board(), '1', 2);
    const returned = returnTileToTray(placed, 2);
    expect(returned.trayTiles.map(tile => tile.id)).toEqual(['0', '1', '2']);
    expect(moveTileToSlot(returned, '1', 0).placedTiles[0]?.id).toBe('1');
  });
});
