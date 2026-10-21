import { GLTFLoader, type GLTF } from 'three-stdlib';
import { companionResources } from './companionResources';

/** One parsed scene or one rejected parse per immutable URL, for this page visit.
 * Callers handle rejection before mounting R3F: the installed Fiber release
 * reports even boundary-caught render errors through window.reportError. */
export function createCompanionModelLoader(load: (url: string) => Promise<GLTF>) {
  const prepared = new Map<string, Promise<GLTF>>();
  return (url: string): Promise<GLTF> => {
    let model = prepared.get(url);
    if (!model) {
      model = Promise.resolve().then(() => load(url));
      prepared.set(url, model);
    }
    return model;
  };
}

/** Uses only the resource store's validated body, with no second GET. Parsing is
 * still distinct from fetching and from onModelReady's mounted-renderer signal.
 * The gallery retains its independent Drei loader/cache. */
export const loadCompanionModel = createCompanionModelLoader(url => {
  const bytes = companionResources.getModelBytes(url);
  if (!bytes) return Promise.reject(new Error('Companion model bytes are not prepared'));
  const basePath = new URL('.', new URL(url, window.location.href)).href;
  return new GLTFLoader().parseAsync(bytes, basePath);
});
