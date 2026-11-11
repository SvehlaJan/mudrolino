import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import type { Page, TestInfo } from '@playwright/test';

export const BEAR_FIXTURE_URL = '/__avatar_fixture/bear-v1.glb';
const assetPath = 'assets/avatar/catalog-a/companions/bear-v2/revisions/celebration-v7/web-v1/model.glb';
const installedFixtureHashes = new WeakMap<Page, string>();

/** Real catalog bytes only. A missing private asset must never become a fake model. */
export async function readBearFixture(): Promise<Buffer> {
  const recovery = 'npm run assets:pull -- --prefix=assets/avatar/catalog-a/companions/bear-v2/revisions/celebration-v7/web-v1/';
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

interface CompanionCharacter { width: number; height: number; canvasWidth: number; canvasHeight: number }
interface CompanionReviewState {
  representation: string | null;
  eventKey: string | null;
  visualRect: { x: number; y: number; width: number; height: number };
}

async function waitForOpaqueCompanion(page: Page) {
  const visual = page.getByTestId('learning-companion').locator('canvas, img');
  await visual.evaluate(async element => { if (element instanceof HTMLImageElement) await element.decode(); });
  // OverlayFrame fades in even under reduced motion. A partially transparent
  // screenshot drops pale fur below the color threshold and falsely shrinks it.
  const element = await visual.elementHandle();
  if (!element) throw new Error('Expected a companion visual to measure');
  try {
    const opaque = await page.waitForFunction(element => {
      if (!element.isConnected) return false;
      for (let ancestor: Element | null = element; ancestor; ancestor = ancestor.parentElement) {
        if (Number(getComputedStyle(ancestor).opacity) !== 1) return false;
      }
      return true;
    }, element, { polling: 'raf', timeout: 1000 });
    await opaque.dispose();
  } catch (error) {
    await element.dispose();
    throw error;
  }
  return element;
}

/** Measure the colored character, rather than mistaking a large empty canvas for visibility. */
export async function measureCompanionCharacter(page: Page): Promise<CompanionCharacter> {
  const element = await waitForOpaqueCompanion(page);
  await element.dispose();
  const visual = page.getByTestId('learning-companion').locator('canvas, img');
  const png = await visual.screenshot();
  return measureCharacterPixels(png);
}

async function measureCharacterPixels(png: Buffer): Promise<CompanionCharacter> {
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
  evidence: { errors: string[]; failedRequests: string[] }): Promise<CompanionCharacter> {
  const outputDirectory = 'artifacts/verification/bear-companion/game-reviews';
  await mkdir(outputDirectory, { recursive: true });
  const name = `${testInfo.project.name}-${locale}-${scene}`;
  const element = await waitForOpaqueCompanion(page);
  let state: CompanionReviewState;
  let screenshot: Buffer;
  try {
    state = await element.evaluate(visual => {
      const companion = visual.closest('[data-testid="learning-companion"]');
      const { x, y, width, height } = visual.getBoundingClientRect();
      return { representation: companion?.getAttribute('data-companion-representation') ?? null,
        eventKey: companion?.getAttribute('data-celebration-key') ?? null,
        visualRect: { x, y, width, height } };
    });
    if (!state.eventKey || !state.representation) throw new Error('Expected an active companion review scene');
    // One screenshot supplies both the review and its character measurement.
    // Avoid locator.screenshot's scroll/stability roundtrips during a brief reaction.
    screenshot = await page.screenshot({ animations: 'disabled', scale: 'css' });
    const unchanged = await element.evaluate((visual, before) => {
      const companion = visual.closest('[data-testid="learning-companion"]');
      const bounds = visual.getBoundingClientRect();
      return visual.isConnected
        && companion?.getAttribute('data-celebration-key') === before.eventKey
        && companion?.getAttribute('data-companion-representation') === before.representation
        && [[bounds.x, before.visualRect.x], [bounds.y, before.visualRect.y],
          [bounds.width, before.visualRect.width], [bounds.height, before.visualRect.height]]
          .every(([after, before]) => Math.abs(after - before) < .5);
    }, state);
    if (!unchanged) throw new Error('Companion changed during review capture; refusing mismatched pixels and metadata');
  } finally {
    await element.dispose();
  }
  const { x, y, width, height } = state.visualRect;
  const left = Math.floor(x), top = Math.floor(y);
  const characterPng = await sharp(screenshot).extract({ left, top, width: Math.ceil(x + width) - left, height: Math.ceil(y + height) - top }).png().toBuffer();
  const character = await measureCharacterPixels(characterPng);
  await sharp(screenshot).resize({ width: 320, withoutEnlargement: true }).png().toFile(join(outputDirectory, `${name}.png`));
  const modelHash = installedFixtureHashes.get(page);
  if (!modelHash) throw new Error('Install the checked bear fixture before capturing its review');
  const build = JSON.parse(await readFile('dist-e2e/build-identity.json', 'utf8')) as unknown;
  await writeFile(join(outputDirectory, `${name}.json`), `${JSON.stringify({
    capturedAt: new Date().toISOString(), scene, locale, viewport: page.viewportSize(),
    reviewWidth: 320, source: assetPath, sha256: modelHash,
    build, character, errors: [...evidence.errors], failedRequests: [...evidence.failedRequests], ...state,
  }, null, 2)}\n`);
  return character;
}
