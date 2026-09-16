import { mergeE2EState } from './e2eState';

const unlock = () => undefined;
const withGate = mergeE2EState(
  { overlay: null, correctItemId: 'A' },
  { parentGate: { answer: 4, unlock, errorRecoveries: 0 } },
);
const withGameUpdate = mergeE2EState(withGate, { overlay: 'success' });

if (withGameUpdate.overlay !== 'success') throw new Error('Overlay did not update');
if (withGameUpdate.correctItemId !== 'A') throw new Error('Game state was erased');
if (withGameUpdate.parentGate?.answer !== 4) throw new Error('Gate adapter was erased');
console.log('✓ E2E state merge contract passed');
