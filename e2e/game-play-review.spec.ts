import { expect, test, type Locator } from './support/fixtures';
import { getE2EState } from './support/e2eHook';
import { waitForGamePhase } from './support/gameHarness';

async function expectUnclippedShadows(controls: Locator) {
  const clipping = await controls.evaluateAll(elements => elements.flatMap(element => {
    const box = element.getBoundingClientRect();
    const problems: string[] = [];
    for (let parent = element.parentElement; parent; parent = parent.parentElement) {
      const style = getComputedStyle(parent);
      const bounds = parent.getBoundingClientRect();
      if (['auto', 'hidden', 'scroll', 'clip'].includes(style.overflowY) && box.bottom + 5 > bounds.bottom + 1) {
        problems.push(`${element.getAttribute('aria-label')}: bottom shadow clipped by ${parent.getAttribute('role') ?? parent.tagName}`);
      }
    }
    return problems;
  }));
  expect(clipping).toEqual([]);
}

test('review: number answers keep retry feedback off the card', async ({ page }) => {
  await page.setViewportSize({ width: 1107, height: 853 });
  await page.goto('/numbers');
  await page.getByRole('button', { name: 'Hrať' }).click();
  const state = await getE2EState<{ correctItemId: string; gridItemIds: string[] }>(page);
  const wrong = state.gridItemIds.find(id => id !== state.correctItemId)!;
  const tile = page.locator(`[data-answer-id=${JSON.stringify(wrong)}]`);
  await tile.click();
  await page.waitForFunction(() => window.__E2E__?.gamePhase === 'answered-incorrectly', undefined, { polling: 10 });
  expect(await tile.textContent()).not.toContain('Skús ešte raz');
  await expect(page.getByTestId('game-retry-status')).toContainText('Skús ešte raz');
});

test('review: ten counting items remain tappable at narrow and short sizes', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.addInitScript(() => localStorage.setItem('hrave-ucenie-settings', JSON.stringify({ countingRange: { start: 1, end: 10 } })));
  await page.goto('/counting');
  await page.evaluate(() => { let first = true; Math.random = () => { if (first) { first = false; return 0; } return 0.999; }; });
  await page.getByRole('button', { name: 'Hrať' }).click();
  for (const viewport of [{ width: 320, height: 568 }, { width: 667, height: 375 }]) {
    await page.setViewportSize(viewport);
    const counters = page.getByRole('button', { name: /^Predmet \d+ z 10$/ });
    await expect(counters).toHaveCount(10);
    for (const counter of await counters.all()) {
      const box = await counter.boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(48);
      expect(box!.height).toBeGreaterThanOrEqual(48);
    }
  }
});

for (const route of ['/counting', '/compare']) {
  test(`review: ${route} answer shadows are not cut off`, async ({ page }) => {
    await page.setViewportSize({ width: 1107, height: 853 });
    await page.goto(route);
    await page.getByRole('button', { name: 'Hrať' }).click();
    await waitForGamePhase(page, 'awaiting-answer');
    await expectUnclippedShadows(page.locator('[data-testid="game-answer-region"] > button'));
  });

  test(`review: ${route} has scattered stable counters and complete answer shadows`, async ({ page }) => {
    await page.setViewportSize({ width: 1107, height: 853 });
    await page.addInitScript(() => {
      localStorage.setItem('hrave-ucenie-settings', JSON.stringify({ countingRange: { start: 1, end: 5 }, compareRange: { start: 1, end: 5 }, compareMode: 'objects' }));
    });
    await page.goto(route);
    await page.evaluate(path => {
      let calls = 0;
      Math.random = path === '/counting'
        ? () => calls++ === 0 ? 0 : 0.999999
        : () => calls++ === 0 ? 0.999999 : 0;
    }, route);
    await page.getByRole('button', { name: 'Hrať' }).click();
    await waitForGamePhase(page, 'awaiting-answer');
    const tray = page.locator('[data-quantity-mode="objects"]').first();
    const tokens = tray.locator('[data-quantity-token]');
    await expect(tokens).not.toHaveCount(0);
    const positions = () => tokens.evaluateAll(elements => elements.map(element => {
      const box = element.getBoundingClientRect();
      return { x: box.x, y: box.y, size: box.width };
    }));
    const before = await positions();
    expect(new Set(before.map(position => position.y)).size).toBe(before.length);
    if (route === '/counting') await tokens.first().click();
    await expect(page.getByRole('button', { name: 'Zopakovať zadanie' })).toBeEnabled();
    await page.getByRole('button', { name: 'Zopakovať zadanie' }).click();
    await waitForGamePhase(page, 'awaiting-answer');
    await expect.poll(positions).toEqual(before);
    const state = await getE2EState<{ correctItemId?: string; optionValues?: number[]; correctSide?: 'left' | 'right' }>(page);
    const wrong = route === '/counting'
      ? page.locator(`[data-answer-id="${state.optionValues!.find(value => String(value) !== state.correctItemId)}"]`)
      : page.locator(`[data-answer-side="${state.correctSide === 'left' ? 'right' : 'left'}"]`);
    await wrong.click();
    await expect(page.getByTestId('game-retry-status')).toContainText('Skús');
    await waitForGamePhase(page, 'awaiting-answer');
    await expect.poll(positions).toEqual(before);
    await expectUnclippedShadows(page.locator('[data-testid="game-answer-region"] > button'));
  });
}
