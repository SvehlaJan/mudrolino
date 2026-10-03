import { describe, expect, it } from 'vitest';
import { filterComponents } from './filterComponents';

const entries = [
  { name: 'TactilePiece', source: 'src/shared/game/materials/TactilePiece.tsx', category: 'materials', exported: true, usages: ['src/games/assembly/AssemblyGame.tsx'] },
  { name: 'WordEditor', source: 'src/content/WordEditor.tsx', category: 'content', exported: true, usages: ['src/content/CustomContentScreen.tsx'] },
];
describe('gallery discovery', () => {
  it('searches case-insensitively across names, source paths and actual usage paths', () => {
    expect(filterComponents(entries, '  TACTILE  ', 'all')).toEqual([entries[0]]);
    expect(filterComponents(entries, 'src/content/WordEditor', 'all')).toEqual([entries[1]]);
    expect(filterComponents(entries, 'assembly', 'all')).toEqual([entries[0]]);
  });
  it('combines category and query, preserving source-only entries and empty results', () => {
    expect(filterComponents(entries, '', 'materials')).toEqual([entries[0]]);
    expect(filterComponents(entries, 'tactile', 'content')).toEqual([]);
    expect(filterComponents(entries, 'not-a-component', 'all')).toEqual([]);
    expect(filterComponents([{ ...entries[0], usages: [] }], '', 'all')).toHaveLength(1);
  });
});
