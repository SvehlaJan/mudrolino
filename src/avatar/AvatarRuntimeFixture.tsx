import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AvatarPresenter } from './AvatarPresenter';
import { resolveCatalogPreview } from './catalogPreview';
import { COMPANION_CLIP_NAMES } from './companionCelebration';
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

const BEAR_CLIPS = COMPANION_CLIP_NAMES;
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
  const [paused, setPaused] = useState(false);
  const [scrubProgress, setScrubProgress] = useState(0);
  const [timeScale, setTimeScale] = useState<0.25 | 0.5 | 1>(1);
  const [playbackMode, setPlaybackMode] = useState<'loop' | 'once'>('loop');
  const [playNonce, setPlayNonce] = useState(0);
  const [walkDemo, setWalkDemo] = useState<{ active: boolean; dir: 1 | -1 }>({ active: false, dir: 1 });
  const [scene, setScene] = useState<AvatarSceneData | null>(null);
  const [animations, setAnimations] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const handleModelReady = useCallback(() => setReady(true), []);

  const triggerWalkDemo = useCallback(() => {
    setPaused(false);
    setWalkDemo(prev => ({ active: true, dir: prev.dir === 1 ? -1 : 1 }));
    window.setTimeout(() => {
      setWalkDemo(prev => ({ ...prev, active: false }));
    }, 1100);
  }, []);

  const resolvedView = hasPoseParam
    ? (initialView === 'side' || initialView === 'back' || initialView === 'three-quarter' ? initialView : 'front')
    : view;
  const inspection = useMemo(
    () =>
      hasPoseParam
        ? { paused: true, progress, view: resolvedView }
        : { paused, progress: paused ? scrubProgress : undefined, timeScale, view: resolvedView },
    [hasPoseParam, paused, progress, resolvedView, scrubProgress, timeScale],
  );
  const effectiveClip = walkDemo.active ? 'walk' : activeClip;
  const playback = useMemo(
    () => (
      hasPoseParam
        ? undefined
        : walkDemo.active
          ? { mode: 'loop' as const, eventKey: `walk-demo:${walkDemo.dir}` }
          : { mode: playbackMode, eventKey: `${activeClip}:${playNonce}` }
    ),
    [activeClip, hasPoseParam, playNonce, playbackMode, walkDemo.active, walkDemo.dir],
  );

  return <main className="min-h-[100svh] bg-bg-light p-4">
    {!hasPoseParam && (
      <div className="mx-auto mb-3 flex max-w-6xl flex-col gap-3 rounded-2xl bg-white px-4 py-3 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs font-black uppercase tracking-wider text-text-muted">Clip:</span>
            {BEAR_CLIPS.map(clip => (
              <button key={clip} type="button" onClick={() => { setActiveClip(clip); setPlayNonce(n => n + 1); }}
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
        <div className="flex flex-wrap items-center gap-4 border-t border-shadow/10 pt-2 text-sm">
          <button
            type="button"
            onClick={() => setPaused(p => !p)}
            className="rounded-xl bg-bg-light px-3 py-1.5 font-bold text-text-main hover:bg-accent-blue/20"
          >
            {paused ? '▶ Play' : '⏸ Pause'}
          </button>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-black uppercase tracking-wider text-text-muted">Speed:</span>
            {([0.25, 0.5, 1] as const).map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setTimeScale(s)}
                className={`rounded-xl px-2.5 py-1 font-bold transition ${timeScale === s ? 'bg-accent-blue text-text-main shadow-xs' : 'bg-bg-light text-text-muted hover:text-text-main'}`}
              >
                {s}×
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-black uppercase tracking-wider text-text-muted">Mode:</span>
            {(['loop', 'once'] as const).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => { setPlaybackMode(m); setPlayNonce(n => n + 1); }}
                className={`rounded-xl px-2.5 py-1 font-bold transition ${playbackMode === m ? 'bg-accent-blue text-text-main shadow-xs' : 'bg-bg-light text-text-muted hover:text-text-main'}`}
              >
                {m}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={triggerWalkDemo}
            className={`rounded-xl px-3 py-1.5 font-bold transition ${walkDemo.active ? 'bg-accent-green text-white shadow-xs' : 'bg-bg-light text-text-main hover:bg-accent-green/20'}`}
          >
            🚶 Walk Demo
          </button>
          <label className="flex min-w-52 flex-1 items-center gap-2 font-bold text-text-muted">
            <span className="text-xs uppercase tracking-wider">Scrub: {scrubProgress.toFixed(2)}</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={scrubProgress}
              onChange={(event) => {
                setPaused(true);
                setScrubProgress(Number(event.target.value));
              }}
              className="w-full accent-accent-blue"
            />
          </label>
        </div>
      </div>
    )}
    <div
      className="mx-auto h-[80svh] max-w-6xl overflow-hidden rounded-3xl bg-white transition-transform duration-1000 ease-in-out"
      style={
        walkDemo.active
          ? { transform: `translate3d(${walkDemo.dir * 84}px, 0, 0)` }
          : undefined
      }
    >
      <AvatarPresenter className="h-full w-full" modelUrl="/__avatar_fixture/bear-v1.glb"
        animationName={effectiveClip} preserveHipsPosition interactive={!hasPoseParam}
        inspection={inspection} playback={playback}
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
