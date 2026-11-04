import { installCompanionFixture } from './support/companionFixture';
import { expect, test, type Page } from './support/fixtures';
import {
  expectNoConsoleErrors,
  expectNoFailedRequests,
  trackConsoleErrors,
  trackFailedRequests,
} from './support/assertions';
import { completeCurrentRound, getAudioEvents, stubAudioPlayback, stubSpeechSynthesis, waitForGamePhase } from './support/gameHarness';
import { expectNoHorizontalOverflow } from './support/layoutAssertions';
import { startGame } from './support/gameEntry';

async function startFromHome(page: Page, title: string): Promise<void> {
  await page.goto('/');
  await page.getByRole('link', { name: new RegExp(title, 'i') }).click();
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
  await expect(page.getByTestId('game-visible-instruction')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Zopakovať zadanie' })).toBeVisible();
  await expect(page.getByTestId('game-answer-region').getByRole('button')).not.toHaveCount(0);
  await waitForGamePhase(page, 'awaiting-answer');
  await expectNoHorizontalOverflow(page);
}

test('WebKit renders home, the parent gate, and representative child rounds', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  const failedRequests = trackFailedRequests(page);
  await stubSpeechSynthesis(page);

  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Mudrolíno' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.getByRole('button', { name: 'Nastavenia' }).click();
  await expect(page.getByRole('dialog', { name: 'Pre rodičov' })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await startFromHome(page, 'Čítaj písmenká');
  await startFromHome(page, 'Spočítaj predmety');

  expectNoConsoleErrors(errors);
  expectNoFailedRequests(failedRequests);
});


test('bear companion succeeds with WebKit', async ({ page }, testInfo) => {
  const errors = trackConsoleErrors(page);
  const requests = trackFailedRequests(page);
  await installCompanionFixture(page);
  await stubAudioPlayback(page, { holdPraise: true });
  await startGame(page, '/alphabet');
  await waitForGamePhase(page, 'awaiting-answer');
  let representation = 'still';
  for (let round = 0; round < 5; round += 1) {
    await completeCurrentRound(page, 'ALPHABET');
    await expect(page.getByTestId('learning-companion')).toBeVisible();
    if (round === 0) {
      await page.waitForFunction(() => document.querySelector('[data-testid="learning-companion"]')?.getAttribute('data-companion-representation') === 'rendered3D', undefined, { timeout: 1000, polling: 20 }).catch(() => undefined);
      representation = await page.evaluate(() => document.querySelector('[data-testid="learning-companion"]')?.getAttribute('data-companion-representation') ?? 'expired');
    }
    if (round < 4) {
      await page.getByRole('button', { name: 'Pokračovať' }).click();
      await waitForGamePhase(page, 'awaiting-answer');
    }
  }
  await page.evaluate(() => {
    const audio = (window as typeof window & { __heldAudio?: HTMLMediaElement[] }).__heldAudio?.pop();
    if (!audio) throw new Error('Expected final praise');
    audio.dispatchEvent(new Event('ended'));
  });
  await waitForGamePhase(page, 'session-complete');
  await expect(page.getByRole('button', { name: 'Hrať znova' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await testInfo.attach('companion-representation', { body: representation, contentType: 'text/plain' });
  expect(errors.filter(error => !/WebGL|Error creating/.test(error))).toEqual([]);
  expectNoFailedRequests(requests);
});

// The deterministic audio stub resolves every play() and fires `ended`, so the audio events and the
// absence of a TTS-fallback warning cannot tell a recording from the fallback here. What proves the
// card tap reached the recorded clips is the network: each recording was requested and served
// (200, or 206 when the media element asks for a byte range).
test('a card tap fetches and starts the first prompt recording in WebKit', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  const failedRequests = trackFailedRequests(page);
  const recordingStatus = new Map<string, number>();
  page.on('response', (response) => {
    const { pathname } = new URL(response.url());
    if (pathname.startsWith('/audio/')) recordingStatus.set(pathname, response.status());
  });

  await startGame(page, '/numbers');

  await expect.poll(async () => (await getAudioEvents(page)).includes('finish:sk/phrases/najdi')).toBe(true);
  await expect.poll(async () => (await getAudioEvents(page)).some(event => event.startsWith('finish:sk/numbers/'))).toBe(true);
  const numberClip = (await getAudioEvents(page)).find(event => event.startsWith('start:sk/numbers/'))!.slice('start:'.length);
  const isServed = (pathname: string) => () => [200, 206].includes(recordingStatus.get(pathname) ?? 0);
  await expect.poll(isServed('/audio/sk/phrases/najdi.mp3')).toBe(true);
  await expect.poll(isServed(`/audio/${numberClip}.mp3`)).toBe(true);
  expectNoConsoleErrors(errors);
  expectNoFailedRequests(failedRequests);
});
