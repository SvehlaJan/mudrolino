import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { FullConfig } from '@playwright/test';

interface BuildIdentity {
  mode: string;
  fingerprint: string;
}

function parseIdentity(value: unknown, source: string): BuildIdentity {
  if (!value || typeof value !== 'object'
    || !('mode' in value) || typeof value.mode !== 'string'
    || !('fingerprint' in value) || typeof value.fingerprint !== 'string' || !value.fingerprint) {
    throw new Error(`${source} must contain a build mode and non-empty fingerprint`);
  }
  return { mode: value.mode, fingerprint: value.fingerprint };
}

/** Playwright starts its web server before global setup; reject stale or wrong-mode assets. */
export default async function verifyBuild(
  config: Pick<FullConfig, 'metadata'> & { projects: ReadonlyArray<{ use: { baseURL?: string } }> },
): Promise<void> {
  const { expectedBuildMode, expectedBuildDirectory } = config.metadata;
  if ((expectedBuildMode !== 'test' && expectedBuildMode !== 'production')
    || (expectedBuildDirectory !== 'dist-e2e' && expectedBuildDirectory !== 'dist')) {
    throw new Error('Browser profile must declare its expected build mode and directory');
  }
  const localPath = resolve(process.cwd(), expectedBuildDirectory, 'build-identity.json');
  const local = parseIdentity(JSON.parse(await readFile(localPath, 'utf8')), localPath);
  if (local.mode !== expectedBuildMode) {
    throw new Error(`Expected ${expectedBuildMode} assets in ${expectedBuildDirectory}; found ${local.mode}`);
  }
  const baseURL = config.projects[0]?.use.baseURL;
  if (!baseURL) throw new Error('Browser profile must declare a baseURL');
  const response = await fetch(new URL('/build-identity.json', baseURL));
  if (!response.ok) throw new Error(`Build identity request failed: HTTP ${response.status}`);
  const served = parseIdentity(await response.json(), 'Served build identity');
  if (served.mode !== expectedBuildMode || served.fingerprint !== local.fingerprint) {
    throw new Error(`Browser server does not serve the local ${expectedBuildMode} build (${local.fingerprint})`);
  }
}
