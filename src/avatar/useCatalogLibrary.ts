import { useCallback, useEffect, useRef, useState } from 'react';
import type { CatalogLibraryManifest } from './catalogLibrary';

/** One request at a time, retaining the last good revision through transient failures. */
export function useCatalogLibrary() {
  const [manifest, setManifest] = useState<CatalogLibraryManifest | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(true);
  const refreshRef = useRef<(() => void) | null>(null);
  const retry = useCallback(() => refreshRef.current?.(), []);

  useEffect(() => {
    let disposed = false;
    let controller: AbortController | null = null;
    let timer: ReturnType<typeof setInterval> | undefined;
    async function refresh() {
      if (controller || disposed) return;
      const request = new AbortController();
      controller = request;
      setRefreshing(true);
      try {
        const response = await fetch('/__avatar_catalog/library.json', { signal: request.signal, cache: 'no-store' });
        if (!response.ok) throw new Error(`Catalog inventory unavailable (${response.status}).`);
        const next: CatalogLibraryManifest = await response.json();
        if (!next || !Array.isArray(next.assets) || typeof next.version !== 'string' || !next.animations) {
          throw new Error('The catalog inventory is incomplete. Check the source metadata and retry.');
        }
        if (!disposed) {
          setManifest(current => current?.version === next.version ? current : next);
          setError('');
        }
      } catch (reason) {
        if (!disposed && !request.signal.aborted) setError(reason instanceof Error ? reason.message : 'Catalog inventory unavailable.');
      } finally {
        controller = null;
        if (!disposed) setRefreshing(false);
      }
    }
    function syncVisibility() {
      if (timer) clearInterval(timer);
      timer = undefined;
      if (document.visibilityState === 'visible') {
        void refresh();
        timer = setInterval(() => void refresh(), 5000);
      }
    }
    refreshRef.current = () => { void refresh(); };
    document.addEventListener('visibilitychange', syncVisibility);
    syncVisibility();
    return () => {
      disposed = true;
      controller?.abort();
      if (timer) clearInterval(timer);
      refreshRef.current = null;
      document.removeEventListener('visibilitychange', syncVisibility);
    };
  }, []);
  return { manifest, error, refreshing, retry, stale: Boolean(manifest && error) };
}
