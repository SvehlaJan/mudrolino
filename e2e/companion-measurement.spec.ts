import sharp from 'sharp';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { captureCompanionReview, installCompanionFixture, measureCompanionCharacter } from './support/companionFixture';

test('character measurement waits for the feedback entrance fade to finish', async ({ page }) => {
  // The upper half is less saturated than the blue lower half. At 40% panel
  // opacity the screenshot mask sees only the lower half, although neither
  // the image nor its reserved area has changed size.
  const image = await sharp({ create: { width: 80, height: 80, channels: 4, background: '#a08278' } })
    .composite([{ input: await sharp({ create: { width: 80, height: 40, channels: 4, background: '#1446c8' } }).png().toBuffer(), top: 40, left: 0 }])
    .png().toBuffer();
  await page.setContent(`<div id="panel" style="opacity:.4;transition:opacity 600ms linear;background:white;width:80px">
    <div data-testid="learning-companion"><img alt="" width="80" height="80" src="data:image/png;base64,${image.toString('base64')}" /></div>
  </div>`);
  await page.locator('img').evaluate(async image => {
    if (image instanceof HTMLImageElement) await image.decode();
  });
  await page.evaluate(() => requestAnimationFrame(() => {
    document.getElementById('panel')!.style.opacity = '1';
  }));

  const character = await measureCompanionCharacter(page);

  expect(character).toEqual({ width: 80, height: 80, canvasWidth: 80, canvasHeight: 80 });
  await expect(page.locator('#panel')).toHaveCSS('opacity', '1');
});

test('a review returns character dimensions from its captured scene', async ({ page }, testInfo) => {
  await installCompanionFixture(page);
  const image = await sharp({ create: { width: 80, height: 80, channels: 4, background: '#1446c8' } }).png().toBuffer();
  await page.setContent(`<div data-testid="learning-companion" data-companion-representation="still" data-celebration-key="review:1">
    <img alt="" width="80" height="80" src="data:image/png;base64,${image.toString('base64')}" />
  </div>`);

  const outputBase = join('artifacts/verification/bear-companion/game-reviews', `${testInfo.project.name}-sk-measurement-regression`);
  try {
    const character = await captureCompanionReview(page, testInfo, 'measurement-regression', 'sk', { errors: [], failedRequests: [] });
    expect(character).toEqual({ width: 80, height: 80, canvasWidth: 80, canvasHeight: 80 });
  } finally {
    // Synthetic pixels exercise the capture contract, not catalog appearance.
    await Promise.all(['png', 'json'].map(extension => rm(`${outputBase}.${extension}`, { force: true })));
  }
});
