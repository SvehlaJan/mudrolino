import { getAssemblySelectionAudioDecision, shouldPlaySelectedSyllableAudio } from './assemblyAudioLogic';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

const correctBoard = [{ text: 'ja' }, { text: 'ho' }, { text: 'da' }];
const wrongBoard = [{ text: 'ja' }, { text: 'da' }, { text: 'ho' }];
const correctSyllables = ['ja', 'ho', 'da'];

// --- Explicit decision seam: the single source of truth for the audio exception ---
assert(
  getAssemblySelectionAudioDecision({
    placingLastTile: false,
    nextPlaced: [{ text: 'ja' }, null, null],
    correctSyllables,
  }) === 'selected-now',
  'a non-final tile always plays its own audio immediately',
);

assert(
  getAssemblySelectionAudioDecision({
    placingLastTile: true,
    nextPlaced: correctBoard,
    correctSyllables,
  }) === 'selected-now',
  'a correct final tile plays its own audio immediately, before shared praise',
);

assert(
  getAssemblySelectionAudioDecision({
    placingLastTile: true,
    nextPlaced: wrongBoard,
    correctSyllables,
  }) === 'defer-to-wrong-sequence',
  'a wrong final tile defers to the bespoke wrong-answer sequence, which owns it exactly once',
);

console.log('✓ getAssemblySelectionAudioDecision explicit cases passed');

// --- Boolean-helper compatibility coverage (existing behavior, unchanged) ---
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
