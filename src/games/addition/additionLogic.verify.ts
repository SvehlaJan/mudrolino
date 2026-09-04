/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { buildAnswerOptions, createAdditionProblem, pairKey, toNumberItem } from './additionLogic';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

// toNumberItem
assert(toNumberItem(7).value === 7, 'toNumberItem keeps the value');
assert(toNumberItem(7).audioKey === '7', 'toNumberItem derives audioKey from value');
assert(toNumberItem(47).audioKey === '47', 'toNumberItem works beyond the recorded 1-20 range');

// pairKey
assert(pairKey(2, 3) === pairKey(3, 2), 'pairKey is order-independent');
assert(pairKey(2, 3) !== pairKey(2, 4), 'pairKey differs for different pairs');

// createAdditionProblem: deterministic random for exact assertions
const problem = createAdditionProblem(10, () => 0); // random()=0 picks the minimum of every range
assert(problem.sum.value === 2, `random=0 should pick the minimum sum (2), got ${problem.sum.value}`);
assert(problem.a.value === 1, `random=0 should pick the minimum addend (1), got ${problem.a.value}`);
assert(problem.b.value === 1, `1 + 1 should equal the sum, got a=${problem.a.value} b=${problem.b.value}`);

const problemMax = createAdditionProblem(10, () => 0.999999);
assert(problemMax.sum.value === 10, `random~1 should pick the maximum sum (10), got ${problemMax.sum.value}`);
assert(problemMax.a.value + problemMax.b.value === problemMax.sum.value, 'addends always sum to the target');

// createAdditionProblem: randomized invariants across every configured range
for (const sumRange of [5, 10, 20, 100]) {
  for (let i = 0; i < 200; i++) {
    const p = createAdditionProblem(sumRange);
    assert(p.a.value >= 1 && p.b.value >= 1, `addends must be >= 1, got a=${p.a.value} b=${p.b.value}`);
    assert(p.sum.value >= 2 && p.sum.value <= sumRange, `sum ${p.sum.value} out of [2, ${sumRange}]`);
    assert(p.a.value + p.b.value === p.sum.value, `addends must sum to the target: ${p.a.value}+${p.b.value}!==${p.sum.value}`);
    assert(p.sum.audioKey === String(p.sum.value), 'sum audioKey matches its value');
  }
}

assert(
  (() => { try { createAdditionProblem(1); return false; } catch { return true; } })(),
  'sumRange < 2 throws',
);

// buildAnswerOptions: always 4 distinct, in-range options across every configured range,
// including sums sitting right at the edges (where the near-miss band alone isn't enough).
for (const sumRange of [5, 10, 20, 100]) {
  for (let i = 0; i < 200; i++) {
    const problem = createAdditionProblem(sumRange);
    const options = buildAnswerOptions(problem.sum, sumRange, 4);
    assert(options.length === 4, `expected 4 options, got ${options.length} for sumRange=${sumRange} sum=${problem.sum.value}`);
    assert(
      options.some((o) => o.value === problem.sum.value),
      'the correct sum must be among the options',
    );
    const uniqueValues = new Set(options.map((o) => o.value));
    assert(uniqueValues.size === 4, `options must be distinct, got ${[...uniqueValues]}`);
    for (const option of options) {
      assert(option.value >= 1 && option.value <= sumRange, `option ${option.value} out of [1, ${sumRange}]`);
    }
  }
}

// buildAnswerOptions: near-miss band actually engages when there's ample room (sum comfortably
// inside a large range) — at least one distractor should land within the offset band, not just
// anywhere in [1, sumRange].
{
  const sum = toNumberItem(50);
  const options = buildAnswerOptions(sum, 100, 4);
  const offsetMax = Math.max(2, Math.ceil(100 / 10)); // 10
  const distractors = options.filter((o) => o.value !== 50);
  const nearCount = distractors.filter((o) => Math.abs(o.value - 50) <= offsetMax).length;
  assert(nearCount >= 1, 'at least one distractor should land within the near-miss band when there is ample room');
}

// buildAnswerOptions: sum at the very top of the smallest configured range still produces
// a full set of distinct options, via the pass-2 fallback (the near-miss band alone can't,
// since half the offsets would go above the range ceiling).
{
  const sum = toNumberItem(5);
  const options = buildAnswerOptions(sum, 5, 4);
  assert(options.length === 4, 'edge-of-range sums must still produce a full set of options via the fallback pass');
  assert(new Set(options.map((o) => o.value)).size === 4, 'edge-of-range options must be distinct');
}

// buildAnswerOptions: genuinely too-small a range (fewer distinct values than options needed)
// still returns a short result rather than looping forever or crashing.
const tinyOptions = buildAnswerOptions(toNumberItem(2), 2, 4);
assert(tinyOptions.length === 1 && tinyOptions[0].value === 2, 'falls back to just the sum when the range has too few distinct values overall');

console.log('additionLogic verify tests passed successfully!');
