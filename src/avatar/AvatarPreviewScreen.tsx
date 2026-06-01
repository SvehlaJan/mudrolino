import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Bone,
  Check,
  Database,
  RotateCcw,
  RotateCw,
  Save,
  Shirt,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import { AvatarPresenter } from './AvatarPresenter';
import { resolveAvatarAssets } from './avatarAssetResolver';
import { AVATAR_ACCESSORY_ITEMS, AVATAR_SHOES_ITEMS, AVATAR_TOP_ITEMS } from './avatarCatalog';
import {
  AvatarAccessoryItemId,
  AvatarAnimationName,
  AvatarBodyShapeConfig,
  AvatarConfig,
  AvatarSceneData,
  AvatarShoesItemId,
  AvatarTopItemId,
  StoredAvatarState,
} from './avatarTypes';
import {
  createDefaultAvatarState,
  loadAvatarState,
  saveAvatarState,
} from './avatarStore';
import { useAvatarAssetsAvailability } from './useAvatarAssetAvailability';

const ANIMATION_OPTIONS: AvatarAnimationName[] = ['idle', 'walk', 'run', 'success', 'failure'];
const BUILD_OPTIONS: AvatarBodyShapeConfig['build'][] = ['average', 'slim', 'sturdy'];
const HEIGHT_OPTIONS: AvatarBodyShapeConfig['height'][] = ['average', 'short', 'tall'];

const animationLabels: Record<AvatarAnimationName, string> = {
  idle: 'Idle',
  walk: 'Walk',
  run: 'Run',
  success: 'Success',
  failure: 'Failure',
};

const buildLabels: Record<AvatarBodyShapeConfig['build'], string> = {
  average: 'Average',
  slim: 'Slim',
  sturdy: 'Sturdy',
};

const heightLabels: Record<AvatarBodyShapeConfig['height'], string> = {
  average: 'Average',
  short: 'Short',
  tall: 'Tall',
};

function formatJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function updateStoredConfig(
  state: StoredAvatarState,
  updater: (config: AvatarConfig) => AvatarConfig,
): StoredAvatarState {
  return {
    ...state,
    config: updater(state.config),
  };
}

interface WorkbenchSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

function WorkbenchSection({ title, icon, children }: WorkbenchSectionProps) {
  return (
    <section className="border-b border-shadow/10 py-5 first:pt-0 last:border-b-0 last:pb-0">
      <div className="mb-3 flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-bg-light text-text-main">
          {icon}
        </span>
        <h2 className="text-lg font-black leading-tight text-text-main">{title}</h2>
      </div>
      {children}
    </section>
  );
}

interface OptionButtonProps {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  detail?: string;
  swatchClassName?: string;
  onClick?: () => void;
  testId?: string;
}

function OptionButton({
  label,
  selected = false,
  disabled = false,
  detail,
  swatchClassName,
  onClick,
  testId,
}: OptionButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={selected}
      data-testid={testId}
      className={`flex min-h-14 items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left font-bold transition-colors ${
        selected
          ? 'border-accent-blue bg-accent-blue text-white'
          : disabled
            ? 'border-shadow/10 bg-bg-light text-text-main/45'
            : 'border-shadow/10 bg-white text-text-main hover:border-accent-blue/50'
      }`}
    >
      <span className="flex min-w-0 items-center gap-3">
        {swatchClassName && (
          <span
            aria-hidden="true"
            className={`h-4 w-4 shrink-0 rounded-full border border-white/80 ${swatchClassName}`}
          />
        )}
        <span className="min-w-0">
          <span className="block truncate">{label}</span>
          {detail && <span className="block text-xs font-black uppercase opacity-55">{detail}</span>}
        </span>
      </span>
      {selected && <Check size={18} className="shrink-0" />}
    </button>
  );
}

const VALID_ANIMATIONS = new Set<AvatarAnimationName>(['idle', 'walk', 'run', 'success', 'failure']);

function parseUrlParams(params: URLSearchParams): Partial<{
  top: AvatarTopItemId;
  shoes: AvatarShoesItemId;
  accessory: AvatarAccessoryItemId;
  animation: AvatarAnimationName;
  scale: number;
  agent: boolean;
}> {
  const result: ReturnType<typeof parseUrlParams> = {};

  const top = params.get('top');
  if (top && AVATAR_TOP_ITEMS.some((i) => i.id === top)) result.top = top as AvatarTopItemId;

  const shoes = params.get('shoes');
  if (shoes && AVATAR_SHOES_ITEMS.some((i) => i.id === shoes)) result.shoes = shoes as AvatarShoesItemId;

  const accessory = params.get('accessory');
  if (accessory && AVATAR_ACCESSORY_ITEMS.some((i) => i.id === accessory))
    result.accessory = accessory as AvatarAccessoryItemId;

  const animation = params.get('animation');
  if (animation && VALID_ANIMATIONS.has(animation as AvatarAnimationName))
    result.animation = animation as AvatarAnimationName;

  const scaleStr = params.get('scale');
  if (scaleStr !== null) {
    const scale = Math.min(1.2, Math.max(0.8, Number(scaleStr)));
    if (!Number.isNaN(scale)) result.scale = scale;
  }

  if (params.get('agent') === '1') result.agent = true;

  return result;
}

export function AvatarPreviewScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isAgentMode = searchParams.get('agent') === '1';
  const [previewState, setPreviewState] = useState<StoredAvatarState>(() => {
    const base = loadAvatarState();
    const url = parseUrlParams(searchParams);
    if (Object.keys(url).length === 0) return base;
    return {
      ...base,
      config: {
        ...base.config,
        ...(url.animation !== undefined && { animation: url.animation }),
        ...(url.scale !== undefined && {
          bodyShape: { ...base.config.bodyShape, scale: url.scale },
        }),
        slotSelections: {
          ...base.config.slotSelections,
          ...(url.top !== undefined && { top: url.top }),
          ...(url.shoes !== undefined && { shoes: url.shoes }),
          ...(url.accessory !== undefined && { accessory: url.accessory }),
        },
      },
    };
  });
  const [readyModelKey, setReadyModelKey] = useState<string | null>(null);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [sceneData, setSceneData] = useState<AvatarSceneData | null>(null);
  const cameraResetRef = useRef<(() => void) | null>(null);
  const resolvedAssets = useMemo(
    () => resolveAvatarAssets(previewState.config),
    [previewState.config],
  );
  const previewAssetStatus = useAvatarAssetsAvailability(resolvedAssets.requiredUrls);
  const modelReadyKey = [
    JSON.stringify(resolvedAssets.requiredUrls),
    resolvedAssets.animationName ?? 'embedded',
    previewState.config.animation,
    previewState.config.bodyShape.scale,
    JSON.stringify(previewState.config.slotSelections),
  ].join(':');
  const isModelReady = readyModelKey === modelReadyKey;

  const setConfig = useCallback((updater: (config: AvatarConfig) => AvatarConfig) => {
    setPreviewState((state) => updateStoredConfig(state, updater));
  }, []);

  const handlePersist = useCallback(() => {
    saveAvatarState(previewState);
  }, [previewState]);

  const handleResetPreview = useCallback(() => {
    setPreviewState(createDefaultAvatarState());
  }, []);

  const handleResetPersisted = useCallback(() => {
    const nextState = createDefaultAvatarState();
    saveAvatarState(nextState);
    setPreviewState(nextState);
  }, []);

  const handleModelReady = useCallback(() => {
    setReadyModelKey(modelReadyKey);
    setSceneData(null);
  }, [modelReadyKey]);

  useEffect(() => {
    document.title = isAgentMode ? 'Avatar debug' : 'Avatar workbench';
    return () => {
      document.title = 'Hravé Učenie';
    };
  }, [isAgentMode]);

  return (
    <div className="min-h-[100svh] overflow-y-auto bg-bg-light p-4 text-text-main sm:p-6 lg:p-8">
      <button
        onClick={() => navigate('/')}
        className="safe-top safe-left fixed z-20 flex h-12 w-12 items-center justify-center rounded-full bg-white text-text-main shadow-chip transition-transform hover:scale-105 active:scale-95 sm:h-14 sm:w-14"
        aria-label="Späť"
      >
        <ArrowLeft size={28} />
      </button>

      <main
        className={`mx-auto grid min-h-[calc(100svh-2rem)] max-w-7xl gap-5 pt-16 lg:pt-0 ${
          isAgentMode
            ? 'grid-cols-1'
            : 'lg:grid-cols-[380px_minmax(0,1fr)]'
        }`}
      >
        {!isAgentMode && (
        <aside className="rounded-[24px] bg-white p-5 shadow-chip lg:max-h-[calc(100svh-4rem)] lg:overflow-y-auto">
          <div className="pb-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-text-main/45">
              Avatar workbench
            </p>
            <h1 className="mt-2 text-3xl font-black leading-none text-text-main sm:text-4xl">
              Modular preview
            </h1>
            <p className="mt-3 text-sm font-semibold leading-snug text-text-main/60">
              Develop the current male base and planned customization slots through the real app renderer.
            </p>
          </div>

          <WorkbenchSection title="Animation State" icon={<Sparkles size={19} />}>
            <div className="grid grid-cols-3 gap-2">
              {ANIMATION_OPTIONS.map((animation) => (
                <OptionButton
                  key={animation}
                  label={animationLabels[animation]}
                  selected={previewState.config.animation === animation}
                  testId={`animation-${animation}`}
                  onClick={() => {
                    setConfig((config) => ({ ...config, animation }));
                  }}
                />
              ))}
            </div>
          </WorkbenchSection>

          <WorkbenchSection title="Clothing Slots" icon={<Shirt size={19} />}>
            <p className="mb-3 text-sm font-bold text-text-main/55">Top</p>
            <div className="grid gap-2">
              {AVATAR_TOP_ITEMS.map((item) => (
                <OptionButton
                  key={item.id}
                  label={item.label}
                  selected={previewState.config.slotSelections.top === item.id}
                  swatchClassName={item.swatchClassName}
                  testId={`slot-top-${item.id}`}
                  onClick={() => {
                    setConfig((config) => ({
                      ...config,
                      slotSelections: {
                        ...config.slotSelections,
                        top: item.id,
                      },
                    }));
                  }}
                />
              ))}
            </div>

            <p className="mb-3 mt-5 text-sm font-bold text-text-main/55">Shoes</p>
            <div className="grid gap-2">
              {AVATAR_SHOES_ITEMS.map((item) => (
                <OptionButton
                  key={item.id}
                  label={item.label}
                  selected={previewState.config.slotSelections.shoes === item.id}
                  swatchClassName={item.swatchClassName}
                  testId={`slot-shoes-${item.id}`}
                  onClick={() => {
                    setConfig((config) => ({
                      ...config,
                      slotSelections: {
                        ...config.slotSelections,
                        shoes: item.id,
                      },
                    }));
                  }}
                />
              ))}
            </div>

            <p className="mb-3 mt-5 text-sm font-bold text-text-main/55">Accessory</p>
            <div className="grid gap-2">
              {AVATAR_ACCESSORY_ITEMS.map((item) => (
                <OptionButton
                  key={item.id}
                  label={item.label}
                  selected={previewState.config.slotSelections.accessory === item.id}
                  swatchClassName={item.swatchClassName}
                  testId={`slot-accessory-${item.id}`}
                  onClick={() => {
                    setConfig((config) => ({
                      ...config,
                      slotSelections: {
                        ...config.slotSelections,
                        accessory: item.id,
                      },
                    }));
                  }}
                />
              ))}
            </div>
          </WorkbenchSection>

          <WorkbenchSection title="Body Shape" icon={<SlidersHorizontal size={19} />}>
            <label className="block">
              <span className="flex items-center justify-between text-sm font-black text-text-main/65">
                <span>Uniform scale</span>
                <span>{previewState.config.bodyShape.scale.toFixed(2)}x</span>
              </span>
              <input
                type="range"
                min="0.8"
                max="1.2"
                step="0.05"
                value={previewState.config.bodyShape.scale}
                onChange={(event) => {
                  const scale = Number(event.currentTarget.value);
                  setConfig((config) => ({
                    ...config,
                    bodyShape: {
                      ...config.bodyShape,
                      scale,
                    },
                  }));
                }}
                className="mt-3 w-full accent-accent-blue"
              />
            </label>

            <p className="mb-3 mt-5 text-sm font-bold text-text-main/55">Build</p>
            <div className="grid grid-cols-3 gap-2">
              {BUILD_OPTIONS.map((build) => (
                <OptionButton
                  key={build}
                  label={buildLabels[build]}
                  selected={previewState.config.bodyShape.build === build}
                  onClick={() => {
                    setConfig((config) => ({
                      ...config,
                      bodyShape: {
                        ...config.bodyShape,
                        build,
                      },
                    }));
                  }}
                />
              ))}
            </div>

            <p className="mb-3 mt-5 text-sm font-bold text-text-main/55">Height</p>
            <div className="grid grid-cols-3 gap-2">
              {HEIGHT_OPTIONS.map((height) => (
                <OptionButton
                  key={height}
                  label={heightLabels[height]}
                  selected={previewState.config.bodyShape.height === height}
                  onClick={() => {
                    setConfig((config) => ({
                      ...config,
                      bodyShape: {
                        ...config.bodyShape,
                        height,
                      },
                    }));
                  }}
                />
              ))}
            </div>
          </WorkbenchSection>

          <WorkbenchSection title="State" icon={<Database size={19} />}>
            <div className="grid gap-2">
              <button
                type="button"
                onClick={handlePersist}
                data-testid="avatar-persist"
                className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-success px-4 py-3 font-black text-white shadow-chip transition-transform hover:scale-[1.01] active:scale-[0.99]"
              >
                <Save size={18} />
                Persist current config
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleResetPreview}
                  className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 font-black text-text-main shadow-chip transition-transform hover:scale-[1.01] active:scale-[0.99]"
                >
                  <RotateCcw size={17} />
                  Reset preview
                </button>
                <button
                  type="button"
                  onClick={handleResetPersisted}
                  className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 font-black text-white shadow-chip transition-transform hover:scale-[1.01] active:scale-[0.99]"
                >
                  <RotateCcw size={17} />
                  Reset saved
                </button>
              </div>
            </div>
          </WorkbenchSection>
        </aside>
        )}

        <section className="grid min-h-[680px] gap-5 lg:min-h-0 lg:grid-rows-[minmax(0,1fr)_auto]">
          <div className="min-h-[520px] rounded-[24px] bg-white p-4 shadow-chip sm:p-5">
            <div className={`overflow-hidden rounded-[20px] bg-[radial-gradient(circle_at_top,rgba(108,196,255,0.18),transparent_42%),linear-gradient(180deg,rgba(250,251,255,1),rgba(237,243,248,1))] ${
              isAgentMode
                ? 'h-[min(85svh,900px)] min-h-[600px]'
                : 'h-[min(72svh,760px)] min-h-[500px]'
            }`}>
              {previewAssetStatus === 'available' ? (
                <div className="relative h-full w-full">
                  <AvatarPresenter
                    className="h-full w-full"
                    modelUrl={resolvedAssets.baseUrl}
                    assetStatusOverride={previewAssetStatus}
                    animationUrl={resolvedAssets.animationUrl}
                    animationName={resolvedAssets.animationName}
                    preserveHipsPosition={resolvedAssets.preserveHipsPosition}
                    externalAssets={resolvedAssets.externalAssets}
                    requiredUrls={resolvedAssets.requiredUrls}
                    bodyShape={previewState.config.bodyShape}
                    showSkeleton={showSkeleton}
                    onModelReady={handleModelReady}
                    onSceneData={setSceneData}
                    onRegisterCameraReset={(reset) => {
                      cameraResetRef.current = reset;
                    }}
                    label="Modular avatar preview"
                  />
                  {/* Camera reset — top right */}
                  <button
                    type="button"
                    onClick={() => cameraResetRef.current?.()}
                    aria-label="Reset camera view"
                    data-testid="camera-reset"
                    className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-text-main shadow-chip transition-colors hover:bg-white"
                  >
                    <RotateCw size={18} />
                  </button>

                  {/* Skeleton toggle — top left */}
                  <button
                    type="button"
                    onClick={() => setShowSkeleton((v) => !v)}
                    aria-pressed={showSkeleton}
                    aria-label="Toggle skeleton overlay"
                    data-testid="skeleton-toggle"
                    className={`absolute left-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full shadow-chip transition-colors ${
                      showSkeleton
                        ? 'bg-accent-blue text-white'
                        : 'bg-white/90 text-text-main hover:bg-white'
                    }`}
                  >
                    <Bone size={18} />
                  </button>
                  {!isModelReady && (
                    <div
                      className="absolute inset-0 flex items-center justify-center bg-bg-light/70 p-6 text-center"
                      role="status"
                      aria-live="polite"
                    >
                      <div className="max-w-sm rounded-2xl bg-white/85 p-5 shadow-chip">
                        <p className="text-lg font-black text-text-main">Loading modular avatar</p>
                        <p className="mt-2 text-sm font-bold text-text-main/60">
                          Waiting for the GLB scene to mount.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex h-full w-full items-center justify-center p-6 text-center">
                  <div className="max-w-sm rounded-2xl bg-white/80 p-5 shadow-chip">
                    <p className="text-lg font-black text-text-main">
                      {previewAssetStatus === 'missing'
                        ? 'Modular avatar asset missing'
                        : 'Checking avatar asset'}
                    </p>
                    <p className="mt-2 break-all text-sm font-bold text-text-main/60">
                      {resolvedAssets.baseUrl}
                    </p>
                    <p className="mt-2 break-all text-xs font-bold text-text-main/45">
                      {resolvedAssets.requiredUrls.join(', ')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[24px] bg-white p-5 shadow-chip">
            {isAgentMode && (
              <div className="mb-5 space-y-3 border-b border-text-main/10 pb-5">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-text-main/45">Controls</p>
                {/* Animation */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="w-20 shrink-0 text-xs font-bold text-text-main/45">Animation</span>
                  {ANIMATION_OPTIONS.map((anim) => (
                    <button
                      key={anim}
                      onClick={() => setConfig((c) => ({ ...c, animation: anim }))}
                      className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                        previewState.config.animation === anim
                          ? 'bg-accent-blue text-white'
                          : 'bg-bg-light text-text-main hover:bg-text-main/10'
                      }`}
                    >
                      {animationLabels[anim]}
                    </button>
                  ))}
                </div>
                {/* Top */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="w-20 shrink-0 text-xs font-bold text-text-main/45">Top</span>
                  {AVATAR_TOP_ITEMS.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setConfig((c) => ({ ...c, slotSelections: { ...c.slotSelections, top: item.id } }))}
                      className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                        previewState.config.slotSelections.top === item.id
                          ? 'bg-accent-blue text-white'
                          : 'bg-bg-light text-text-main hover:bg-text-main/10'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                {/* Shoes */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="w-20 shrink-0 text-xs font-bold text-text-main/45">Shoes</span>
                  {AVATAR_SHOES_ITEMS.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setConfig((c) => ({ ...c, slotSelections: { ...c.slotSelections, shoes: item.id } }))}
                      className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                        previewState.config.slotSelections.shoes === item.id
                          ? 'bg-accent-blue text-white'
                          : 'bg-bg-light text-text-main hover:bg-text-main/10'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                {/* Accessory */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="w-20 shrink-0 text-xs font-bold text-text-main/45">Accessory</span>
                  {AVATAR_ACCESSORY_ITEMS.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setConfig((c) => ({ ...c, slotSelections: { ...c.slotSelections, accessory: item.id } }))}
                      className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                        previewState.config.slotSelections.accessory === item.id
                          ? 'bg-accent-blue text-white'
                          : 'bg-bg-light text-text-main hover:bg-text-main/10'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="grid gap-4 lg:grid-cols-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-text-main/45">
                  Asset
                </p>
                <dl className="mt-3 space-y-2 text-sm font-bold text-text-main/70">
                  <div>
                    <dt className="text-text-main/45">Model URL</dt>
                    <dd className="break-all text-text-main">{resolvedAssets.baseUrl}</dd>
                  </div>
                  <div>
                    <dt className="text-text-main/45">External assets</dt>
                    <dd className="break-all text-text-main">
                      {resolvedAssets.externalAssets.length > 0
                        ? resolvedAssets.externalAssets.map((asset) => asset.url).join(', ')
                        : 'none'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-text-main/45">Status</dt>
                    <dd className="text-text-main">{previewAssetStatus}</dd>
                  </div>
                </dl>
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-text-main/45">
                  Preview config
                </p>
                <pre className="mt-3 max-h-56 overflow-auto rounded-2xl bg-bg-light p-3 text-xs font-bold leading-relaxed text-text-main/75">
                  {formatJson(previewState)}
                </pre>
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-text-main/45">
                  3D fit
                </p>
                {sceneData ? (
                  <dl className="mt-3 space-y-2 text-sm font-bold text-text-main/70">
                    <div>
                      <dt className="text-text-main/45">Bones</dt>
                      <dd className="break-all font-mono text-xs text-text-main">
                        {Object.entries(sceneData.bones)
                          .map(([name, p]) => `${name}(${p.x},${p.y},${p.z})`)
                          .join('  ')}
                      </dd>
                    </div>
                    {Object.entries(sceneData.garments).map(([key, fit]) => (
                      <div key={key}>
                        <dt className="text-text-main/45">{key}</dt>
                        <dd className="break-all font-mono text-xs text-text-main">
                          bone {fit.targetBone} z={fit.boneWorld.z} | center z={fit.meshCenter.z} | Δz=
                          {(fit.meshCenter.z - fit.boneWorld.z).toFixed(3)} | Z {fit.meshBounds.zMin}–
                          {fit.meshBounds.zMax}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="mt-3 text-sm font-bold text-text-main/40">Loading…</p>
                )}
              </div>
            </div>
            <pre
              data-testid="avatar-debug-json"
              hidden
              aria-hidden="true"
            >
              {sceneData ? JSON.stringify(sceneData, null, 2) : ''}
            </pre>
          </div>
        </section>
      </main>
    </div>
  );
}
