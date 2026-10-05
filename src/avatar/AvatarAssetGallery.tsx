import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigationType, useSearchParams } from 'react-router-dom';
import { ArrowRight, Box, Image as ImageIcon, Search, SlidersHorizontal } from 'lucide-react';
import { Button, Field } from '../shared/ui';
import { AvatarAssetInspector, CatalogImage } from './AvatarAssetInspector';
import { filterCatalogAssets, type CatalogLibraryFilters } from './catalogLibrary';
import { useCatalogLibrary } from './useCatalogLibrary';

const controlClass = 'w-full min-w-0 rounded-xl border border-shadow/15 bg-white px-3 py-2.5 text-sm outline-offset-2 focus-visible:outline-2 focus-visible:outline-accent-blue';
const filterKeys = ['q', 'category', 'base', 'format', 'status', 'history'] as const;
const categories = ['characters', 'tops', 'bottoms', 'footwear', 'accessories', 'outfits', 'studies', 'animations', 'references'];
const statuses = ['reference', 'pending', 'candidate', 'fit-verified', 'repair-needed', 'accepted', 'runtime'];
const statusLabels: Record<string, string> = { reference: '2D reference', pending: '3D pending', candidate: 'Candidate', 'fit-verified': 'Fit verified', 'repair-needed': 'Repair needed', accepted: 'Accepted', runtime: 'Runtime asset' };

export function AvatarAssetGallery() {
  const [params, setParams] = useSearchParams();
  const navigationType = useNavigationType();
  const location = useLocation();
  const latestParams = useRef(params);
  const pendingParams = useRef<string | null>(null);
  const routerSearch = params.toString();
  const navigationIdentity = `${location.key}:${routerSearch}`;
  const [urlState, setUrlState] = useState<{ observed: string; display: URLSearchParams; pending: string | null }>(() => ({ observed: navigationIdentity, display: params, pending: null }));
  if (urlState.observed !== navigationIdentity) {
    // Synchronize external navigation and the final committed update, not older transitions.
    const synchronize = navigationType === 'POP' || urlState.pending === null || urlState.pending === routerSearch;
    setUrlState(current => ({ ...current, observed: navigationIdentity, ...(synchronize ? { display: params, pending: null } : {}) }));
  }
  const displayParams = urlState.display;
  useEffect(() => {
    // Older transition commits must not replace a newer handler's pending update.
    if (navigationType !== 'POP' && pendingParams.current !== null && pendingParams.current !== params.toString()) return;
    latestParams.current = params;
    pendingParams.current = null;
  }, [params, navigationType, location.key]);
  useEffect(() => {
    function synchronizePop() {
      // A PUSH and immediate POP may be batched back to the exact original router
      // location. The history event still cancels any optimistic pending selection.
      const next = new URLSearchParams(window.location.search);
      latestParams.current = next;
      pendingParams.current = null;
      setUrlState(current => ({ ...current, display: next, pending: null }));
    }
    window.addEventListener('popstate', synchronizePop);
    return () => window.removeEventListener('popstate', synchronizePop);
  }, []);
  const { manifest, error, refreshing, retry, stale } = useCatalogLibrary();
  const filters: CatalogLibraryFilters = { query: displayParams.get('q') ?? '', category: displayParams.get('category') ?? '', base: displayParams.get('base') ?? '', format: displayParams.get('format') ?? '', status: displayParams.get('status') ?? '', history: displayParams.get('history') === '1' };
  const assets = manifest ? filterCatalogAssets(manifest.assets, filters) : [];
  const assetId = displayParams.get('asset');
  const selected = manifest?.assets.find(asset => asset.id === assetId);
  function navigateParams(next: URLSearchParams, replace = false) {
    latestParams.current = next;
    pendingParams.current = next.toString();
    // Controlled inputs should reflect the action before the router's transition commits.
    setUrlState(current => ({ ...current, display: next, pending: next.toString() }));
    setParams(next, { replace });
  }
  function updateFilter(key: string, value: string) {
    const next = new URLSearchParams(latestParams.current);
    if (value) next.set(key, value); else next.delete(key);
    navigateParams(next, true);
  }
  function clearFilters() {
    const next = new URLSearchParams(latestParams.current);
    filterKeys.forEach(key => next.delete(key));
    navigateParams(next, true);
  }
  function backToGallery() { const next = new URLSearchParams(latestParams.current); next.delete('asset'); navigateParams(next); }
  function openAsset(id: string) { const next = new URLSearchParams(latestParams.current); next.set('asset', id); navigateParams(next); }
  function assetUrl(id: string) { const next = new URLSearchParams(displayParams); next.set('asset', id); return `?${next.toString()}`; }
  return (
    <main className="min-h-[100svh] overflow-y-auto bg-[#f7f7f2] px-4 py-5 text-text-main sm:px-6 sm:py-7 lg:px-8">
      <div className="mx-auto max-w-[1440px]">
        <nav className="mb-6 flex flex-wrap items-center justify-between gap-3 text-xs font-bold sm:text-sm" aria-label="Avatar workbench navigation">
          <Link to="/" className="rounded-lg outline-offset-4 focus-visible:outline-2 focus-visible:outline-accent-blue">← Home</Link>
        </nav>
        <div data-testid="gallery-live-status" role="status" aria-live="polite" className={`mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-xs ${error ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-accent-blue/10 bg-white/70 text-text-muted'}`}>
          <span className="flex items-center gap-2"><span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${error ? 'bg-amber-500' : 'bg-emerald-500'}`} />{stale ? `Inventory stale — showing the last successful update. ${error}` : error ? error : manifest ? refreshing ? 'Refreshing local inventory…' : 'Live local inventory · refreshes every 5 seconds while visible' : 'Loading local inventory…'}</span>
          {error && <Button size="parent" density="compact" tone="neutral" onClick={retry} disabled={refreshing}>Retry</Button>}
        </div>
        {assetId && manifest ? selected ? <AvatarAssetInspector key={selected.id} asset={selected} animations={manifest.animations} onBack={backToGallery} /> : <section className="rounded-3xl bg-white p-8"><h1 className="text-2xl font-black">Asset no longer available</h1><p className="my-4 break-words text-sm text-text-muted">The selected asset “{assetId}” is missing from the current inventory.</p><Button size="parent" tone="primary" onClick={backToGallery}>Back to gallery</Button></section> : <>
          <header className="mb-7 grid gap-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <div><p className="text-xs font-black uppercase tracking-[0.2em] text-accent-blue">Avatar workshop / asset library</p><h1 className="mt-3 text-4xl font-black leading-tight sm:text-5xl">From reference to reality.</h1><p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-muted sm:text-base">Explore the characters, wardrobe and fitting studies. Open an asset to inspect its references, 3D model and the files behind it.</p></div>
            <div className="flex gap-4 rounded-2xl border border-shadow/10 bg-white px-5 py-4 text-sm"><div><strong className="block text-2xl font-black">{manifest?.assets.filter(a => !a.history).length ?? '—'}</strong><span className="text-xs text-text-muted">current assets</span></div><div className="border-l border-shadow/10 pl-4"><strong className="block text-2xl font-black">{manifest?.assets.filter(a => !a.history && a.model).length ?? '—'}</strong><span className="text-xs text-text-muted">3D previews</span></div></div>
          </header>
          <section aria-label="Asset filters" className="mb-7 rounded-3xl border border-shadow/10 bg-white p-4 shadow-chip sm:p-5">
            <div className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-text-muted"><SlidersHorizontal size={15} aria-hidden="true" />Find your next piece</div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[minmax(200px,1.5fr)_repeat(4,minmax(0,1fr))]">
              <Field label="Search assets">{props => <div className="relative"><Search size={17} aria-hidden="true" className="pointer-events-none absolute left-3 top-3 text-text-muted" /><input {...props} type="search" value={filters.query} placeholder="Name, ID or source path" onChange={event => updateFilter('q', event.target.value)} className={`${controlClass} pl-10`} /></div>}</Field>
              <Field label="Category">{props => <select {...props} value={filters.category} onChange={event => updateFilter('category', event.target.value)} className={controlClass}><option value="">All categories</option>{categories.map(value => <option key={value} value={value}>{value.charAt(0).toUpperCase() + value.slice(1)}</option>)}</select>}</Field>
              <Field label="Character base">{props => <select {...props} value={filters.base} onChange={event => updateFilter('base', event.target.value)} className={controlClass}><option value="">All bases</option>{['male', 'female', 'shared', 'unspecified'].map(value => <option key={value} value={value}>{value.charAt(0).toUpperCase() + value.slice(1)}</option>)}</select>}</Field>
              <Field label="Representation">{props => <select {...props} value={filters.format} onChange={event => updateFilter('format', event.target.value)} className={controlClass}><option value="">All representations</option><option value="2d">2D references</option><option value="3d">3D models</option></select>}</Field>
              <Field label="Status">{props => <select {...props} value={filters.status} onChange={event => updateFilter('status', event.target.value)} className={controlClass}><option value="">All statuses</option>{statuses.map(value => <option key={value} value={value}>{statusLabels[value]}</option>)}</select>}</Field>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-shadow/10 pt-4"><Field label="Include history" className="flex flex-row-reverse items-center justify-end gap-2 space-y-0">{props => <input {...props} type="checkbox" checked={filters.history} onChange={event => updateFilter('history', event.target.checked ? '1' : '')} className="h-4 w-4 shrink-0 rounded accent-accent-blue outline-offset-2 focus-visible:outline-2 focus-visible:outline-accent-blue" />}</Field><Button size="parent" tone="quiet" density="compact" onClick={clearFilters}>Clear filters</Button></div>
          </section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-black">The collection</h2><p data-testid="gallery-count" className="text-sm font-semibold text-text-muted">{assets.length} {assets.length === 1 ? 'asset' : 'assets'}{filters.history ? ' · including history' : ' · current work'}</p></div>
          {!manifest ? !error && <p className="rounded-3xl bg-white p-8 text-sm text-text-muted" role="status">Discovering references and models…</p> : assets.length === 0 ? <div className="rounded-3xl border border-dashed border-shadow/20 bg-white p-8 text-center"><h3 className="text-xl font-black">No assets match these filters</h3><p className="mt-2 text-sm text-text-muted">Try another search or include earlier attempts.</p><Button className="mt-5" size="parent" tone="primary" onClick={clearFilters}>Clear filters</Button></div> : <div className="grid grid-cols-1 gap-5 min-[520px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{assets.map(asset => <Link key={asset.id} to={assetUrl(asset.id)} onClick={event => { if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) { event.preventDefault(); openAsset(asset.id); } }} data-testid="gallery-card" data-asset-id={asset.id} className="group min-w-0 overflow-hidden rounded-3xl border border-shadow/10 bg-white shadow-chip transition-all hover:-translate-y-1 hover:border-accent-blue/40 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-blue motion-reduce:transform-none motion-reduce:transition-none">
            <div className="relative flex h-56 items-center justify-center overflow-hidden border-b border-shadow/5 bg-[#eff1ed] p-3"><CatalogImage key={asset.previewUrl ?? asset.references[0]?.thumbnailUrl ?? 'none'} src={asset.previewUrl ?? asset.references[0]?.thumbnailUrl} alt={asset.label} className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transform-none motion-reduce:transition-none" /><span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-text-main">{asset.id.startsWith('reference:') ? 'Reference sheet' : asset.id.includes(':') ? asset.category : asset.id}</span>{asset.history && <span className="absolute right-3 top-3 rounded-full bg-text-main/80 px-2.5 py-1 text-[10px] font-bold text-white">History</span>}</div>
            <div className="p-4"><div className="mb-2 flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-widest text-text-muted"><span>{asset.category} · {asset.base}</span><span className="flex shrink-0 items-center gap-1" aria-label={[asset.references.length && '2D references', asset.model && '3D model'].filter(Boolean).join(', ') || 'Sources only'}>{asset.references.length > 0 && <ImageIcon size={14} aria-hidden="true" />}{asset.model && <Box size={14} aria-hidden="true" />}</span></div><h3 className="break-words text-lg font-black leading-snug">{asset.label}</h3><div className="mt-4 flex items-center justify-between gap-2"><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${asset.status === 'accepted' ? 'bg-emerald-50 text-emerald-800' : asset.status === 'repair-needed' ? 'bg-amber-50 text-amber-800' : 'bg-accent-blue/10 text-text-main'}`}>{statusLabels[asset.status] ?? asset.status}</span><ArrowRight size={17} className="text-accent-blue transition-transform group-hover:translate-x-1 motion-reduce:transform-none motion-reduce:transition-none" aria-hidden="true" /></div></div>
          </Link>)}</div>}
          <p className="mt-8 pb-2 text-xs leading-relaxed text-text-muted">Fit verification and visual acceptance are tracked separately. Female reference designs have their own pending 3D milestone.</p>
        </>}
      </div>
    </main>
  );
}
