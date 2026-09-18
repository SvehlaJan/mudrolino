import assert from 'node:assert/strict';
import { recordingTransition, type RecorderState } from './recordingState';

const paths: RecorderState[][] = [
  ['idle', 'requesting', 'recording', 'processing', 'saved', 'idle'],
  ['idle', 'requesting', 'error', 'idle'],
  ['idle', 'requesting', 'recording', 'cancelled', 'idle'],
  ['idle', 'requesting', 'recording', 'processing', 'error', 'idle'],
  ['idle', 'requesting', 'cancelled', 'idle'],
  ['idle', 'requesting', 'recording', 'processing', 'cancelled', 'idle'],
];
for (const path of paths) {
  let state: RecorderState = 'idle';
  for (const next of path.slice(1)) {
    state = recordingTransition(state, next);
    assert.equal(state, next);
  }
}
assert.equal(recordingTransition('idle', 'saved'), 'idle');
assert.equal(recordingTransition('cancelled', 'saved'), 'cancelled');
assert.equal(recordingTransition('error', 'recording'), 'error');
console.log('recordingState: 9 contracts passed');
