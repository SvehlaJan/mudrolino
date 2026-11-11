import { GLTFLoader, type GLTF } from 'three-stdlib';
import { registerCompanionModelPrewarmer } from './avatarSceneLoader';
import { companionResources } from './companionResources';

export interface CompanionModelLoader {
  (url: string): Promise<GLTF>;
  getLoaded(url: string): GLTF | undefined;
}

/** One parsed scene or one rejected parse per immutable URL, for this page visit.
 * Callers handle rejection before mounting R3F: the installed Fiber release
 * reports even boundary-caught render errors through window.reportError. */
export function createCompanionModelLoader(load: (url: string) => Promise<GLTF>): CompanionModelLoader {
  const prepared = new Map<string, Promise<GLTF>>();
  const resolved = new Map<string, GLTF>();
  const loader = ((url: string): Promise<GLTF> => {
    let model = prepared.get(url);
    if (!model) {
      model = Promise.resolve().then(() => load(url)).then(gltf => {
        resolved.set(url, gltf);
        return gltf;
      });
      prepared.set(url, model);
    }
    return model;
  }) as CompanionModelLoader;
  loader.getLoaded = (url: string) => resolved.get(url);
  return loader;
}

/** Uses only the resource store's validated body, with no second GET. Parsing is
 * still distinct from fetching and from onModelReady's mounted-renderer signal.
 * The gallery retains its independent Drei loader/cache. */
export const loadCompanionModel = createCompanionModelLoader(url => {
  const bytes = companionResources.getModelBytes(url);
  if (!bytes) return Promise.reject(new Error('Companion model bytes are not prepared'));
  const origin = typeof window === 'undefined' ? 'http://localhost/' : window.location.href;
  const basePath = new URL('.', new URL(url, origin)).href;
  return new GLTFLoader().parseAsync(bytes, basePath).then(gltf => {
    companionResources.releaseModelBytes(url);
    return gltf;
  });
});

registerCompanionModelPrewarmer(url => {
  void loadCompanionModel(url).catch(() => {});
});
