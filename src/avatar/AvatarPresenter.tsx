import { AvatarRuntimeBoundary } from './AvatarRuntimeBoundary';
import { AvatarScene } from './AvatarScene';
import { AVATAR_MODEL_URL } from './avatarConstants';
import { useAvatarAssetAvailability } from './useAvatarAssetAvailability';

interface AvatarPresenterProps {
  className?: string;
  label?: string;
}

export function AvatarPresenter({
  className,
  label = 'Animovaný sprievodca',
}: AvatarPresenterProps) {
  const assetStatus = useAvatarAssetAvailability(AVATAR_MODEL_URL);

  if (assetStatus !== 'available') return null;

  return (
    <AvatarRuntimeBoundary>
      <div className={className} role="img" aria-label={label}>
        <AvatarScene className="h-full w-full" />
      </div>
    </AvatarRuntimeBoundary>
  );
}
