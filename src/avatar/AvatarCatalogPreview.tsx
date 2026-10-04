import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Field } from '../shared/ui';
import type { CatalogPreviewManifest } from './catalogPreview';
import { CatalogModelInspector } from './CatalogModelInspector';

const groups = ['body', 'head', 'piece', 'outfit', 'study'] as const;
export function AvatarCatalogPreview() {
  const [params, setParams] = useSearchParams();
  const [manifest, setManifest] = useState<CatalogPreviewManifest | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    fetch('/__avatar_catalog/manifest.json', { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error('Catalog inventory unavailable'); return response.json(); })
      .then((data: CatalogPreviewManifest) => setManifest(data))
      .catch((reason: Error) => { if (!controller.signal.aborted) setError(reason.message); });
    return () => controller.abort();
  }, []);
  const entry = manifest?.entries.find(e => e.id === params.get('model')) ?? manifest?.entries.find(e => e.kind === 'study') ?? manifest?.entries[0];
  return (
    <main className="min-h-[100svh] overflow-y-auto bg-bg-light p-4 text-text-main sm:p-6">
      <header className="mx-auto mb-5 max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm font-bold">
          <Link to="/">← Home</Link><Link to="/avatar-preview?view=modular">Original modular workbench →</Link>
        </div>
        <h1 className="mt-4 text-3xl font-black">Catalog model preview</h1>
        <p className="mt-2 text-sm text-text-muted">Current Blender models. Candidates and fitting studies are still in progress.</p>
      </header>
      {error ? <p role="alert" className="mx-auto max-w-7xl">{error}. Run this page with the development server.</p> : !entry ? <p role="status" className="mx-auto max-w-7xl">{manifest ? 'No authored models found in this checkout.' : 'Loading catalog…'}</p> : (
        <div className="mx-auto max-w-7xl">
          <CatalogModelInspector entry={entry} animations={manifest!.animations} modelControl={
            <Field label="Model" helpText={`${manifest!.entries.length} available models`}>
              {props => <select {...props} value={entry.id} data-testid="catalog-model" className="w-full min-w-0 rounded-xl border border-shadow/20 bg-white p-3 text-sm" onChange={event => { const next = new URLSearchParams(params); next.set('model', event.target.value); setParams(next); }}>
                {groups.map(kind => <optgroup key={kind} label={kind === 'piece' ? 'Individual pieces on body' : kind === 'study' ? 'Latest fitting studies' : kind === 'outfit' ? 'Complete outfits' : kind === 'head' ? 'Heads' : 'Foundation'}>
                  {manifest!.entries.filter(e => e.kind === kind).map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
                </optgroup>)}
              </select>}
            </Field>
          } />
        </div>
      )}
    </main>
  );
}
