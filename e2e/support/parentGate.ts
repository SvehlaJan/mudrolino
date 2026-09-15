import { Page } from '@playwright/test';

export async function unlockParentGate(page: Page): Promise<void> {
  await page.waitForFunction(() => Boolean(window.__E2E__?.parentGate));
  await page.evaluate(() => window.__E2E__?.parentGate?.unlock());
}

export async function solveParentGate(page: Page): Promise<void> {
  await page.waitForFunction(() => typeof window.__E2E__?.parentGate?.answer === 'number');
  const answer = await page.evaluate(() => window.__E2E__?.parentGate?.answer);
  if (typeof answer !== 'number') throw new Error('Parent gate answer unavailable');
  for (const digit of String(answer)) {
    await page.getByRole('button', { name: digit, exact: true }).click();
  }
  await page.getByRole('button', { name: 'Potvrdiť' }).click();
}
