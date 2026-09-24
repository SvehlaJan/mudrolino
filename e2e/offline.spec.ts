import { expect, test } from '@playwright/test';
import { RELEASE_GAME_CASES } from './support/releaseMatrix';

async function waitForOfflineControl(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  if (!await page.evaluate(() => Boolean(navigator.serviceWorker.controller))) {
    await page.reload();
  }
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
}

test('installed production shell opens every game and protected routes offline', async ({ page, context }) => {
  await waitForOfflineControl(page);
  await context.setOffline(true);

  await page.reload();
  await expect(page.getByRole('main')).toBeVisible();
  for (const game of RELEASE_GAME_CASES) {
    await page.goto(game.path);
    await expect(page.getByRole('button', { name: 'Hrať' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('button', { name: 'Hrať' })).toBeVisible();
  }

  await page.goto('/settings');
  await expect(page.getByRole('dialog', { name: 'Pre rodičov' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Nastavenia' })).toHaveCount(0);
});

test('bundled literacy and numeracy rounds start offline', async ({ page, context }) => {
  await waitForOfflineControl(page);
  await context.setOffline(true);

  for (const path of ['/alphabet', '/counting']) {
    await page.goto(path);
    await page.getByRole('button', { name: 'Hrať' }).click();
    await expect(page.getByTestId('game-visible-instruction')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Zopakovať zadanie' })).toBeVisible();
  }
});

test('production manifest and icons are served for installation', async ({ page, request }) => {
  await page.goto('/');
  const manifestLink = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(manifestLink).toBeTruthy();
  const manifestResponse = await request.get(manifestLink!);
  expect(manifestResponse.ok()).toBe(true);
  const manifest = await manifestResponse.json() as { start_url: string; icons: Array<{ src: string }> };
  expect(manifest.start_url).toBe('/');
  for (const icon of manifest.icons) {
    expect((await request.get(icon.src)).ok(), `manifest icon ${icon.src}`).toBe(true);
  }
});
