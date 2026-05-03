import { useEffect, useState } from 'react';
import { AVATAR_MODEL_URL } from './avatarConstants';

export type AssetStatus = 'checking' | 'available' | 'missing';

interface AssetAvailabilityState {
  key: string;
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
  const key = JSON.stringify(urls);

  const [state, setState] = useState<AssetAvailabilityState>({
    key,
    status: urls.length === 0 ? 'missing' : 'checking',
  });

  useEffect(() => {
    const requestUrls = urls;
    if (requestUrls.length === 0) return;

    const controller = new AbortController();

    Promise.all(requestUrls.map((url) => checkAsset(url, controller.signal))).then((availability) => {
      if (!controller.signal.aborted) {
        setState({ key, status: availability.every(Boolean) ? 'available' : 'missing' });
      }
    });

    return () => controller.abort();
    // `key` tracks URL-list contents without forcing callers to memoize array props.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (urls.length === 0) return 'missing';
  return state.key === key ? state.status : 'checking';
}
