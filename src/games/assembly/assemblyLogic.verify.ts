import {
  AssemblyBoard,
  createAssemblyBoard,
  getCorrectTileOrder,
  isAssemblyBoardComplete,
  isAssemblyBoardCorrect,
  moveTileToFirstOpenSlot,
  returnTileToTray,
} from './assemblyLogic';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

// --- Baseline scenario from the plan: duplicate syllables ---
let nextId = 0;
const board = createAssemblyBoard(['ma', 'ma'], () => `tile-${nextId++}`, items => [...items].reverse());
assert(board.trayTiles.length === 2, 'duplicate syllables keep distinct tiles');
assert(new Set(board.trayTiles.map(tile => tile.id)).size === 2, 'tile IDs are unique');

const correctOrder = getCorrectTileOrder(board, ['ma', 'ma']);
const firstMove = moveTileToFirstOpenSlot(board, correctOrder[0]);
assert(firstMove.placedTiles[0]?.id === correctOrder[0], 'first tap fills first open slot');
const returned = returnTileToTray(firstMove, 0);
assert(returned.placedTiles[0] === null, 'placed tap empties its slot');
assert(returned.trayTiles.some(tile => tile.id === correctOrder[0]), 'returned tile re-enters tray');

const full = correctOrder.reduce(moveTileToFirstOpenSlot, board);
assert(isAssemblyBoardComplete(full), 'all occupied slots form a complete board');
assert(isAssemblyBoardCorrect(full, ['ma', 'ma']), 'duplicate-syllable word validates');
assert(!isAssemblyBoardCorrect(board, ['ma', 'ma']), 'partial board is never correct');
console.log('✓ assembly board logic passed');

// --- Two-syllable word: full happy path ---
{
  let id = 0;
  const makeId = () => `two-${id++}`;
  const syllables = ['au', 'to'];
  const twoBoard = createAssemblyBoard(syllables, makeId, items => [...items].reverse());
  assert(twoBoard.trayTiles.length === 2, 'two-syllable word creates two tray tiles');
  assert(
    twoBoard.placedTiles.length === 2 && twoBoard.placedTiles.every(slot => slot === null),
    'two-syllable board starts empty',
  );

  const order = getCorrectTileOrder(twoBoard, syllables);
  const afterFirst = moveTileToFirstOpenSlot(twoBoard, order[0]);
  const afterSecond = moveTileToFirstOpenSlot(afterFirst, order[1]);
  assert(isAssemblyBoardComplete(afterSecond), 'two-syllable board fills both slots');
  assert(isAssemblyBoardCorrect(afterSecond, syllables), 'two-syllable board in correct order validates');
  console.log('✓ two-syllable word completes correctly');
}

// --- Three-syllable word with a repeated syllable: full happy path ---
{
  let id = 0;
  const makeId = () => `three-${id++}`;
  const syllables = ['ba', 'na', 'na'];
  const threeBoard = createAssemblyBoard(syllables, makeId, items => [...items].reverse());
  assert(threeBoard.trayTiles.length === 3, 'three-syllable word creates three tray tiles');

  const order = getCorrectTileOrder(threeBoard, syllables);
  const filled = order.reduce(moveTileToFirstOpenSlot, threeBoard);
  assert(isAssemblyBoardComplete(filled), 'three-syllable board fills all three slots');
  assert(isAssemblyBoardCorrect(filled, syllables), 'three-syllable board with a repeated syllable validates in order');
  console.log('✓ three-syllable word with a repeated syllable completes correctly');
}

// --- Wrong order never validates, even when the board is complete ---
{
  let id = 0;
  const makeId = () => `wrong-${id++}`;
  const syllables = ['ja', 'ho', 'da'];
  const wrongBoard = createAssemblyBoard(syllables, makeId, items => items);
  const wrongTileOrderIds = [
    wrongBoard.trayTiles.find(tile => tile.text === 'ho')!.id,
    wrongBoard.trayTiles.find(tile => tile.text === 'ja')!.id,
    wrongBoard.trayTiles.find(tile => tile.text === 'da')!.id,
  ];
  const wrongFilled = wrongTileOrderIds.reduce(moveTileToFirstOpenSlot, wrongBoard);
  assert(isAssemblyBoardComplete(wrongFilled), 'wrong-order board is still complete');
  assert(!isAssemblyBoardCorrect(wrongFilled, syllables), 'wrong tile order never validates as correct');
  console.log('✓ wrong tile order is complete but not correct');
}

// --- Tapping a nonexistent tile id is a no-op ---
{
  let id = 0;
  const makeId = () => `noop-${id++}`;
  const syllables = ['ko', 'ra'];
  const noopBoard = createAssemblyBoard(syllables, makeId, items => items);
  const untouched = moveTileToFirstOpenSlot(noopBoard, 'does-not-exist');
  assert(untouched === noopBoard, 'moving a nonexistent tile id returns the same board unchanged');
  console.log('✓ nonexistent tile id is a no-op');
}

// --- A full rail rejects a valid tray tile that has nowhere to land ---
{
  const fullRailBoard: AssemblyBoard = {
    trayTiles: [{ id: 'stray-tile', text: 'zz', trayIndex: 0 }],
    placedTiles: [
      { id: 'placed-1', text: 'aa', trayIndex: 1 },
      { id: 'placed-2', text: 'bb', trayIndex: 2 },
    ],
  };
  const stillFullRail = moveTileToFirstOpenSlot(fullRailBoard, 'stray-tile');
  assert(stillFullRail === fullRailBoard, 'a full rail rejects a valid tray tile with no open slot');
  console.log('✓ full rail rejects placement even for a tile that exists in the tray');
}

// --- Repeated taps on the same tile id: the second tap is a no-op ---
{
  let id = 0;
  const makeId = () => `repeat-${id++}`;
  const syllables = ['sy', 'la', 'ba'];
  const repeatBoard = createAssemblyBoard(syllables, makeId, items => items);
  const tileId = repeatBoard.trayTiles[0].id;
  const afterFirstTap = moveTileToFirstOpenSlot(repeatBoard, tileId);
  assert(afterFirstTap.trayTiles.every(tile => tile.id !== tileId), 'placed tile leaves the tray');
  const afterSecondTap = moveTileToFirstOpenSlot(afterFirstTap, tileId);
  assert(afterSecondTap === afterFirstTap, 'repeated tap on an already-placed tile id is a no-op');
  console.log('✓ repeated tile taps are idempotent no-ops');
}

// --- Returning an already-empty slot is a no-op ---
{
  let id = 0;
  const makeId = () => `empty-${id++}`;
  const syllables = ['aa', 'bb'];
  const emptySlotBoard = createAssemblyBoard(syllables, makeId, items => items);
  const untouched = returnTileToTray(emptySlotBoard, 0);
  assert(untouched === emptySlotBoard, 'returning an already-empty slot is a no-op');
  console.log('✓ returning an empty slot is a no-op');
}

console.log('✓ all assembly board logic checks passed');
