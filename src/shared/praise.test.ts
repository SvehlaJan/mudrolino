import { afterEach, expect, it, vi } from 'vitest';
import { pickPraise } from './praise';
import type { PraiseEntry } from './types';

afterEach(() => vi.restoreAllMocks());

it('keeps each selected praise as the original entry while consuming one random draw per choice', () => {
  const first: PraiseEntry = { text: 'Prvá pochvala', emoji: '⭐', audioKey: 'first' };
  const last: PraiseEntry = { text: 'Druhá pochvala', emoji: '🎉', audioKey: 'last' };
  const entries = Object.freeze([first, last]);
  const random = vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(0.999999);

  const roundPraise = pickPraise(entries);
  expect(roundPraise).toBe(first);
  const completionPraise = pickPraise(entries);
  expect(completionPraise).toBe(last);
  expect(roundPraise).toBe(first);
  expect(entries).toEqual([first, last]);
  expect(random).toHaveBeenCalledTimes(2);
});

it('keeps an empty praise pool playable without shifting the random sequence for the next choice', () => {
  const random = vi.spyOn(Math, 'random').mockReturnValueOnce(0.8).mockReturnValueOnce(0);
  const entry: PraiseEntry = { text: 'Pochvala', emoji: '🎉', audioKey: 'praise' };

  expect(pickPraise([])).toEqual({ emoji: '🌟', text: 'Výborne!', audioKey: 'vyborne' });
  expect(random).toHaveBeenCalledTimes(1);
  expect(pickPraise([entry])).toBe(entry);
  expect(random).toHaveBeenCalledTimes(2);
});
