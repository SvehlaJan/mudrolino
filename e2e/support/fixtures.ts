import { test as base } from '@playwright/test';
import { stubAudioPlayback, stubSpeechSynthesis } from './gameHarness';

/** Functional/layout tests measure app behavior with terminal media events delivered promptly.
 * Held-event tests can override these init scripts; native-media specs import Playwright directly. */
export const test = base.extend<{ deterministicAudio: void }>({
  deterministicAudio: [async ({ page }, use) => {
    await stubAudioPlayback(page);
    await stubSpeechSynthesis(page);
    await use();
  }, { auto: true }],
});
export { expect } from '@playwright/test';
export type { Page, Locator } from '@playwright/test';
