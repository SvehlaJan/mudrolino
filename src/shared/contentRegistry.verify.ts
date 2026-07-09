import { getItemAudioClip, getWrongAnswerAudio } from './contentRegistry';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const itemClip = getItemAudioClip('sk', 'letters', 'a', 'A');
assert(itemClip.path === 'sk/letters/a', 'item clip builds the correct locale/category/audioKey path');
assert(itemClip.fallbackText === 'A', 'item clip preserves the given fallback text');

const wrongAudio = getWrongAnswerAudio('sk', 'numbers', '3', '3');
assert(wrongAudio.clips.length === 2, 'wrong-answer audio has exactly two clips');
assert(wrongAudio.clips[0].path === 'sk/numbers/3', 'wrong-answer audio reads the selected item first');
assert(wrongAudio.clips[0].fallbackText === '3', 'wrong-answer audio item clip keeps its fallback text');
assert(wrongAudio.clips[1].path === 'sk/phrases/skus-to-znova', 'wrong-answer audio ends with the retry phrase');
assert(wrongAudio.clips[1].fallbackText === 'Skús to znova.', 'retry clip keeps its fallback text');

console.log('contentRegistry answer-audio checks passed');
