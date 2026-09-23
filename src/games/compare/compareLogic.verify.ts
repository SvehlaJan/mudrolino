import { createComparisonRound, formatComparison, pairKey } from './compareLogic';
import type { NumberItem } from '../../shared/types';

const items: NumberItem[] = Array.from(
  { length: 10 },
  (_, index) => ({ value: index + 1, audioKey: String(index + 1) }),
);

const round = createComparisonRound(items, () => 0);
if (round.left.value === round.right.value) throw new Error('comparison sides must differ');
if (round.correctSide !== (round.left.value > round.right.value ? 'left' : 'right')) {
  throw new Error('wrong side');
}
if (pairKey(4, 2) !== pairKey(2, 4)) throw new Error('pair key must be order independent');
if (formatComparison('sk', 4, 2) !== '4 je viac ako 2') throw new Error('Slovak result changed');
if (formatComparison('cs', 4, 2) !== '4 je více než 2') throw new Error('Czech result changed');

let rejectedDuplicateValues = false;
try {
  createComparisonRound([
    { value: 1, audioKey: 'one' },
    { value: 1, audioKey: 'one-again' },
  ]);
} catch (error) {
  rejectedDuplicateValues = error instanceof Error && error.message.includes('distinct');
}
if (!rejectedDuplicateValues) throw new Error('duplicate values must explain why a comparison cannot start');

console.log('✓ comparison logic passed');
