import { describe, expect, it } from 'vitest';
import { filterCatalogAssets, type CatalogLibraryAsset } from './catalogLibrary';

function asset(id: string, overrides: Partial<CatalogLibraryAsset> = {}): CatalogLibraryAsset {
  return { id, label: id, category: 'tops', base: 'male', status: 'pending', statusDetail: '3D pending', fitVerified: false, accepted: false, history: false, references: [], sources: [], ...overrides };
}
const reference = { id: 'sheet', label: 'Blue shirt reference', url: '/sheet.png', thumbnailUrl: '/thumb.png' };
const model = { id: 'T02', label: 'Shirt', kind: 'piece' as const, status: 'Candidate', modelUrl: '/shirt.glb' };
const assets = [
  asset('T02', { label: 'Blue shirt', status: 'fit-verified', fitVerified: true, model, references: [reference], sources: [{ label: 'Native scene', path: 'assets/avatar/catalog/shirt.blend', url: '/shirt.blend', role: 'blend' }] }),
  asset('F01', { label: 'Female top', base: 'female', references: [reference] }),
  asset('S01', { base: 'shared', category: 'accessories', status: 'accepted', accepted: true }),
  asset('old', { history: true, model }),
];

describe('filterCatalogAssets', () => {
  it('hides earlier exports by default and explicitly includes history', () => {
    expect(filterCatalogAssets(assets, {}).map(a => a.id)).toEqual(['T02', 'F01', 'S01']);
    expect(filterCatalogAssets(assets, { history: true }).map(a => a.id)).toContain('old');
  });
  it('searches IDs, labels, source paths and reference labels without case sensitivity', () => {
    expect(filterCatalogAssets(assets, { query: ' t02 ' }).map(a => a.id)).toEqual(['T02']);
    expect(filterCatalogAssets(assets, { query: 'SHIRT.BLEND' }).map(a => a.id)).toEqual(['T02']);
    expect(filterCatalogAssets(assets, { query: 'female top' }).map(a => a.id)).toEqual(['F01']);
    expect(filterCatalogAssets(assets, { query: 'blue shirt reference' }).map(a => a.id)).toEqual(['T02', 'F01']);
  });
  it('composes category, base, representation, status and query as intersections', () => {
    expect(filterCatalogAssets(assets, { category: 'tops', base: 'male', format: '3d', status: 'fit-verified', query: 'blue' }).map(a => a.id)).toEqual(['T02']);
    expect(filterCatalogAssets(assets, { base: 'female', format: '3d' })).toEqual([]);
  });
  it('uses available references and models for representation, including assets with both', () => {
    expect(filterCatalogAssets(assets, { format: '2d' }).map(a => a.id)).toEqual(['T02', 'F01']);
    expect(filterCatalogAssets(assets, { format: '3d' }).map(a => a.id)).toEqual(['T02']);
  });
  it('keeps male, female and shared bases distinct', () => {
    for (const [base, id] of [['male', 'T02'], ['female', 'F01'], ['shared', 'S01']]) {
      expect(filterCatalogAssets(assets, { base }).map(a => a.id)).toEqual([id]);
    }
  });
  it('does not turn a verified fit into visual acceptance', () => {
    expect(filterCatalogAssets(assets, { status: 'accepted' }).map(a => a.id)).toEqual(['S01']);
    expect(filterCatalogAssets(assets, { status: 'fit-verified' }).map(a => a.id)).toEqual(['T02']);
  });
});
