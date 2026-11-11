import { Suspense, lazy, type ReactNode } from 'react';
import { AvatarRuntimeBoundary } from './AvatarRuntimeBoundary';
import { getLoadedAvatarSceneModule, loadAvatarSceneModule } from './avatarSceneLoader';
import type { AvatarPlaybackOptions, AvatarExternalAsset } from './avatarTypes';
import { AvatarBodyShapeConfig, AvatarInspectionControls, AvatarSceneData } from './avatarTypes';
import { AssetStatus, useAvatarAssetsAvailability } from './useAvatarAssetAvailability';

/**
 * three.js, @react-three/fiber and drei are only needed once an avatar actually renders,
 * so the whole renderer is split out of the main bundle. A failed chunk load throws during
 * render and is swallowed by AvatarRuntimeBoundary, same as any other avatar runtime error.
 */
const AvatarScene = lazy(() =>
  loadAvatarSceneModule().then((module) => ({ default: module.AvatarScene })),
);

interface AvatarPresenterProps {
  className?: string;
  label?: string;
  modelUrl: string;
  animationUrl?: string;
  animationName?: string | null;
  externalAssets?: AvatarExternalAsset[];
  requiredUrls?: string[];
  bodyShape?: AvatarBodyShapeConfig;
  preserveHipsPosition?: boolean;
  showSkeleton?: boolean;
  inspection?: AvatarInspectionControls;
  cameraDistance?: number;
  playback?: AvatarPlaybackOptions;
  interactive?: boolean;
  fallback?: ReactNode;
  onError?: (error: unknown) => void;
  assetStatusOverride?: AssetStatus;
  onAnimationsChange?: (names: string[]) => void;
  onModelReady?: () => void;
  onPlaybackComplete?: () => void;
  onSceneData?: (data: AvatarSceneData) => void;
  onRegisterCameraReset?: (reset: () => void) => void;
}

export function AvatarPresenter({
  className,
  label = 'Animovaný sprievodca',
  modelUrl,
  animationUrl,
  animationName,
  externalAssets,
  requiredUrls,
  bodyShape,
  preserveHipsPosition,
  showSkeleton,
  inspection,
  cameraDistance,
  playback,
  interactive,
  fallback,
  onError,
  assetStatusOverride,
  onAnimationsChange,
  onModelReady,
  onPlaybackComplete,
  onSceneData,
  onRegisterCameraReset,
}: AvatarPresenterProps) {
  if (assetStatusOverride) {
    return (
      <AvatarPresenterContent
        assetStatus={assetStatusOverride}
        className={className}
        label={label}
        modelUrl={modelUrl}
        animationUrl={animationUrl}
        animationName={animationName}
        externalAssets={externalAssets}
        requiredUrls={requiredUrls}
        bodyShape={bodyShape}
        preserveHipsPosition={preserveHipsPosition}
        showSkeleton={showSkeleton}
      inspection={inspection}
      cameraDistance={cameraDistance}
      playback={playback}
      interactive={interactive}
      fallback={fallback}
      onError={onError}
        onAnimationsChange={onAnimationsChange}
        onModelReady={onModelReady}
        onPlaybackComplete={onPlaybackComplete}
        onSceneData={onSceneData}
        onRegisterCameraReset={onRegisterCameraReset}
      />
    );
  }

  return (
    <CheckedAvatarPresenter
      className={className}
      label={label}
      modelUrl={modelUrl}
      animationUrl={animationUrl}
      animationName={animationName}
      externalAssets={externalAssets}
      requiredUrls={requiredUrls}
      bodyShape={bodyShape}
      preserveHipsPosition={preserveHipsPosition}
      showSkeleton={showSkeleton}
      inspection={inspection}
      cameraDistance={cameraDistance}
      playback={playback}
      interactive={interactive}
      fallback={fallback}
      onError={onError}
      onAnimationsChange={onAnimationsChange}
      onModelReady={onModelReady}
      onPlaybackComplete={onPlaybackComplete}
      onSceneData={onSceneData}
      onRegisterCameraReset={onRegisterCameraReset}
    />
  );
}

function CheckedAvatarPresenter(props: Omit<AvatarPresenterProps, 'assetStatusOverride'>) {
  const assetStatus = useAvatarAssetsAvailability(
    props.requiredUrls ?? [props.modelUrl],
  );

  return <AvatarPresenterContent {...props} assetStatus={assetStatus} />;
}

interface AvatarPresenterContentProps extends Omit<AvatarPresenterProps, 'assetStatusOverride'> {
  assetStatus: AssetStatus;
}

function AvatarPresenterContent({
  assetStatus,
  className,
  label = 'Animovaný sprievodca',
  modelUrl,
  animationUrl,
  animationName,
  externalAssets,
  bodyShape,
  preserveHipsPosition,
  showSkeleton,
  inspection,
  cameraDistance,
  playback,
  interactive,
  fallback,
  onError,
  onAnimationsChange,
  onModelReady,
  onPlaybackComplete,
  onSceneData,
  onRegisterCameraReset,
}: AvatarPresenterContentProps) {
  if (assetStatus !== 'available') return null;

  const SceneComponent = getLoadedAvatarSceneModule()?.AvatarScene ?? AvatarScene;

  return (
    <AvatarRuntimeBoundary fallback={fallback} onError={onError}>
      <div className={className} role="img" aria-label={label}>
        <Suspense fallback={null}>
          <SceneComponent
            className="h-full w-full"
            modelUrl={modelUrl}
            animationUrl={animationUrl}
            animationName={animationName}
            externalAssets={externalAssets}
            bodyShape={bodyShape}
            preserveHipsPosition={preserveHipsPosition}
            showSkeleton={showSkeleton}
            inspection={inspection}
      cameraDistance={cameraDistance}
            playback={playback}
            interactive={interactive}
            onError={onError}
            onAnimationsChange={onAnimationsChange}
            onModelReady={onModelReady}
            onPlaybackComplete={onPlaybackComplete}
            onSceneData={onSceneData}
            onRegisterCameraReset={onRegisterCameraReset}
          />
        </Suspense>
      </div>
    </AvatarRuntimeBoundary>
  );
}
