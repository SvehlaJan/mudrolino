/**
 * Pure, immutable board-state transitions for the Assembly ("Skladaj") game.
 *
 * No DOM, no GSAP, no React — AssemblyGame.tsx owns presentation and calls
 * these functions to compute the next board state.
 */

export interface AssemblyTile {
  id: string;
  text: string;
  trayIndex: number;
}

export interface AssemblyBoard {
  trayTiles: AssemblyTile[];
  placedTiles: (AssemblyTile | null)[];
}

export type ShuffleTiles = (tiles: AssemblyTile[]) => AssemblyTile[];

export function createAssemblyBoard(
  syllables: string[],
  makeId: () => string,
  shuffle: ShuffleTiles,
): AssemblyBoard {
  const ordered = syllables.map((text, trayIndex) => ({ id: makeId(), text, trayIndex }));
  return { trayTiles: shuffle(ordered), placedTiles: ordered.map(() => null) };
}

export function moveTileToFirstOpenSlot(board: AssemblyBoard, tileId: string): AssemblyBoard {
  const tile = board.trayTiles.find(candidate => candidate.id === tileId);
  const slotIndex = board.placedTiles.findIndex(candidate => candidate === null);
  if (!tile || slotIndex < 0) return board;
  const placedTiles = [...board.placedTiles];
  placedTiles[slotIndex] = tile;
  return {
    trayTiles: board.trayTiles.filter(candidate => candidate.id !== tileId),
    placedTiles,
  };
}

export function returnTileToTray(board: AssemblyBoard, slotIndex: number): AssemblyBoard {
  const tile = board.placedTiles[slotIndex];
  if (!tile) return board;
  const placedTiles = [...board.placedTiles];
  placedTiles[slotIndex] = null;
  return {
    trayTiles: [...board.trayTiles, tile].sort((a, b) => a.trayIndex - b.trayIndex),
    placedTiles,
  };
}

export function isAssemblyBoardComplete(board: AssemblyBoard): boolean {
  return board.placedTiles.every(tile => tile !== null);
}

export function isAssemblyBoardCorrect(board: AssemblyBoard, correctSyllables: string[]): boolean {
  return isAssemblyBoardComplete(board)
    && board.placedTiles.every((tile, index) => tile?.text === correctSyllables[index]);
}

export function getCorrectTileOrder(board: AssemblyBoard, correctSyllables: string[]): string[] {
  const remaining = [...board.trayTiles, ...board.placedTiles.filter((tile): tile is AssemblyTile => tile !== null)];
  return correctSyllables.map(symbol => {
    const index = remaining.findIndex(tile => tile.text === symbol);
    if (index < 0) throw new Error(`Missing assembly tile for ${symbol}`);
    return remaining.splice(index, 1)[0].id;
  });
}
