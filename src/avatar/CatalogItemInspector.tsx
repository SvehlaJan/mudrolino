import { Link } from 'react-router-dom';
import { Field } from '../shared/ui';
import { AvatarAssetInspector } from './AvatarAssetInspector';
import type { CatalogItem, CatalogLibraryManifest } from './catalogLibrary';
import { selectCatalogItem } from './catalogReview';

interface Props { item: CatalogItem; items: CatalogItem[]; animations: CatalogLibraryManifest['animations']; variantId?: string; revisionId?: string; onSelect: (variant: string, revision?: string) => void; onBack: () => void; itemUrl: (id: string) => string }
const selectClass = 'w-full rounded-xl border border-shadow/15 bg-white px-3 py-2.5 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-blue';
export function CatalogItemInspector({ item, items, animations, variantId, revisionId, onSelect, onBack, itemUrl }: Props) {
  const { asset, variant, revision } = selectCatalogItem(item, variantId, revisionId);
  const relatedItems = item.relatedIds.map(id => items.find(candidate => candidate.id === id)).filter(candidate => !!candidate);
  const controls = <section aria-label="Design versions" className="rounded-2xl border border-shadow/10 bg-white p-4">
    <div className="grid gap-4 sm:grid-cols-2">
      {item.variants.length > 0 && <Field label="Character version">{props => <select {...props} data-testid="catalog-variant" className={selectClass} value={variant?.id ?? ''} onChange={event => onSelect(event.target.value)}>{item.variants.map(value => <option key={value.id} value={value.id}>{value.label}{!value.revisions.length ? ' · 3D pending' : ''}</option>)}</select>}</Field>}
      {variant && variant.revisions.length > 0 && <Field label="Model revision">{props => <select {...props} data-testid="catalog-revision" className={selectClass} value={revision?.id ?? ''} onChange={event => onSelect(variant.id, event.target.value)}>{variant.revisions.map(value => <option key={value.id} value={value.id}>{value.label}{value.id === variant.currentRevisionId ? ' · current' : ' · earlier / alternate'}</option>)}</select>}</Field>}
    </div>
    {revision && revision.id !== variant?.currentRevisionId && <p className="mt-3 text-sm font-bold text-amber-900">You are inspecting an earlier or alternate version.</p>}
    {item.motion && <p data-testid="catalog-motion-brief" className="mt-4 text-sm leading-relaxed text-text-muted">{item.motion.description} {item.motion.loop ? 'Loops continuously.' : 'Plays once.'}</p>}
  </section>;
  const related = relatedItems.length > 0 ? <section className="rounded-3xl border border-shadow/10 bg-white p-5"><h2 className="text-lg font-black">Related designs</h2><div className="mt-3 flex flex-wrap gap-2">{relatedItems.map(value => <Link key={value.id} to={itemUrl(value.id)} className="rounded-xl border border-shadow/10 px-4 py-3 text-sm font-bold text-accent-blue hover:bg-accent-blue/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-blue">{value.id} · {value.label}</Link>)}</div></section> : undefined;
  return <AvatarAssetInspector key={`${item.id}:${variant?.id}:${revision?.id}`} asset={asset} animations={animations} onBack={onBack} controls={controls} review={revision} related={related} />;
}
