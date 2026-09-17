import { readFileSync } from 'node:fs';

function assert(value: boolean, message: string) { if (!value) throw new Error(message); }
function read(name: string) { return readFileSync(new URL(`./${name}`, import.meta.url), 'utf8'); }

const screen = read('CustomContentScreen.tsx');
const list = read('ContentItemList.tsx');

assert(screen.includes("word.enabled && word.status === 'ready'"), 'ready word count must exclude disabled rows');
assert(screen.includes("praise.enabled && praise.status === 'ready'"), 'ready praise count must exclude disabled rows');
assert(screen.includes('word.isDefault && !word.enabled'), 'word hidden count must use enabled state');
assert(screen.includes('praise.isDefault && !praise.enabled'), 'praise hidden count must use enabled state');
assert(screen.includes("label: 'Vypnúť'"), 'disabling a default must be reachable from its row menu');
assert(list.includes("Vypnuté (${disabledRows.length})"), 'the collapsed disabled section must show its count');
assert(list.includes('Obnoviť') && list.includes('Obnoviť všetko'), 'disabled defaults must offer individual and bulk restore');
assert(screen.includes('LAST_PLAYABLE_MESSAGE'), 'the last-playable guard message must be surfaced to parents');
assert(screen.includes('scheduleUndo'), 'consequential deletion must offer an undo path');
assert(screen.includes('restoreUndoWord') && screen.includes('restoreUndoPraise'), 'Undo must use guarded restore transactions');
assert(screen.includes('audioOverrideStore.get(storeKey)') && screen.includes('Obnovenie položky sa nepodarilo dokončiť.'), 'capture and restore failures must be parent-visible');

console.log('✓ custom content enabled-state seam passed');
