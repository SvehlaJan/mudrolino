import { PraiseEntry } from '../types';
import { getSessionCompleteAudioSpec } from './sessionCompleteAudio';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const praise: PraiseEntry = {
  emoji: '🎉',
  text: 'Skvelá práca!',
  audioKey: 'skvela-praca',
};

const audioSpec = getSessionCompleteAudioSpec('sk', praise);

assert(audioSpec.clips.length === 1, 'session complete audio contains one praise clip');
assert(audioSpec.clips[0].path === 'sk/praise/skvela-praca', 'praise audio path matches selected praise');
assert(audioSpec.clips[0].fallbackText === 'Skvelá práca!', 'praise fallback text matches selected praise');

console.log('sessionCompleteAudio checks passed');
