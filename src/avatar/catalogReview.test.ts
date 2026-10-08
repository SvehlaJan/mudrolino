import { describe, expect, it } from 'vitest';
import type { CatalogItem, CatalogLibraryAsset } from './catalogLibrary';
import { catalogCardSummary, filterCatalogItems, selectCatalogItem, selectCatalogItemForFilters, splitCatalogSources } from './catalogReview';

const male: CatalogLibraryAsset = { id: 'T02', label: 'Male hoodie', category: 'tops', base: 'male', status: 'fit-verified', statusDetail: 'Recorded fit proof', accepted: false, fitVerified: true, history: false, references: [], sources: [], model: { id: 'T02', label: 'Male hoodie', kind: 'piece', status: 'Candidate', modelUrl: '/male.glb' }, supportsGait: true };
const female: CatalogLibraryAsset = { ...male, id: 'female-candidate', base: 'female', status: 'candidate', fitVerified: false, model: { ...male.model!, id: 'female-candidate', modelUrl: '/female.glb' } };
const item: CatalogItem = { id: 'T02', label: 'Orange hoodie', collection: 'wardrobe', category: 'tops', description: 'Pullover hoodie', relatedIds: ['capsule'], references: [{ id: 'construction', label: 'Hood details', url: '/details.png', thumbnailUrl: '/details-thumb.png' }], variants: [
  { id: 'male', label: 'Male fit', base: 'male', references: [], currentRevisionId: 'current', revisions: [{ id: 'old', label: 'Earlier hoodie', asset: male, visualReview: 'pending', technicalReview: 'not-verified' }, { id: 'current', label: 'Current male fit', asset: male, visualReview: 'pending', technicalReview: 'recorded-pass' }] },
  { id: 'female', label: 'Female fit', base: 'female', references: [{ id: 'female-ref', label: 'Female hoodie', url: '/ref.png', thumbnailUrl: '/ref-thumb.png' }], currentRevisionId: 'study', revisions: [{ id: 'study', label: 'Technical study', asset: female, visualReview: 'changes-requested', technicalReview: 'recorded-pass', reviewNote: 'Make hood fuller.' }] },
] };

describe('curated catalog review', () => {
  it('chooses the declared current revision, with focused base references first', () => {
    const result = selectCatalogItem(item, 'female');
    expect(result.revision?.id).toBe('study');
    expect(result.asset.model?.modelUrl).toBe('/female.glb');
    expect(result.asset.references.map(ref => ref.id)).toEqual(['female-ref', 'construction']);
    expect(result.asset.id).toBe('T02');
    expect(result.asset.label).toBe('Orange hoodie');
    expect(result.asset.model?.label).toBe('Orange hoodie · Female fit');
    expect(result.asset.model?.status).toBe('Technical study');
    expect(female.model?.status).toBe('Candidate');
    expect(result.asset.accepted).toBe(false);
  });
  it('allows earlier revisions without promoting them or confusing bases', () => {
    expect(selectCatalogItem(item, 'male', 'old').revision?.id).toBe('old');
    expect(selectCatalogItem(item, 'male', 'old').asset.history).toBe(true);
    expect(selectCatalogItem(item, 'male', 'current').asset.history).toBe(false);
    expect(selectCatalogItem(item, 'female', 'old').revision?.id).toBe('study');
    expect(selectCatalogItem(item, 'missing', 'missing').revision?.id).toBe('current');
  });
  it('shows missing fitted variants as pending rather than borrowing another base model', () => {
    const pending: CatalogItem = { ...item, variants: [...item.variants.slice(0, 1), { id: 'female', label: 'Female fit', base: 'female', references: [], revisions: [] }] };
    const result = selectCatalogItem(pending, 'female');
    expect(result.asset.status).toBe('pending');
    expect(result.asset.model).toBeUndefined();
    expect(result.asset.fitVerified).toBe(false);
    expect(filterCatalogItems([pending], { base: 'female', format: '3d' })).toEqual([]);
    expect(filterCatalogItems([pending], { base: 'male', format: '3d' })).toHaveLength(1);
  });
  it('filters designs by base-specific current model, collection and readable metadata', () => {
    expect(filterCatalogItems([item], { query: 'hood details', collection: 'wardrobe' })).toHaveLength(1);
    expect(filterCatalogItems([item], { collection: 'characters' })).toEqual([]);
    expect(filterCatalogItems([item], { base: 'female', status: 'candidate', format: '3d' })).toHaveLength(1);
    expect(filterCatalogItems([item], { base: 'female', status: 'fit-verified' })).toEqual([]);
  });
  it('starts a motion entry with its own clip on the selected compatible body', () => {
    const motion: CatalogItem = { ...item, id: 'walk', collection: 'animations', motion: { clip: 'walk', description: 'Relaxed looping walk', loop: true } };
    expect(selectCatalogItem(motion, 'female').asset.animation).toBe('walk');
    expect(selectCatalogItem(motion, 'female').asset.supportsGait).toBe(true);
  });
  it('filters art review separately from recorded technical success', () => {
    expect(filterCatalogItems([item], { base: 'female', status: 'changes-requested' })).toHaveLength(1);
    expect(filterCatalogItems([item], { base: 'female', status: 'needs-review' })).toEqual([]);
    expect(filterCatalogItems([item], { base: 'male', status: 'needs-review' })).toHaveLength(1);
    expect(filterCatalogItems([item], { status: 'approved' })).toEqual([]);
    const reference: CatalogItem = { ...item, variants: [{ id: 'female', label: 'Female', base: 'female', references: [], revisions: [] }] };
    expect(filterCatalogItems([reference], { status: 'reference-only' })).toHaveLength(1);
  });
  it('opens the variant that actually matched the gallery filters', () => {
    expect(selectCatalogItemForFilters(item, { status: 'changes-requested' }).variant?.id).toBe('female');
    expect(selectCatalogItemForFilters(item, { query: 'make hood fuller' }).variant?.id).toBe('female');
    const onlyFemale: CatalogItem = { ...item, variants: [{ ...item.variants[0], revisions: [], currentRevisionId: undefined }, item.variants[1]] };
    expect(selectCatalogItemForFilters(onlyFemale, { format: '3d' }).variant?.id).toBe('female');
  });
  it('summarizes availability for the filtered base and respects art approval', () => {
    const approved: CatalogItem = { ...item, variants: [{ ...item.variants[0], revisions: item.variants[0].revisions.map(value => ({ ...value, visualReview: 'approved' })) }, { ...item.variants[1], revisions: [], currentRevisionId: undefined }] };
    expect(catalogCardSummary(approved, selectCatalogItem(approved, 'female'), 'female')).toEqual({ modelLabels: [], reviewLabel: 'Reference only', needsAttention: false });
    expect(catalogCardSummary(approved, selectCatalogItem(approved, 'male'), 'male').reviewLabel).toBe('Art approved');
    expect(catalogCardSummary(item, selectCatalogItem(item, 'male'), 'male').reviewLabel).toBe('Awaiting art review');
    expect(catalogCardSummary(item, selectCatalogItem(item, 'female'), 'female').reviewLabel).toBe('Changes requested');
  });
  it('keeps historical sources in their own group rather than current proof', () => {
    const grouped = splitCatalogSources([
      { label: 'outfit.blend', path: 'assets/avatar/candidate/outfit.blend', url: '/source', role: 'blend' },
      { label: 'fit.json', path: 'assets/avatar/candidate/fit-report.json', url: '/proof', role: 'report' },
      { label: 'old.json', path: 'assets/avatar/candidate/history/fit-report.json', url: '/old', role: 'report' },
      { label: 'rejected.glb', path: 'assets/avatar/candidate/rejected-fold/outfit.glb', url: '/rejected', role: 'model' },
    ]);
    expect(grouped.construction.map(source => source.url)).toEqual(['/source']);
    expect(grouped.proof.map(source => source.url)).toEqual(['/proof']);
    expect(grouped.history.map(source => source.url)).toEqual(['/old', '/rejected']);
  });
});
