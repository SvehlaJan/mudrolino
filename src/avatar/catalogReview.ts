import type { CatalogItem, CatalogItemRevision, CatalogItemVariant, CatalogLibraryAsset, CatalogLibraryFilters, CatalogSource } from './catalogLibrary';

export interface CatalogSelection { variant?: CatalogItemVariant; revision?: CatalogItemRevision; asset: CatalogLibraryAsset }
export function selectCatalogItem(item: CatalogItem, variantId?: string, revisionId?: string): CatalogSelection {
  const variant = item.variants.find(value => value.id === variantId)
    ?? item.variants.find(value => value.revisions.some(revision => revision.id === value.currentRevisionId && revision.asset.model))
    ?? item.variants[0];
  const revision = variant?.revisions.find(value => value.id === revisionId)
    ?? variant?.revisions.find(value => value.id === variant.currentRevisionId)
    ?? variant?.revisions[0];
  const references = [...new Map([...(variant?.references ?? []), ...item.references].map(reference => [reference.id, reference])).values()];
  const fallback: CatalogLibraryAsset = { id: item.id, label: item.label, category: item.category, base: variant?.base ?? 'unspecified', status: 'pending', statusDetail: item.description, fitVerified: false, accepted: false, history: false, references, sources: [] };
  const asset: CatalogLibraryAsset = { ...(revision?.asset ?? fallback), id: item.id, label: item.label, category: item.category, base: variant?.base ?? fallback.base, statusDetail: item.description, references, history: !!revision && revision.id !== variant?.currentRevisionId,
    ...(revision?.asset.model ? { model: { ...revision.asset.model, label: `${item.label} · ${variant?.label ?? '3D'}`, status: revision.label } } : {}),
    ...(item.motion && revision?.asset.supportsGait ? { animation: item.motion.clip } : {}) };
  return { variant, revision, asset };
}
function matchingSelections(item: CatalogItem, filters: CatalogLibraryFilters): CatalogSelection[] {
  const query = filters.query?.trim().toLocaleLowerCase() ?? '';
  const variants = filters.base ? item.variants.filter(variant => variant.base === filters.base) : item.variants;
  if (filters.base && !variants.length) return [];
  const selections = variants.length ? variants.map(variant => selectCatalogItem(item, variant.id)) : [selectCatalogItem(item)];
  return selections.filter(({ asset, revision }) => (!filters.status
      || (filters.status === 'reference-only' ? !asset.model
        : filters.status === 'needs-review' ? revision?.visualReview === 'pending'
          : filters.status === 'changes-requested' ? revision?.visualReview === 'changes-requested'
            : filters.status === 'approved' ? revision?.visualReview === 'approved'
              : filters.status === 'repair-needed' ? revision?.technicalReview === 'repair-needed' || asset.status === 'repair-needed'
                : asset.status === filters.status))
      && (filters.format !== '3d' || !!asset.model) && (filters.format !== '2d' || asset.references.length > 0)
      && (!query || [item.id, item.label, item.description, ...item.relatedIds, revision?.reviewNote ?? '', ...asset.references.map(reference => reference.label)]
        .some(value => value.toLocaleLowerCase().includes(query))));
}
export function selectCatalogItemForFilters(item: CatalogItem, filters: CatalogLibraryFilters): CatalogSelection {
  const matches = matchingSelections(item, filters);
  return matches.find(selection => selection.asset.model) ?? matches[0] ?? selectCatalogItem(item);
}
export function catalogCardSummary(item: CatalogItem, selection: CatalogSelection, base?: string) {
  const versions = item.variants.filter(variant => !base || variant.base === base).map(variant => selectCatalogItem(item, variant.id));
  const modelLabels = versions.filter(value => !!value.asset.model).map(value => value.variant?.label ?? '3D');
  const review = selection.revision;
  const needsAttention = review?.visualReview === 'changes-requested' || review?.technicalReview === 'repair-needed';
  const reviewLabel = !selection.asset.model ? 'Reference only' : review?.visualReview === 'approved' ? 'Art approved'
    : review?.visualReview === 'changes-requested' ? 'Changes requested' : review?.technicalReview === 'repair-needed' ? 'Technical repair needed' : 'Awaiting art review';
  return { modelLabels, reviewLabel, needsAttention };
}
export function filterCatalogItems(items: CatalogItem[], filters: CatalogLibraryFilters & { collection?: string }): CatalogItem[] {
  return items.filter(item => {
    if (filters.collection && item.collection !== filters.collection) return false;
    if (filters.category && item.category !== filters.category) return false;
    return matchingSelections(item, filters).length > 0;
  }).sort((a, b) => ['characters', 'wardrobe', 'faces-hair', 'animations'].indexOf(a.collection) - ['characters', 'wardrobe', 'faces-hair', 'animations'].indexOf(b.collection));
}
export function splitCatalogSources(sources: CatalogSource[]): Record<'construction' | 'proof' | 'exports' | 'history', CatalogSource[]> {
  const groups: ReturnType<typeof splitCatalogSources> = { construction: [], proof: [], exports: [], history: [] };
  for (const source of sources) {
    const group = /\/(history|drafts?|rejected[^/]*|before[^/]*|superseded)\//i.test(source.path) ? 'history'
      : source.role === 'report' ? 'proof' : source.role === 'model' ? 'exports' : 'construction';
    groups[group].push(source);
  }
  return groups;
}
