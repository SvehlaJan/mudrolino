import { loadAvatarSceneModule } from './avatarSceneLoader';

export interface CompanionPreparationDependencies {
  fetchModel(url: string): Promise<Response>;
  loadScene(): Promise<unknown>;
}

export type CompanionResourceStatus = 'disabled' | 'loading' | 'ready' | 'failed';

export interface CompanionResource {
  readonly status: CompanionResourceStatus;
  readonly modelUrl: string | null;
}

export interface CompanionResourceStore {
  prepare(url: string | null): Promise<CompanionResource>;
  getSnapshot(url: string | null): CompanionResource;
  subscribe(listener: () => void): () => void;
  fail(url: string): void;
  /** Validated bytes retained for the lazy parser; this never starts work. */
  getModelBytes(url: string): ArrayBuffer | null;
}

interface ResourceEntry {
  snapshot: CompanionResource;
  promise: Promise<CompanionResource> | null;
  bytes: ArrayBuffer | null;
}

/** Ready only proves the scene chunk and model bytes were fetched, not rendered. */
export function createCompanionResources(dependencies: CompanionPreparationDependencies): CompanionResourceStore {
  const disabled: CompanionResource = { status: 'disabled', modelUrl: null };
  const disabledPromise = Promise.resolve(disabled);
  const entries = new Map<string, ResourceEntry>();
  const listeners = new Set<() => void>();

  function entryFor(url: string): ResourceEntry {
    let entry = entries.get(url);
    if (!entry) {
      entry = { snapshot: { status: 'loading', modelUrl: url }, promise: null, bytes: null };
      entries.set(url, entry);
    }
    return entry;
  }

  function update(entry: ResourceEntry, status: 'ready' | 'failed'): void {
    if (entry.snapshot.status === status || entry.snapshot.status === 'failed') return;
    entry.snapshot = { ...entry.snapshot, status };
    listeners.forEach(listener => listener());
  }

  return {
    getModelBytes: url => entries.get(url)?.bytes ?? null,
    getSnapshot: url => url === null ? disabled : entryFor(url).snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    fail(url) {
      const entry = entryFor(url);
      if (entry.snapshot.status === 'failed') return;
      update(entry, 'failed');
      entry.promise = Promise.resolve(entry.snapshot);
    },
    prepare(url) {
      if (url === null) return disabledPromise;
      const entry = entryFor(url);
      if (entry.promise) return entry.promise;

      // Async functions capture synchronous dependency errors while starting both operations now.
      const model = (async () => {
        const response = await dependencies.fetchModel(url);
        if (!response.ok) throw new Error('Companion model HTTP failure');
        const data = await response.arrayBuffer();
        const bytes = new Uint8Array(data);
        if (bytes.length < 4 || bytes[0] !== 0x67 || bytes[1] !== 0x6c
          || bytes[2] !== 0x54 || bytes[3] !== 0x46) throw new Error('Invalid companion GLB');
        entry.bytes = data;
      })();
      const scene = (async () => { await dependencies.loadScene(); })();
      entry.promise = Promise.all([model, scene]).then(
        () => { update(entry, 'ready'); return entry.snapshot; },
        () => { update(entry, 'failed'); return entry.snapshot; },
      );
      return entry.promise;
    },
  };
}

export const companionResources = createCompanionResources({
  fetchModel: url => fetch(url, { cache: 'force-cache' }),
  loadScene: loadAvatarSceneModule,
});
