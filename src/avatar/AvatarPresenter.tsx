import { AvatarRuntimeBoundary } from './AvatarRuntimeBoundary';
import { AvatarScene } from './AvatarScene';
import { AvatarExternalAsset } from './avatarAssetResolver';
import { AVATAR_MODEL_URL } from './avatarConstants';
import { AvatarBodyShapeConfig, AvatarSlotSelections } from './avatarTypes';
import { AssetStatus, useAvatarAssetsAvailability } from './useAvatarAssetAvailability';

interface AvatarPresenterProps {
  className?: string;
  label?: string;
  modelUrl?: string;
  animationUrl?: string;
  animationName?: string | null;
  slotSelections?: AvatarSlotSelections;
  embeddedMeshNames?: string[];
  externalAssets?: AvatarExternalAsset[];
  requiredUrls?: string[];
  bodyShape?: AvatarBodyShapeConfig;
  preserveHipsPosition?: boolean;
  assetStatusOverride?: AssetStatus;
  onAnimationsChange?: (names: string[]) => void;
  onModelReady?: () => void;
}

export function AvatarPresenter({
  className,
  label = 'Animovaný sprievodca',
  modelUrl = AVATAR_MODEL_URL,
  animationUrl,
  animationName,
  slotSelections,
  embeddedMeshNames,
  externalAssets,
  requiredUrls,
  bodyShape,
  preserveHipsPosition,
  assetStatusOverride,
  onAnimationsChange,
  onModelReady,
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
        slotSelections={slotSelections}
        embeddedMeshNames={embeddedMeshNames}
        externalAssets={externalAssets}
        requiredUrls={requiredUrls}
        bodyShape={bodyShape}
        preserveHipsPosition={preserveHipsPosition}
        onAnimationsChange={onAnimationsChange}
        onModelReady={onModelReady}
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
      slotSelections={slotSelections}
      embeddedMeshNames={embeddedMeshNames}
      externalAssets={externalAssets}
      requiredUrls={requiredUrls}
      bodyShape={bodyShape}
      preserveHipsPosition={preserveHipsPosition}
      onAnimationsChange={onAnimationsChange}
      onModelReady={onModelReady}
    />
  );
}

function CheckedAvatarPresenter(props: Omit<AvatarPresenterProps, 'assetStatusOverride'>) {
  const assetStatus = useAvatarAssetsAvailability(
    props.requiredUrls ?? [props.modelUrl ?? AVATAR_MODEL_URL],
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
  modelUrl = AVATAR_MODEL_URL,
  animationUrl,
  animationName,
  slotSelections,
  embeddedMeshNames,
  externalAssets,
  bodyShape,
  preserveHipsPosition,
  onAnimationsChange,
  onModelReady,
}: AvatarPresenterContentProps) {
  if (assetStatus !== 'available') return null;

  return (
    <AvatarRuntimeBoundary>
      <div className={className} role="img" aria-label={label}>
        <AvatarScene
          className="h-full w-full"
          modelUrl={modelUrl}
          animationUrl={animationUrl}
          animationName={animationName}
          slotSelections={slotSelections}
          embeddedMeshNames={embeddedMeshNames}
          externalAssets={externalAssets}
          bodyShape={bodyShape}
          preserveHipsPosition={preserveHipsPosition}
          onAnimationsChange={onAnimationsChange}
          onModelReady={onModelReady}
        />
      </div>
    </AvatarRuntimeBoundary>
  );
}
