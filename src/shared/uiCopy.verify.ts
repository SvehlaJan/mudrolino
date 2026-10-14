import { GAME_DEFINITIONS } from './gameCatalog';
import { formatUiCopy, getUiCopy, type UiCopyKey } from './uiCopy';

if (getUiCopy('sk', 'category.literacy') !== 'Písmená a slová') {
  throw new Error('Slovak literacy label missing');
}

// Every game definition title, description and instruction resolves in both languages.
for (const game of GAME_DEFINITIONS) {
  for (const key of [game.titleKey, game.instructionKey] as UiCopyKey[]) {
    if (!getUiCopy('sk', key) || !getUiCopy('cs', key)) {
      throw new Error(`Copy missing for ${game.id}: ${key}`);
    }
  }
}

// Czech is translated, not a Slovak fallback.
const czechSamples: Array<[UiCopyKey, string]> = [
  ['lobby.play', 'Hrát'],
  ['game.alphabet.instruction', 'Najdi správné písmenko.'],
  ['game.compare.instruction', 'Kde je více?'],
  ['game.home', 'Domů'],
];
for (const [key, expected] of czechSamples) {
  if (getUiCopy('cs', key) !== expected) throw new Error(`Czech copy for ${key} should be "${expected}", got "${getUiCopy('cs', key)}"`);
}

const gameShellCopy = {
  'game.replayPrompt': 'Zopakovať zadanie',
  'game.promptSection': 'Zadanie',
  'game.replayingInstruction': 'Prehrávam zadanie…',
  'game.answerGroup': 'Možnosti odpovede',
  'game.playArea': 'Hracia plocha',
  'game.continue': 'Pokračovať',
  'game.playAgain': 'Hrať znova',
  'game.home': 'Domov',
  'game.retryError': 'Skúsiť znova',
  'game.progress': 'Postup v hre',
  'game.retryPrompt': 'Skús ešte raz',
  'game.piece.settledLabel': 'Uložené',
  'game.successTitle': 'Výborne!',
  'game.failureTitle': 'Nevadí, poďme ďalej',
  'game.completionTitle': 'Koniec hry',
  'game.taps': 'klepnutí',
  'game.paused': 'Hra je pozastavená.',
  'game.parentPause': 'Rodičovská prestávka',
  'game.unlock': 'Odomknúť',
  'game.retry.detail': 'Nevadí, počúvaj ešte raz.',
  'game.failure.detail': 'Správnu odpoveď si ukážeme spolu.',
  'game.error.title': 'Niečo sa nepodarilo.',
  'game.error.detail': 'Skúsime to ešte raz?',
  'game.error.emptyPool': 'Žiadne položky na hranie.',
} as const;

for (const [key, expected] of Object.entries(gameShellCopy) as Array<[keyof typeof gameShellCopy, string]>) {
  if (getUiCopy('sk', key) !== expected) {
    throw new Error(`Slovak game shell copy changed for ${key}`);
  }
}

// An unknown locale falls back to Slovak.
if (getUiCopy('unknown-locale', 'game.alphabet.title') !== 'Čítaj písmenká') {
  throw new Error('Unknown locale must fall back to Slovak');
}

if (formatUiCopy('cs', 'parent.backup.summary', { date: '1. 1.', recordings: 2, words: 3, praises: 4 })
  !== 'Záloha z 1. 1.: nahrávky 2, vlastní slova 3, vlastní pochvaly 4.') {
  throw new Error('Placeholders must be filled in the translated text');
}

console.log('✓ UI copy translation passed');
