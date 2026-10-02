import { readFile } from 'node:fs/promises';
import { afterEach, describe, expect, it, vi } from 'vitest';
import verifyBuild from './verifyBuild';

vi.mock('node:fs/promises', () => ({ readFile: vi.fn() }));
const fetchIdentity = vi.fn();

function config(mode: 'test' | 'production'): Parameters<typeof verifyBuild>[0] {
  return {
    metadata: { expectedBuildMode: mode, expectedBuildDirectory: mode === 'test' ? 'dist-e2e' : 'dist' },
    projects: [{ use: { baseURL: 'http://127.0.0.1:4173' } }],
  };
}

function identities(local: unknown, served: unknown) {
  vi.mocked(readFile).mockResolvedValue(JSON.stringify(local));
  fetchIdentity.mockResolvedValue({ ok: true, json: async () => served });
  vi.stubGlobal('fetch', fetchIdentity);
}

afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe('browser build identity guard', () => {
  it.each(['test', 'production'] as const)('accepts the matching local %s build', async mode => {
    identities({ mode, fingerprint: 'build-a' }, { mode, fingerprint: 'build-a' });
    await expect(verifyBuild(config(mode))).resolves.toBeUndefined();
    expect(fetchIdentity.mock.calls[0][0].pathname).toBe('/build-identity.json');
    expect(vi.mocked(readFile).mock.calls[0][0]).toMatch(
      mode === 'test' ? /dist-e2e\/build-identity\.json$/ : /dist\/build-identity\.json$/,
    );
  });

  it('rejects a local production bundle under the integration profile before any browser request', async () => {
    identities({ mode: 'production', fingerprint: 'build-a' }, { mode: 'production', fingerprint: 'build-a' });
    await expect(verifyBuild(config('test'))).rejects.toThrow('Expected test assets');
    expect(fetchIdentity).not.toHaveBeenCalled();
  });

  it.each([
    { mode: 'production', fingerprint: 'build-a' },
    { mode: 'test', fingerprint: 'stale-build' },
  ])('rejects a served mode or fingerprint mismatch', async served => {
    identities({ mode: 'test', fingerprint: 'build-a' }, served);
    await expect(verifyBuild(config('test'))).rejects.toThrow('does not serve the local test build');
  });

  it('rejects a server without a valid build identity', async () => {
    identities({ mode: 'test', fingerprint: 'build-a' }, { mode: 'test' });
    await expect(verifyBuild(config('test'))).rejects.toThrow('non-empty fingerprint');
  });
});
