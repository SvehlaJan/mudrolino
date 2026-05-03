import { AvatarRuntimeBoundary } from './AvatarRuntimeBoundary';
import { AvatarScene } from './AvatarScene';
import { AVATAR_MODEL_URL } from './avatarConstants';
import { AvatarBodyShapeConfig, AvatarSlotSelections } from './avatarTypes';
import { AssetStatus, useAvatarAssetAvailability } from './useAvatarAssetAvailability';

interface AvatarPresenterProps {
  className?: string;
  label?: string;
  modelUrl?: string;
  animationUrl?: string;
  animationName?: string | null;
  slotSelections?: AvatarSlotSelections;
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
      bodyShape={bodyShape}
      preserveHipsPosition={preserveHipsPosition}
      onAnimationsChange={onAnimationsChange}
      onModelReady={onModelReady}
    />
  );
}

function CheckedAvatarPresenter(props: Omit<AvatarPresenterProps, 'assetStatusOverride'>) {
  const assetStatus = useAvatarAssetAvailability(props.modelUrl);

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
          bodyShape={bodyShape}
          preserveHipsPosition={preserveHipsPosition}
          onAnimationsChange={onAnimationsChange}
          onModelReady={onModelReady}
        />
      </div>
    </AvatarRuntimeBoundary>
  );
}
