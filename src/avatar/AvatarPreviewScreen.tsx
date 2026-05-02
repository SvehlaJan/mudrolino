import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BadgeInfo,
  Check,
  Database,
  RotateCcw,
  Save,
  Shirt,
  SlidersHorizontal,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { AvatarPresenter } from './AvatarPresenter';
import { AVATAR_TOP_ITEMS, DEFAULT_AVATAR_TOP } from './avatarCatalog';
import { AVATAR_MODULAR_MALE_MODEL_URL, AVATAR_STORAGE_KEY } from './avatarConstants';
import {
  AvatarAnimationName,
  AvatarBodyShapeConfig,
  AvatarConfig,
  AvatarTopItemId,
  StoredAvatarState,
} from './avatarTypes';
import {
  createDefaultAvatarState,
  loadAvatarState,
  saveAvatarState,
} from './avatarStore';
import { useAvatarAssetAvailability } from './useAvatarAssetAvailability';

type FutureSlot = 'bottom' | 'shoes' | 'hair' | 'accessory';

const ANIMATION_OPTIONS: AvatarAnimationName[] = ['idle', 'success', 'failure'];
const BUILD_OPTIONS: AvatarBodyShapeConfig['build'][] = ['average', 'slim', 'sturdy'];
const HEIGHT_OPTIONS: AvatarBodyShapeConfig['height'][] = ['average', 'short', 'tall'];

const FUTURE_SLOTS: Array<{ id: FutureSlot; label: string }> = [
  { id: 'bottom', label: 'Bottom' },
  { id: 'shoes', label: 'Shoes' },
  { id: 'hair', label: 'Hair' },
  { id: 'accessory', label: 'Accessory' },
];

const animationLabels: Record<AvatarAnimationName, string> = {
  idle: 'Idle',
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

const topSwatches: Record<AvatarTopItemId, string> = {
  top_blue_tshirt: 'bg-accent-blue',
  top_green_hoodie: 'bg-success',
};

function readStorageSnapshot() {
  try {
    return localStorage.getItem(AVATAR_STORAGE_KEY);
  } catch {
    return null;
  }
}

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
}

function OptionButton({
  label,
  selected = false,
  disabled = false,
  detail,
  swatchClassName,
  onClick,
}: OptionButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={selected}
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

export function AvatarPreviewScreen() {
  const navigate = useNavigate();
  const [previewState, setPreviewState] = useState<StoredAvatarState>(() => loadAvatarState());
  const [storageSnapshot, setStorageSnapshot] = useState<string | null>(() => readStorageSnapshot());
  const [animationNames, setAnimationNames] = useState<string[]>([]);
  const [readyModelKey, setReadyModelKey] = useState<string | null>(null);
  const assetStatus = useAvatarAssetAvailability(AVATAR_MODULAR_MALE_MODEL_URL);
  const modelReadyKey = [
    previewState.config.animation,
    previewState.config.bodyShape.scale,
    previewState.config.slotSelections.top,
  ].join(':');
  const isModelReady = readyModelKey === modelReadyKey;

  const selectedTopItem = useMemo(
    () =>
      AVATAR_TOP_ITEMS.find((item) => item.id === previewState.config.slotSelections.top) ??
      AVATAR_TOP_ITEMS.find((item) => item.id === DEFAULT_AVATAR_TOP) ??
      AVATAR_TOP_ITEMS[0],
    [previewState.config.slotSelections.top],
  );

  const selectedMeshNames = useMemo(
    () => [
      'body_underlayer_male',
      'head',
      'face_anchor',
      selectedTopItem?.meshName ?? previewState.config.slotSelections.top,
    ],
    [previewState.config.slotSelections.top, selectedTopItem?.meshName],
  );

  const setConfig = useCallback((updater: (config: AvatarConfig) => AvatarConfig) => {
    setPreviewState((state) => updateStoredConfig(state, updater));
  }, []);

  const handlePersist = useCallback(() => {
    saveAvatarState(previewState);
    setStorageSnapshot(readStorageSnapshot());
  }, [previewState]);

  const handleResetPreview = useCallback(() => {
    setPreviewState(createDefaultAvatarState());
  }, []);

  const handleResetPersisted = useCallback(() => {
    const nextState = createDefaultAvatarState();
    saveAvatarState(nextState);
    setPreviewState(nextState);
    setStorageSnapshot(readStorageSnapshot());
  }, []);

  return (
    <div className="min-h-[100svh] overflow-y-auto bg-bg-light p-4 text-text-main sm:p-6 lg:p-8">
      <button
        onClick={() => navigate('/')}
        className="safe-top safe-left fixed z-20 flex h-12 w-12 items-center justify-center rounded-full bg-white text-text-main shadow-chip transition-transform hover:scale-105 active:scale-95 sm:h-14 sm:w-14"
        aria-label="Späť"
      >
        <ArrowLeft size={28} />
      </button>

      <main className="mx-auto grid min-h-[calc(100svh-2rem)] max-w-7xl gap-5 pt-16 lg:grid-cols-[380px_minmax(0,1fr)] lg:pt-0">
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

          <WorkbenchSection title="Base" icon={<UserRound size={19} />}>
            <div className="grid grid-cols-2 gap-2">
              <OptionButton label="Male" detail="active" selected />
              <OptionButton label="Female" detail="planned" disabled />
            </div>
          </WorkbenchSection>

          <WorkbenchSection title="Animation State" icon={<Sparkles size={19} />}>
            <div className="grid grid-cols-3 gap-2">
              {ANIMATION_OPTIONS.map((animation) => (
                <OptionButton
                  key={animation}
                  label={animationLabels[animation]}
                  selected={previewState.config.animation === animation}
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
                  detail={item.meshName}
                  selected={previewState.config.slotSelections.top === item.id}
                  swatchClassName={topSwatches[item.id]}
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

            <p className="mb-3 mt-5 text-sm font-bold text-text-main/55">Future slots</p>
            <div className="grid grid-cols-2 gap-2">
              {FUTURE_SLOTS.map((slot) => (
                <OptionButton key={slot.id} label={slot.label} detail="planned" disabled />
              ))}
            </div>
          </WorkbenchSection>

          <WorkbenchSection title="Face" icon={<BadgeInfo size={19} />}>
            <div className="grid grid-cols-2 gap-2">
              <OptionButton label="Placeholder" detail="active" selected />
              <OptionButton label="Generated decal" detail="planned" disabled />
            </div>
            <p className="mt-3 text-sm font-semibold leading-snug text-text-main/55">
              The GLB includes `face_anchor`; selfie processing and decal rendering stay behind the backend backlog.
            </p>
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

        <section className="grid min-h-[680px] gap-5 lg:min-h-0 lg:grid-rows-[minmax(0,1fr)_auto]">
          <div className="min-h-[520px] rounded-[24px] bg-white p-4 shadow-chip sm:p-5">
            <div className="h-[min(72svh,760px)] min-h-[500px] overflow-hidden rounded-[20px] bg-[radial-gradient(circle_at_top,rgba(108,196,255,0.18),transparent_42%),linear-gradient(180deg,rgba(250,251,255,1),rgba(237,243,248,1))]">
              {assetStatus === 'available' ? (
                <div className="relative h-full w-full">
                  <AvatarPresenter
                    className="h-full w-full"
                    modelUrl={AVATAR_MODULAR_MALE_MODEL_URL}
                    assetStatusOverride={assetStatus}
                    animationName={previewState.config.animation}
                    slotSelections={previewState.config.slotSelections}
                    bodyShape={previewState.config.bodyShape}
                    onAnimationsChange={setAnimationNames}
                    onModelReady={() => setReadyModelKey(modelReadyKey)}
                    label="Modular avatar preview"
                  />
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
                      {assetStatus === 'missing' ? 'Modular avatar asset missing' : 'Checking avatar asset'}
                    </p>
                    <p className="mt-2 break-all text-sm font-bold text-text-main/60">
                      {AVATAR_MODULAR_MALE_MODEL_URL}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[24px] bg-white p-5 shadow-chip">
            <div className="grid gap-4 lg:grid-cols-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-text-main/45">
                  Asset
                </p>
                <dl className="mt-3 space-y-2 text-sm font-bold text-text-main/70">
                  <div>
                    <dt className="text-text-main/45">Model URL</dt>
                    <dd className="break-all text-text-main">{AVATAR_MODULAR_MALE_MODEL_URL}</dd>
                  </div>
                  <div>
                    <dt className="text-text-main/45">Status</dt>
                    <dd className="text-text-main">{assetStatus}</dd>
                  </div>
                  <div>
                    <dt className="text-text-main/45">Model ready</dt>
                    <dd className="text-text-main">{isModelReady ? 'yes' : 'no'}</dd>
                  </div>
                  <div>
                    <dt className="text-text-main/45">Animation clips</dt>
                    <dd className="break-words text-text-main">
                      {animationNames.length > 0 ? animationNames.join(', ') : 'none in current GLB'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-text-main/45">Visible meshes</dt>
                    <dd className="break-words text-text-main">{selectedMeshNames.join(', ')}</dd>
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
                  Persisted storage
                </p>
                <pre className="mt-3 max-h-56 overflow-auto rounded-2xl bg-bg-light p-3 text-xs font-bold leading-relaxed text-text-main/75">
                  {storageSnapshot ?? 'null'}
                </pre>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
