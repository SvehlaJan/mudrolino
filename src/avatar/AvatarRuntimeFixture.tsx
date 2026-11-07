import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AvatarPresenter } from './AvatarPresenter';
import { resolveCatalogPreview } from './catalogPreview';
import type { AvatarSceneData } from './avatarTypes';

// Browser verifiers fulfill these fixed URLs from selected catalog source bytes.
// No legacy runtime assets or candidate promotion are required by this harness.
const entry = { id: 'catalog-runtime-fixture', kind: 'piece' as const,
  modelUrl: '/__avatar_fixture/body.glb', garmentUrl: '/__avatar_fixture/garments.glb', slot: 'top' as const };
const clips = { walk: '/__avatar_fixture/walk.glb', run: '/__avatar_fixture/run.glb' };

export function AvatarRuntimeFixture() {
  const [params] = useSearchParams();
  if (params.get('companion') === 'bear' || params.get('companion') === 'bear-v1') return <BearRuntimeFixture />;
  return <CatalogRuntimeFixture />;
}

const BEAR_CLIPS = [
  'celebrate',
  'wave',
  'clap',
  'jump',
  'finale',
  'idle',
  'search',
  'think',
  'listen',
  'encourage',
  'shrug',
  'flex',
  'bow',
  'march',
  'wiggle',
  'peekaboo',
  'stretch',
] as const;
const BEAR_VIEWS = ['front', 'three-quarter', 'side', 'back'] as const;

function BearRuntimeFixture() {
  const [params] = useSearchParams();
  const initialView = params.get('view');
  const [view, setView] = useState<'front' | 'three-quarter' | 'side' | 'back'>(
    initialView === 'side' || initialView === 'back' || initialView === 'three-quarter' ? initialView : 'front',
  );
  const initialClip = params.get('clip');
  const [activeClip, setActiveClip] = useState<string>(
    BEAR_CLIPS.find(c => c === initialClip) ?? 'celebrate',
  );
  const hasPoseParam = params.has('pose');
  const requestedPose = Number(params.get('pose') ?? '0');
  const progress = Number.isFinite(requestedPose) ? Math.max(0, Math.min(1, requestedPose)) : 0;
  const [scene, setScene] = useState<AvatarSceneData | null>(null);
  const [animations, setAnimations] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const handleModelReady = useCallback(() => setReady(true), []);

  const resolvedView = hasPoseParam
    ? (initialView === 'side' || initialView === 'back' || initialView === 'three-quarter' ? initialView : 'front')
    : view;
  const inspection = useMemo(
    () => (hasPoseParam ? { paused: true, progress, view: resolvedView } : { paused: false, view: resolvedView }),
    [hasPoseParam, progress, resolvedView],
  );

  return <main className="min-h-[100svh] bg-bg-light p-4">
    {!hasPoseParam && (
      <div className="mx-auto mb-3 flex max-w-6xl flex-wrap items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-black uppercase tracking-wider text-text-muted">Clip:</span>
          {BEAR_CLIPS.map(clip => (
            <button key={clip} type="button" onClick={() => setActiveClip(clip)}
              className={`rounded-xl px-3 py-1.5 text-sm font-bold transition ${activeClip === clip ? 'bg-accent-blue text-text-main shadow-xs' : 'bg-bg-light text-text-muted hover:text-text-main'}`}>
              {clip}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-black uppercase tracking-wider text-text-muted">View:</span>
          {BEAR_VIEWS.map(v => (
            <button key={v} type="button" onClick={() => setView(v)}
              className={`rounded-xl px-3 py-1.5 text-sm font-bold transition ${view === v ? 'bg-accent-blue text-text-main shadow-xs' : 'bg-bg-light text-text-muted hover:text-text-main'}`}>
              {v}
            </button>
          ))}
        </div>
      </div>
    )}
    <div className="mx-auto h-[80svh] max-w-6xl overflow-hidden rounded-3xl bg-white">
      <AvatarPresenter className="h-full w-full" modelUrl="/__avatar_fixture/bear-v1.glb"
        animationName={activeClip} preserveHipsPosition interactive={!hasPoseParam}
        inspection={inspection}
        assetStatusOverride="available" onSceneData={setScene}
        onModelReady={handleModelReady} onAnimationsChange={setAnimations} />
    </div>
    <pre data-testid="avatar-debug-json" hidden aria-hidden="true">{scene ? JSON.stringify({ ...scene, animations, ready, progress, view: resolvedView }) : ''}</pre>
  </main>;
}

function CatalogRuntimeFixture() {
  const [params] = useSearchParams();
  const requested = params.get('animation');
  const animation = requested === 'walk' || requested === 'run' ? requested : 'rest';
  const assets = useMemo(() => resolveCatalogPreview(entry, animation, clips), [animation]);
  const [scene, setScene] = useState<AvatarSceneData | null>(null);
  return (
    <main className="min-h-[100svh] bg-bg-light p-4">
      <div className="mx-auto h-[85svh] max-w-6xl overflow-hidden rounded-3xl bg-white">
        <AvatarPresenter className="h-full w-full" label="Catalog runtime verification"
          modelUrl={assets.baseUrl} animationUrl={assets.animationUrl}
          animationName={assets.animationName} externalAssets={assets.externalAssets}
          requiredUrls={assets.requiredUrls} preserveHipsPosition={assets.preserveHipsPosition}
          onSceneData={setScene} />
      </div>
      <pre data-testid="avatar-debug-json" hidden aria-hidden="true">{scene ? JSON.stringify(scene) : ''}</pre>
    </main>
  );
}
