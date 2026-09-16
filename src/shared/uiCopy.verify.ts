import { GAME_DEFINITIONS } from './gameCatalog';
import { getUiCopy } from './uiCopy';

if (getUiCopy('sk', 'category.literacy') !== 'Písmená a slová') {
  throw new Error('Slovak literacy label missing');
}
if (getUiCopy('cs', 'game.alphabet.title') !== 'Abeceda') {
  throw new Error('Stub locale must fall back to Slovak');
}

// Every game definition title, instruction, and play button must resolve and fall back in Czech
for (const game of GAME_DEFINITIONS) {
  const skTitle = getUiCopy('sk', game.titleKey);
  const csTitle = getUiCopy('cs', game.titleKey);
  if (!csTitle || csTitle !== skTitle) {
    throw new Error(`Czech title fallback missing or mismatch for ${game.id}`);
  }
  const skInstruction = getUiCopy('sk', game.instructionKey);
  const csInstruction = getUiCopy('cs', game.instructionKey);
  if (!csInstruction || csInstruction !== skInstruction) {
    throw new Error(`Czech instruction fallback missing or mismatch for ${game.id}`);
  }
}

if (getUiCopy('cs', 'lobby.play') !== 'Hrať') {
  throw new Error('Czech lobby.play fallback missing or mismatch');
}

// Arbitrary unknown locale also falls back to Slovak
if (getUiCopy('unknown-locale', 'game.alphabet.title') !== 'Abeceda') {
  throw new Error('Unknown locale must fall back to Slovak');
}

console.log('✓ UI copy fallback passed');
