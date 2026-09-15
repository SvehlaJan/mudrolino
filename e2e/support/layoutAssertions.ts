import { expect, Locator, Page } from '@playwright/test';

export async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

export async function expectMinimumTarget(page: Page, locator: Locator, size: number) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(size);
  expect(box!.height).toBeGreaterThanOrEqual(size);
}

export async function expectWithinViewport(page: Page, locator: Locator) {
  const rect = await locator.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { top: r.top, left: r.left, bottom: r.bottom, right: r.right };
  });
  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  expect(rect.left).toBeGreaterThanOrEqual(-1);
  expect(rect.top).toBeGreaterThanOrEqual(-1);
  expect(rect.right).toBeLessThanOrEqual(viewport!.width + 1);
  expect(rect.bottom).toBeLessThanOrEqual(viewport!.height + 1);
}

export async function expectNoPairwiseOverlap(locators: Locator[] | Locator) {
  const elements = Array.isArray(locators) ? locators : await locators.all();
  const boxes = await Promise.all(elements.map((l) => l.boundingBox()));
  for (let i = 0; i < boxes.length; i++) {
    const a = boxes[i];
    if (!a) continue;
    for (let j = i + 1; j < boxes.length; j++) {
      const b = boxes[j];
      if (!b) continue;
      const overlapX = a.x < b.x + b.width - 0.5 && a.x + a.width > b.x + 0.5;
      const overlapY = a.y < b.y + b.height - 0.5 && a.y + a.height > b.y + 0.5;
      const overlaps = overlapX && overlapY;
      expect(
        overlaps,
        `Elements at index ${i} and ${j} overlap: a=${JSON.stringify(a)} b=${JSON.stringify(b)}`,
      ).toBe(false);
    }
  }
}
