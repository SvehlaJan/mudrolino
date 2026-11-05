import { afterEach, describe, expect, it, vi } from 'vitest';
import manifest from './companions/bear-v1.json';
import { getCompanionConfig, resolveCompanionConfig } from './companionConfig';

const published = {
  schemaVersion: 1, id: 'bear-v1', accepted: true,
  modelUrl: 'https://assets.example.test/bear-v1.glb',
  sha256: 'a'.repeat(64), bytes: 1024,
  animationName: 'celebrate', durationMs: 1400,
};

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('companion publication configuration', () => {
  it('keeps the unpublished manifest disabled', () => {
    expect(resolveCompanionConfig(manifest)).toBeNull();
  });

  it('resolves accepted and complete publication metadata', () => {
    expect(resolveCompanionConfig(published)).toEqual({
      id: 'bear-v1', modelUrl: published.modelUrl,
      animationName: 'celebrate', durationMs: 1400,
    });
  });

  it.each([
    null, {}, { ...published, accepted: false }, { ...published, accepted: 'true' },
    { ...published, schemaVersion: 2 }, { ...published, id: 'other' },
    { ...published, modelUrl: null }, { ...published, modelUrl: '/bear.glb' },
    { ...published, modelUrl: 'http://assets.example.test/bear.glb' },
    { ...published, modelUrl: 'https://' },
    { ...published, sha256: null }, { ...published, sha256: 'a'.repeat(63) },
    { ...published, sha256: 'G'.repeat(64) }, { ...published, sha256: 'A'.repeat(64) },
    { ...published, bytes: null }, { ...published, bytes: 0 },
    { ...published, bytes: -1 }, { ...published, bytes: 1.5 },
    { ...published, bytes: Infinity }, { ...published, animationName: 'walk' },
    { ...published, durationMs: 0 }, { ...published, durationMs: 1401 },
  ])('rejects incomplete or malformed publication: %j', candidate => {
    expect(resolveCompanionConfig(candidate)).toBeNull();
  });

  it('uses only the known fixture URL even for a caller-supplied manifest', () => {
    expect(resolveCompanionConfig({ ...published, modelUrl: 'https://untrusted.test/a.glb' }, true))
      .toEqual({ id: 'bear-v1', modelUrl: '/__avatar_fixture/bear-v1.glb', animationName: 'celebrate', durationMs: 1400 });
  });

  it('defaults the test build to disabled and enables only a boolean fixture flag', () => {
    vi.stubEnv('MODE', 'test');
    vi.stubGlobal('window', {});
    expect(getCompanionConfig()).toBeNull();
    vi.stubGlobal('window', { __E2E__: { companionFixture: 'https://untrusted.test/a.glb' } });
    expect(getCompanionConfig()).toBeNull();
    vi.stubGlobal('window', { __E2E__: { companionFixture: true } });
    expect(getCompanionConfig()?.modelUrl).toBe('/__avatar_fixture/bear-v1.glb');
  });

  it.each(['production', 'development'])('ignores fixture globals in %s', mode => {
    vi.stubEnv('MODE', mode);
    vi.stubGlobal('window', { __E2E__: { companionFixture: true } });
    expect(getCompanionConfig()).toBeNull();
  });

  it('shows the local bear in development only when asked', () => {
    vi.stubEnv('MODE', 'development');
    vi.stubEnv('VITE_AVATAR_LOCAL_COMPANION', 'false');
    expect(getCompanionConfig()).toBeNull();
    vi.stubEnv('VITE_AVATAR_LOCAL_COMPANION', 'true');
    expect(getCompanionConfig()?.modelUrl).toBe('/__avatar_fixture/bear-v1.glb');
  });

  it.each(['production', 'test'])('ignores the local bear switch in %s', mode => {
    vi.stubEnv('MODE', mode);
    vi.stubEnv('VITE_AVATAR_LOCAL_COMPANION', 'true');
    vi.stubGlobal('window', {});
    expect(getCompanionConfig()).toBeNull();
  });
});
