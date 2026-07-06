import { shouldPlaySelectedSyllableAudio } from './assemblyAudioLogic';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

const correctBoard = [{ text: 'ja' }, { text: 'ho' }, { text: 'da' }];
const wrongBoard = [{ text: 'ja' }, { text: 'da' }, { text: 'ho' }];
const correctSyllables = ['ja', 'ho', 'da'];

assert(
  shouldPlaySelectedSyllableAudio({
    placingLastTile: false,
    nextPlaced: [{ text: 'ja' }, null, null],
    correctSyllables,
  }),
  'non-final placed syllables are spoken immediately',
);

assert(
  shouldPlaySelectedSyllableAudio({
    placingLastTile: true,
    nextPlaced: correctBoard,
    correctSyllables,
  }),
  'final syllable is spoken when it completes the correct word',
);

assert(
  !shouldPlaySelectedSyllableAudio({
    placingLastTile: true,
    nextPlaced: wrongBoard,
    correctSyllables,
  }),
  'wrong final syllable is left to the wrong-answer audio sequence',
);

console.log('assemblyAudioLogic checks passed');
