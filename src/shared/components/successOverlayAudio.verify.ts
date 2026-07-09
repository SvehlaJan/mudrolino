import { getSuccessOverlayAudioSpec } from './successOverlayAudio';
import { PraiseEntry, SuccessSpec } from '../types';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

const displayedPraise: PraiseEntry = {
  emoji: '⭐',
  text: 'Skvelá práca!',
  audioKey: 'skvela-praca',
};

const spec: SuccessSpec = {
  echoLine: 'ja-ho-da 🍓',
  audioSpec: {
    clips: [{ path: 'sk/words/jahoda', fallbackText: 'Jahoda' }],
  },
};

const audioSpec = getSuccessOverlayAudioSpec('sk', displayedPraise, spec);

assert(audioSpec.clips.length === 2, 'success audio includes echo and praise audio');
assert(audioSpec.clips[0].path === 'sk/words/jahoda', 'echo audio plays first');
assert(audioSpec.clips[1].path === 'sk/praise/skvela-praca', 'praise audio matches displayed praise');
assert(audioSpec.clips[1].fallbackText === 'Skvelá práca!', 'praise fallback text matches displayed praise');

console.log('successOverlayAudio checks passed');
