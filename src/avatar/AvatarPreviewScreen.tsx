import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { AvatarPresenter } from './AvatarPresenter';
import { useAvatarAssetAvailability } from './useAvatarAssetAvailability';

interface PreviewAsset {
  id: string;
  label: string;
  description: string;
  modelUrl: string;
  animationUrl?: string;
}

const PREVIEW_ASSETS: PreviewAsset[] = [
  {
    id: 'meshy-model',
    label: 'Meshy base model',
    description: 'Generated mesh before rigging',
    modelUrl: '/avatar/meshy/neutral-parent-model.glb',
  },
  {
    id: 'meshy-rigged',
    label: 'Meshy rigged',
    description: 'Auto-rigged character without extra motion',
    modelUrl: '/avatar/meshy/neutral-parent-rigged.glb',
  },
  {
    id: 'meshy-walk',
    label: 'Meshy walking',
    description: 'Rigged base using Meshy walk animation clip',
    modelUrl: '/avatar/meshy/neutral-parent-rigged.glb',
    animationUrl: '/avatar/meshy/neutral-parent-walking.glb',
  },
  {
    id: 'meshy-run',
    label: 'Meshy running',
    description: 'Rigged base using Meshy run animation clip',
    modelUrl: '/avatar/meshy/neutral-parent-rigged.glb',
    animationUrl: '/avatar/meshy/neutral-parent-running.glb',
  },
  {
    id: 'meshy-cheer',
    label: 'Meshy victory cheer',
    description: 'Rigged base using Meshy victory cheer animation clip',
    modelUrl: '/avatar/meshy/neutral-parent-rigged.glb',
    animationUrl: '/avatar/meshy/neutral-parent-victory-cheer.glb',
  },
  {
    id: 'clean-cheer',
    label: 'Blender-cleaned cheer',
    description: 'Base rig exported from Blender with rotation-only cheer action',
    modelUrl: '/avatar/meshy/neutral-parent-success-cheer-clean.glb',
  },
];

export function AvatarPreviewScreen() {
  const navigate = useNavigate();
  const [selectedAssetId, setSelectedAssetId] = useState<string>('clean-cheer');
  const [animationState, setAnimationState] = useState<{ assetId: string; names: string[] }>({
    assetId: selectedAssetId,
    names: [],
  });
  const [requestedAnimation, setRequestedAnimation] = useState<string | null>(null);

  const selectedAsset = useMemo(
    () => PREVIEW_ASSETS.find((asset) => asset.id === selectedAssetId) ?? PREVIEW_ASSETS[0],
    [selectedAssetId],
  );
  const modelStatus = useAvatarAssetAvailability(selectedAsset.modelUrl);
  const animationStatus = useAvatarAssetAvailability(selectedAsset.animationUrl ?? selectedAsset.modelUrl);
  const assetStatus =
    modelStatus === 'missing' || animationStatus === 'missing'
      ? 'missing'
      : modelStatus === 'available' && animationStatus === 'available'
        ? 'available'
        : 'checking';
  const availableAnimations = animationState.assetId === selectedAssetId ? animationState.names : [];
  const selectedAnimation =
    requestedAnimation && availableAnimations.includes(requestedAnimation)
      ? requestedAnimation
      : availableAnimations.find((name) => name.toLowerCase().includes('idle')) ?? availableAnimations[0] ?? null;
  const handleAnimationsChange = useCallback(
    (names: string[]) => {
      setAnimationState({ assetId: selectedAssetId, names });
    },
    [selectedAssetId],
  );

  return (
    <div className="h-[100svh] overflow-y-auto bg-bg-light p-4 sm:p-6 lg:p-8">
      <button
        onClick={() => navigate('/')}
        className="safe-top safe-left fixed z-20 flex h-14 w-14 items-center justify-center rounded-full bg-white text-text-main shadow-chip transition-transform hover:scale-105 active:scale-95"
        aria-label="Späť"
      >
        <ArrowLeft size={30} />
      </button>

      <main className="mx-auto flex min-h-full max-w-6xl flex-col gap-6 pt-16 lg:flex-row lg:items-stretch lg:pt-8">
        <section className="rounded-[32px] bg-white p-5 shadow-chip sm:p-6 lg:w-[360px] lg:shrink-0">
          <h1 className="text-[clamp(2rem,4vw,3.5rem)] font-black leading-none text-text-main">
            Avatar Preview
          </h1>
          <p className="mt-3 text-base font-semibold opacity-70 sm:text-lg">
            Switch between the Meshy outputs and pick the best base for cleanup and app integration.
          </p>

          <div className="mt-6 flex flex-col gap-3">
            {PREVIEW_ASSETS.map((asset) => {
              const isSelected = asset.id === selectedAsset.id;

              return (
                <button
                  key={asset.id}
                  onClick={() => {
                    setSelectedAssetId(asset.id);
                    setRequestedAnimation(null);
                  }}
                  className={`rounded-[24px] border px-4 py-4 text-left transition-colors ${
                    isSelected
                      ? 'border-primary bg-primary/10'
                      : 'border-shadow/10 bg-bg-light hover:border-primary/40'
                  }`}
                >
                  <div className="text-lg font-black leading-tight text-text-main">{asset.label}</div>
                  <div className="mt-1 text-sm font-semibold opacity-65">{asset.description}</div>
                </button>
              );
            })}
          </div>

          <div className="mt-6 rounded-[24px] bg-bg-light px-4 py-4">
            <p className="text-sm font-black uppercase tracking-[0.2em] opacity-50">Asset</p>
            <p className="mt-2 text-lg font-black text-text-main">{selectedAsset.label}</p>
            <p className="mt-1 break-all text-sm font-semibold opacity-65">
              Model: {selectedAsset.modelUrl}
            </p>
            {selectedAsset.animationUrl && (
              <p className="mt-1 break-all text-sm font-semibold opacity-65">
                Clip: {selectedAsset.animationUrl}
              </p>
            )}
            <p className="mt-3 text-sm font-semibold opacity-70">Status: {assetStatus}</p>
            <p className="mt-1 text-sm font-semibold opacity-70">
              Clips: {availableAnimations.length > 0 ? availableAnimations.join(', ') : 'none found yet'}
            </p>
          </div>

          {availableAnimations.length > 0 && (
            <div className="mt-6">
              <p className="text-sm font-black uppercase tracking-[0.2em] opacity-50">Animation</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {availableAnimations.map((name) => {
                  const isSelected = name === selectedAnimation;

                  return (
                    <button
                      key={name}
                      onClick={() => setRequestedAnimation(name)}
                      className={`rounded-full px-4 py-2 text-sm font-black transition-colors ${
                        isSelected
                          ? 'bg-accent-blue text-white'
                          : 'bg-white text-text-main shadow-chip hover:bg-accent-blue/10'
                      }`}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        <section className="min-h-[520px] flex-1 rounded-[32px] bg-white p-5 shadow-chip sm:p-6">
          <div className="h-[min(72svh,680px)] min-h-[460px] rounded-[28px] bg-[radial-gradient(circle_at_top,rgba(108,196,255,0.18),transparent_42%),linear-gradient(180deg,rgba(250,251,255,1),rgba(237,243,248,1))]">
            <AvatarPresenter
              className="h-full w-full"
              modelUrl={selectedAsset.modelUrl}
              animationUrl={selectedAsset.animationUrl}
              animationName={selectedAnimation}
              onAnimationsChange={handleAnimationsChange}
              label={selectedAsset.label}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
