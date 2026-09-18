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

const gameShellCopy = {
  'game.replayPrompt': 'Zopakovať zadanie',
  'game.answerGroup': 'Možnosti odpovede',
  'game.continue': 'Pokračovať',
  'game.playAgain': 'Hrať znova',
  'game.home': 'Domov',
  'game.retryError': 'Skúsiť znova',
  'game.progress': 'Postup v hre',
  'game.retryPrompt': 'Skús ešte raz',
  'game.successTitle': 'Výborne!',
  'game.failureTitle': 'Nevadí, poďme ďalej',
  'game.completionTitle': 'Koniec hry',
  'game.retry.detail': 'Nevadí, počúvaj ešte raz.',
  'game.failure.detail': 'Správnu odpoveď si ukážeme spolu.',
  'game.error.title': 'Niečo sa nepodarilo.',
  'game.error.detail': 'Skúsime to ešte raz?',
} as const;

for (const [key, expected] of Object.entries(gameShellCopy) as Array<[keyof typeof gameShellCopy, string]>) {
  if (getUiCopy('sk', key) !== expected || getUiCopy('cs', key) !== expected) {
    throw new Error(`Game shell copy or Czech fallback missing for ${key}`);
  }
}

// Arbitrary unknown locale also falls back to Slovak
if (getUiCopy('unknown-locale', 'game.alphabet.title') !== 'Abeceda') {
  throw new Error('Unknown locale must fall back to Slovak');
}

console.log('✓ UI copy fallback passed');
