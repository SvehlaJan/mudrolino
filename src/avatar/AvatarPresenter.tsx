import { AvatarRuntimeBoundary } from './AvatarRuntimeBoundary';
import { AvatarScene } from './AvatarScene';
import { AVATAR_MODEL_URL } from './avatarConstants';
import { AvatarBodyShapeConfig, AvatarSlotSelections } from './avatarTypes';
import { useAvatarAssetAvailability } from './useAvatarAssetAvailability';

interface AvatarPresenterProps {
  className?: string;
  label?: string;
  modelUrl?: string;
  animationUrl?: string;
  animationName?: string | null;
  slotSelections?: AvatarSlotSelections;
  bodyShape?: AvatarBodyShapeConfig;
  onAnimationsChange?: (names: string[]) => void;
}

export function AvatarPresenter({
  className,
  label = 'Animovaný sprievodca',
  modelUrl = AVATAR_MODEL_URL,
  animationUrl,
  animationName,
  slotSelections,
  bodyShape,
  onAnimationsChange,
}: AvatarPresenterProps) {
  const assetStatus = useAvatarAssetAvailability(modelUrl);

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
          onAnimationsChange={onAnimationsChange}
        />
      </div>
    </AvatarRuntimeBoundary>
  );
}
