import type { NumberItem } from '../../shared/types';

export type ComparisonSide = 'left' | 'right';

export interface ComparisonRound {
  left: NumberItem;
  right: NumberItem;
  correctSide: ComparisonSide;
}

export function pairKey(left: number, right: number): string {
  return [left, right].sort((a, b) => a - b).join('-');
}

export function formatComparison(locale: string, larger: number, smaller: number): string {
  return locale === 'cs'
    ? `${larger} je více než ${smaller}`
    : `${larger} je viac ako ${smaller}`;
}

/**
 * Chooses two different numerical values using an injectable Fisher–Yates shuffle so callers can
 * make a round reproducible in tests without coupling the component to a random implementation.
 */
export function createComparisonRound(
  items: readonly NumberItem[],
  random: () => number = Math.random,
): ComparisonRound {
  const distinctItems = Array.from(
    new Map(items.map(item => [item.value, item])).values(),
  );
  if (distinctItems.length < 2) {
    throw new Error('Comparison needs at least two distinct numerical values.');
  }

  const shuffled = [...distinctItems];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }

  const [left, right] = shuffled;
  return {
    left,
    right,
    correctSide: left.value > right.value ? 'left' : 'right',
  };
}
