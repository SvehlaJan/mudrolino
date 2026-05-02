import { useEffect, useState } from 'react';
import { AVATAR_MODEL_URL } from './avatarConstants';

export type AssetStatus = 'checking' | 'available' | 'missing';

interface AssetAvailabilityState {
  url: string;
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
  const [state, setState] = useState<AssetAvailabilityState>({ url, status: 'checking' });

  useEffect(() => {
    const controller = new AbortController();

    checkAsset(url, controller.signal).then((available) => {
      if (!controller.signal.aborted) {
        setState({ url, status: available ? 'available' : 'missing' });
      }
    });

    return () => controller.abort();
  }, [url]);

  return state.url === url ? state.status : 'checking';
}
