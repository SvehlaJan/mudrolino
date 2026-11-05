import publishedManifest from './companions/bear-v1.json';

export interface CompanionManifest {
  schemaVersion: 1;
  id: 'bear-v1';
  accepted: boolean;
  modelUrl: string | null;
  sha256: string | null;
  bytes: number | null;
  animationName: 'celebrate';
  durationMs: 1400;
}

export interface CompanionConfig {
  id: 'bear-v1';
  modelUrl: string;
  animationName: 'celebrate';
  durationMs: 1400;
}

const fixtureConfig: CompanionConfig = {
  id: 'bear-v1',
  modelUrl: '/__avatar_fixture/bear-v1.glb',
  animationName: 'celebrate',
  durationMs: 1400,
};

export function resolveCompanionConfig(manifest: unknown, fixtureEnabled = false): CompanionConfig | null {
  if (fixtureEnabled) return fixtureConfig;
  if (!manifest || typeof manifest !== 'object') return null;
  const candidate = manifest as Partial<CompanionManifest>;
  if (candidate.schemaVersion !== 1 || candidate.id !== 'bear-v1'
    || candidate.accepted !== true || typeof candidate.modelUrl !== 'string'
    || typeof candidate.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(candidate.sha256)
    || !Number.isSafeInteger(candidate.bytes) || !(candidate.bytes! > 0)
    || candidate.animationName !== 'celebrate' || candidate.durationMs !== 1400) return null;
  try {
    if (new URL(candidate.modelUrl).protocol !== 'https:') return null;
  } catch {
    return null;
  }
  return { id: 'bear-v1', modelUrl: candidate.modelUrl, animationName: 'celebrate', durationMs: 1400 };
}

/**
 * Test builds opt into a fixed local asset; published builds never read fixture globals.
 * `npm run dev` shows the approved bear from this checkout before it is published when
 * VITE_AVATAR_LOCAL_COMPANION is "true"; the dev server serves the same fixture URL.
 */
export function getCompanionConfig(): CompanionConfig | null {
  if (import.meta.env.MODE === 'test') {
    return typeof window !== 'undefined' && window.__E2E__?.companionFixture === true
      ? resolveCompanionConfig(null, true)
      : null;
  }
  if (import.meta.env.MODE === 'development' && import.meta.env.VITE_AVATAR_LOCAL_COMPANION === 'true') {
    return resolveCompanionConfig(null, true);
  }
  return resolveCompanionConfig(publishedManifest);
}
