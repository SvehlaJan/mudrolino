import type AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

export const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'];

/** Axe and the test runner resolve different playwright-core type versions. */
export function toAxeParams(page: Page): ConstructorParameters<typeof AxeBuilder>[0] {
  return { page } as unknown as ConstructorParameters<typeof AxeBuilder>[0];
}

export function isSeriousAxeViolation(impact: string | null | undefined): boolean {
  return ['critical', 'serious'].includes(impact ?? '');
}

/** OverlayFrame still fades under reduced motion; visibility alone can catch mid-fade contrast. */
export async function waitForOverlaySettled(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const panel = document.querySelector('[role="status"][aria-live="polite"]');
    return panel !== null && getComputedStyle(panel).opacity === '1';
  });
}
