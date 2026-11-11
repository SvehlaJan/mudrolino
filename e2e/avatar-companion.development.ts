import { createHash } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { expectNoConsoleErrors, expectNoFailedRequests, trackConsoleErrors, trackFailedRequests } from './support/assertions';
import { completeCurrentRound, stubAudioPlayback, stubSpeechSynthesis, waitForGamePhase } from './support/gameHarness';
import { startGame } from './support/gameEntry';

test('home companion survives development effect replay and plays tapped clips', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  const requests = trackFailedRequests(page);
  await page.goto('/');
  const bear = page.getByTestId('home-companion');
  await expect(bear).toHaveAttribute('data-companion-representation', 'rendered3D');

  for (const clip of ['peekaboo', 'stretch', 'clap']) {
    await bear.click();
    await expect(bear).toHaveAttribute('data-companion-animation', clip);
    const frames = new Set<string>();
    for (let sample = 0; sample < 5; sample += 1) {
      // Canvas pixels, rather than a changed animation label, prove actual motion.
      frames.add(createHash('sha256').update(await bear.locator('canvas').screenshot()).digest('hex'));
    }
    expect(frames.size, `${clip} must visibly animate`).toBeGreaterThanOrEqual(3);
    await expect(bear).toHaveAttribute('data-companion-resource-status', 'ready');
  }
  expectNoConsoleErrors(errors);
  expectNoFailedRequests(requests);
});

test('counting celebration mounts a working canvas on the development server', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  const requests = trackFailedRequests(page);
  await stubAudioPlayback(page, { holdPraise: true });
  await stubSpeechSynthesis(page);
  await startGame(page, '/counting');
  await waitForGamePhase(page, 'awaiting-answer');
  await completeCurrentRound(page, 'COUNTING_ITEMS');
  const bear = page.getByTestId('learning-companion');
  await expect(bear).toHaveAttribute('data-companion-representation', 'rendered3D');
  await expect(bear).toHaveAttribute('data-companion-resource-status', 'ready');
  await expect(bear.locator('canvas')).toBeVisible();
  expectNoConsoleErrors(errors);
  expectNoFailedRequests(requests);
});
