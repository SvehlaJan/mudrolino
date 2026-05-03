import { useEffect, useMemo, useState } from 'react';
import { AVATAR_MODEL_URL } from './avatarConstants';

export type AssetStatus = 'checking' | 'available' | 'missing';

interface AssetAvailabilityRequest {
  key: string;
  urls: string[];
}

interface AssetAvailabilityState {
  request: AssetAvailabilityRequest;
  status: AssetStatus;
}

async function checkAsset(url: string, signal: AbortSignal): Promise<boolean> {
  try {
    const head = await fetch(url, { method: 'HEAD', signal });
    if (head.ok) return true;
    if (head.status !== 405) return false;
  } catch {
    if (signal.aborted) return false;
  }

  try {
    const get = await fetch(url, {
      method: 'GET',
      headers: { Range: 'bytes=0-0' },
      signal,
    });
    return get.ok || get.status === 206;
  } catch {
    return false;
  }
}

export function useAvatarAssetAvailability(url = AVATAR_MODEL_URL): AssetStatus {
  return useAvatarAssetsAvailability([url]);
}

export function useAvatarAssetsAvailability(urls: string[]): AssetStatus {
  const key = urls.join('|');
  const request = useMemo<AssetAvailabilityRequest>(
    () => ({
      key,
      urls: key.length > 0 ? key.split('|') : [],
    }),
    [key],
  );
  const [state, setState] = useState<AssetAvailabilityState>({
    request,
    status: request.urls.length === 0 ? 'missing' : 'checking',
  });

  useEffect(() => {
    if (request.urls.length === 0) return;

    const controller = new AbortController();

    Promise.all(request.urls.map((url) => checkAsset(url, controller.signal))).then((availability) => {
      if (!controller.signal.aborted) {
        setState({ request, status: availability.every(Boolean) ? 'available' : 'missing' });
      }
    });

    return () => controller.abort();
  }, [request]);

  if (request.urls.length === 0) return 'missing';
  return state.request === request ? state.status : 'checking';
}
