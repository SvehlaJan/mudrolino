import { describe, expect, it } from 'vitest';
import { getLocaleContent } from '../../src/shared/contentRegistry';
import { describePending, labelFor, planTakes, toSessionFile } from './recordingPlan';

describe('labelFor', () => {
  it('reads what each category plays', () => {
    const cs = getLocaleContent('cs');
    expect(labelFor(cs, 'letters', 'r-caron')).toBe('Ř');
    expect(labelFor(cs, 'numbers', '7')).toBe('7');
    expect(labelFor(cs, 'words', 'babicka')).toBe('Babička');
    expect(labelFor(cs, 'phrases', 'na-jake-pismenko-zacina')).toBe('Na jaké písmenko začíná?');
    expect(labelFor(cs, 'syllables', 'bič')).toBe('BIČ');
    expect(labelFor(cs, 'words', 'missing')).toBeNull();
  });
});

describe('describePending', () => {
  it('keeps paths the content still plays and reports the rest', () => {
    const { clips, unknown } = describePending(
      ['sk/words/raketa.mp3', 'cs/praise/vyborne.mp3', 'sk/words/gone.mp3', 'not-a-path'],
      getLocaleContent,
    );
    expect(clips.map(clip => [clip.path, clip.label])).toEqual([
      ['sk/words/raketa.mp3', 'Raketa'],
      ['cs/praise/vyborne.mp3', 'Výborně!'],
    ]);
    expect(unknown).toEqual(['sk/words/gone.mp3', 'not-a-path']);
  });
});

describe('planTakes', () => {
  const clip = (category: string, index: number, locale = 'cs') => ({
    path: `${locale}/${category}/${index}.mp3`, locale, category, key: String(index), label: `${category} ${index}`,
  });

  it('orders categories from short items to syllables and splits long ones', () => {
    const clips = [
      ...Array.from({ length: 30 }, (_, index) => clip('syllables', index)),
      clip('words', 1),
      clip('letters', 1),
      clip('letters', 2, 'sk'),
    ];
    const takes = planTakes('cs', clips, 25);
    expect(takes.map(take => [take.name, take.clips.length])).toEqual([
      ['cs-01-letters', 1],
      ['cs-02-words', 1],
      ['cs-03-syllables-1', 25],
      ['cs-04-syllables-2', 5],
    ]);
    expect(takes[2].title).toBe('Slabiky (1/2)');
  });

  it('writes the path and the text to read on each line', () => {
    const [take] = planTakes('cs', [clip('words', 1)]);
    expect(toSessionFile(take)).toBe('cs/words/1.mp3\twords 1\n');
  });
});
