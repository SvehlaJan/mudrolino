import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button, Field } from '../shared/ui';
import { AvatarPresenter } from './AvatarPresenter';
import { resolveCatalogPreview, type CatalogAnimation, type CatalogPreviewManifest } from './catalogPreview';
import type { AvatarInspectionControls } from './avatarTypes';
import { useAvatarAssetsAvailability } from './useAvatarAssetAvailability';

const views: AvatarInspectionControls['view'][] = ['front', 'three-quarter', 'side', 'back'];
const groups = ['body', 'head', 'piece', 'outfit', 'study'] as const;
export function AvatarCatalogPreview() {
  const [params, setParams] = useSearchParams();
  const [manifest, setManifest] = useState<CatalogPreviewManifest | null>(null);
  const [error, setError] = useState('');
  const [animation, setAnimation] = useState<CatalogAnimation>('rest');
  const [inspection, setInspection] = useState<AvatarInspectionControls>({ paused: false, view: 'front' });
  const [skeleton, setSkeleton] = useState(false);
  const [ready, setReady] = useState('');
  const resetCamera = useRef<(() => void) | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/__avatar_catalog/manifest.json', { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error('Catalog inventory unavailable'); return response.json(); })
      .then((data: CatalogPreviewManifest) => setManifest(data))
      .catch((reason: Error) => { if (!controller.signal.aborted) setError(reason.message); });
    return () => controller.abort();
  }, []);
  const entry = manifest?.entries.find(e => e.id === params.get('model')) ?? manifest?.entries.find(e => e.kind === 'study') ?? manifest?.entries[0];
  const assets = useMemo(() => entry && manifest ? resolveCatalogPreview(entry, animation, manifest.animations) : null, [entry, animation, manifest]);
  const status = useAvatarAssetsAvailability(assets?.requiredUrls ?? []);
  const modelKey = `${entry?.id}-${animation}`;
  const handleReady = useCallback(() => setReady(modelKey), [modelKey]);
  const registerCamera = useCallback((reset: () => void) => { resetCamera.current = reset; }, []);
  function chooseAnimation(next: CatalogAnimation) { if (next !== animation) setReady(''); setAnimation(next); setInspection(current => ({ ...current, paused: false, progress: undefined })); }
  return (
    <main className="min-h-[100svh] overflow-y-auto bg-bg-light p-4 text-text-main sm:p-6">
      <header className="mx-auto mb-5 max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm font-bold">
          <Link to="/">← Home</Link><Link to="/avatar-preview?view=modular">Original modular workbench →</Link>
        </div>
        <h1 className="mt-4 text-3xl font-black">Catalog model preview</h1>
        <p className="mt-2 text-sm text-text-muted">Current Blender models. Candidates and fitting studies are still in progress.</p>
      </header>
      {error ? <p role="alert" className="mx-auto max-w-7xl">{error}. Run this page with the development server.</p> : !entry || !assets ? <p role="status" className="mx-auto max-w-7xl">{manifest ? 'No authored models found in this checkout.' : 'Loading catalog…'}</p> : (
        <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="space-y-5 rounded-3xl bg-white p-5 shadow-chip">
            <Field label="Model" helpText={`${manifest!.entries.length} available models`}>
              {props => <select {...props} value={entry.id} data-testid="catalog-model" className="w-full min-w-0 rounded-xl border border-shadow/20 bg-white p-3 text-sm" onChange={event => { if (event.target.value !== entry.id) setReady(''); const next = new URLSearchParams(params); next.set('model', event.target.value); setParams(next); chooseAnimation('rest'); }}>
                {groups.map(kind => <optgroup key={kind} label={kind === 'piece' ? 'Individual pieces on body' : kind === 'study' ? 'Latest fitting studies' : kind === 'outfit' ? 'Complete outfits' : kind === 'head' ? 'Heads' : 'Foundation'}>
                  {manifest!.entries.filter(e => e.kind === kind).map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
                </optgroup>)}
              </select>}
            </Field>
            <div><p className="mb-2 text-sm font-bold">Animation</p><div className="flex flex-wrap gap-2">
              {(['rest', 'walk', 'run'] as const).map(value => <Button key={value} size="parent" density="compact" tone={animation === value ? 'primary' : 'neutral'} aria-pressed={animation === value} disabled={entry.kind === 'head' && value !== 'rest'} onClick={() => chooseAnimation(value)}>{value === 'rest' ? 'Rest' : value === 'walk' ? 'Walk' : 'Run'}</Button>)}
            </div></div>
            {animation !== 'rest' && <div className="space-y-3">
              <Button size="parent" tone="neutral" onClick={() => setInspection(current => ({ ...current, paused: !current.paused, progress: undefined }))}>{inspection.paused ? 'Resume' : 'Pause'}</Button>
              <Field label="Inspect pose" helpText="Scrubbing pauses playback.">{props => <input {...props} data-testid="catalog-pose" type="range" min="0" max="1" step="0.005" value={inspection.progress ?? 0} className="w-full accent-accent-blue" onChange={event => setInspection(current => ({ ...current, paused: true, progress: Number(event.target.value) }))} />}</Field>
            </div>}
            <div><p className="mb-2 text-sm font-bold">View</p><div className="flex flex-wrap gap-2">{views.map(view => <Button key={view} size="parent" density="compact" tone={inspection.view === view ? 'primary' : 'neutral'} aria-pressed={inspection.view === view} onClick={() => setInspection(current => ({ ...current, view }))}>{view}</Button>)}</div></div>
            <div className="flex flex-wrap items-center gap-3"><Button size="parent" tone="quiet" onClick={() => resetCamera.current?.()}>Reset camera</Button><label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={skeleton} onChange={event => setSkeleton(event.target.checked)} />Skeleton</label></div>
          </aside>
          <section className="min-w-0 rounded-3xl bg-white p-4 shadow-chip">
            <h2 className="text-xl font-black" data-testid="catalog-title">{entry.label}</h2>
            <p className="my-2 text-sm text-text-muted" data-testid="catalog-status">{entry.status}</p>
            <div className="relative h-[60svh] min-h-[380px] max-h-[740px] overflow-hidden rounded-2xl bg-[linear-gradient(180deg,#edf4fb,#dce5ee)]" data-testid="catalog-viewport">
              <AvatarPresenter key={modelKey} className="h-full w-full" label={entry.label} modelUrl={assets.baseUrl} animationUrl={assets.animationUrl} animationName={assets.animationName} externalAssets={assets.externalAssets} requiredUrls={assets.requiredUrls} preserveHipsPosition inspection={inspection} showSkeleton={skeleton} assetStatusOverride={status} onModelReady={handleReady} onRegisterCameraReset={registerCamera} />
              {status !== 'available' || ready !== modelKey ? <p role="status" className="absolute left-4 top-4 rounded-xl bg-white/90 p-3 text-sm">{status === 'missing' ? 'Model unavailable. Reload the catalog after exporting it.' : 'Loading model…'}</p> : null}
            </div>
            <p className="mt-3 text-sm text-text-muted">Drag to rotate. Scroll or pinch to zoom. {status === 'available' && ready === modelKey ? <span data-testid="catalog-ready">Ready</span> : null}</p>
          </section>
        </div>
      )}
    </main>
  );
}
