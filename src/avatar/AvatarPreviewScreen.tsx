import { Navigate, useSearchParams } from 'react-router-dom';
import { AvatarAssetGallery } from './AvatarAssetGallery';
import { AvatarRuntimeFixture } from './AvatarRuntimeFixture';

export function AvatarPreviewScreen() {
  const [params] = useSearchParams();
  if (params.get('agent') === '1') return <AvatarRuntimeFixture />;
  if (!import.meta.env.DEV) return <Navigate to="/" replace />;
  // Preserve saved catalog links through the current gallery, without the old UI.
  if (params.has('model')) {
    const next = new URLSearchParams(params);
    if (!next.has('asset')) next.set('asset', next.get('model') ?? '');
    next.delete('model');
    return <Navigate to={`/avatar-preview?${next.toString()}`} replace />;
  }
  return <AvatarAssetGallery />;
}
