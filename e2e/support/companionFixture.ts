import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import type { Page, TestInfo } from '@playwright/test';

export const BEAR_FIXTURE_URL = '/__avatar_fixture/bear-v1.glb';
const assetPath = 'assets/avatar/catalog-a/companions/bear-v1/outfit-lod.glb';
const installedFixtureHashes = new WeakMap<Page, string>();

/** Real catalog bytes only. A missing private asset must never become a fake model. */
export async function readBearFixture(): Promise<Buffer> {
  const recovery = 'npm run assets:pull -- --prefix=assets/avatar/catalog-a/companions/bear-v1/';
  try {
    const manifest = JSON.parse(await readFile('assets/avatar/asset-manifest.json', 'utf8')) as {
      files: Record<string, { sha256: string }>;
    };
    const expected = manifest.files[assetPath]?.sha256;
    if (!expected) throw new Error('Bear revision is missing from asset-manifest.json');
    const bytes = await readFile(assetPath);
    if (createHash('sha256').update(bytes).digest('hex') !== expected) {
      throw new Error('SHA-256 differs from the recorded bear revision');
    }
    return bytes;
  } catch (cause) {
    throw new Error(`Bear fixture unavailable or mismatched. Once its private upload is complete, restore it with: ${recovery}. Until then use the matching authoring checkout; see the bear handoff.`, { cause });
  }
}

export async function installCompanionFixture(page: Page): Promise<void> {
  const bytes = await readBearFixture();
  installedFixtureHashes.set(page, createHash('sha256').update(bytes).digest('hex'));
  await page.route(`**${BEAR_FIXTURE_URL}`, route => route.fulfill({
    status: 200,
    contentType: 'model/gltf-binary',
    headers: { 'cache-control': 'public, max-age=31536000, immutable' },
    body: route.request().method() === 'HEAD' ? undefined : bytes,
  }));
  await page.addInitScript(() => {
    window.__E2E__ = { ...window.__E2E__, companionFixture: true };
  });
}

/** Measure the colored character, rather than mistaking a large empty canvas for visibility. */
export async function measureCompanionCharacter(page: Page): Promise<{ width: number; height: number; canvasWidth: number; canvasHeight: number }> {
  const visual = page.getByTestId('learning-companion').locator('canvas, img');
  await visual.evaluate(async element => { if (element instanceof HTMLImageElement) await element.decode(); });
  const png = await visual.screenshot();
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let left = info.width, top = info.height, right = -1, bottom = -1;
  for (let y = 0; y < info.height; y += 1) for (let x = 0; x < info.width; x += 1) {
    const offset = (y * info.width + x) * 4;
    const [r, g, b, a] = data.subarray(offset, offset + 4);
    // Honey fur, blue shirt and blue shoes are saturated; the panel/backdrop is neutral.
    if (a > 128 && Math.max(r, g, b) - Math.min(r, g, b) > 35 && Math.max(r, g, b) > 60) {
      left = Math.min(left, x); top = Math.min(top, y);
      right = Math.max(right, x); bottom = Math.max(bottom, y);
    }
  }
  return { width: right - left + 1, height: bottom - top + 1, canvasWidth: info.width, canvasHeight: info.height };
}

/** Persist only <=320px review copies alongside their exact source/build context. */
export async function captureCompanionReview(page: Page, testInfo: TestInfo, scene: string, locale: string,
  evidence: { errors: string[]; failedRequests: string[] }): Promise<void> {
  const outputDirectory = 'artifacts/verification/bear-companion/game-reviews';
  await mkdir(outputDirectory, { recursive: true });
  const name = `${testInfo.project.name}-${locale}-${scene}`;
  const state = await page.evaluate(() => {
    const companion = document.querySelector('[data-testid="learning-companion"]');
    return { representation: companion?.getAttribute('data-companion-representation') ?? null,
      eventKey: companion?.getAttribute('data-celebration-key') ?? null };
  });
  const character = await measureCompanionCharacter(page);
  const screenshot = await page.screenshot({ animations: 'disabled' });
  await sharp(screenshot).resize({ width: 320, withoutEnlargement: true }).png().toFile(join(outputDirectory, `${name}.png`));
  const modelHash = installedFixtureHashes.get(page);
  if (!modelHash) throw new Error('Install the checked bear fixture before capturing its review');
  const build = JSON.parse(await readFile('dist-e2e/build-identity.json', 'utf8')) as unknown;
  await writeFile(join(outputDirectory, `${name}.json`), `${JSON.stringify({
    capturedAt: new Date().toISOString(), scene, locale, viewport: page.viewportSize(),
    reviewWidth: 320, source: assetPath, sha256: modelHash,
    build, character, errors: [...evidence.errors], failedRequests: [...evidence.failedRequests], ...state,
  }, null, 2)}\n`);
}
