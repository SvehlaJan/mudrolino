import { test, expect, type Page } from './support/fixtures';
import {
  trackConsoleErrors,
  expectNoConsoleErrors,
  trackFailedRequests,
  expectNoFailedRequests,
} from './support/assertions';
import { startGame } from './support/gameEntry';
import { waitForGamePhase } from './support/gameHarness';
import { ASSEMBLY_MAMA } from './support/literacyHarness';
import { unlockParentGate } from './support/parentGate';
import { seedLocalStorage } from './support/persistenceFixtures';

/**
 * A Game card whose game has nothing to ask must look inactive, say why for the parent, and do
 * nothing when tapped, so a child never lands on a dead end.
 *
 * A family can never have zero words: the Parent area refuses to switch off the last playable one,
 * and loading a stored list with none ready re-enables the first default word. So the thinnest
 * pool is one word, and the Words game (which only needs one) is never Unplayable. These specs use
 * that thinnest pool: one one-syllable word starting with an accented letter, with accents off.
 */

const THIN_POOL = {
  'hrave-ucenie-settings': { alphabetAccents: false },
  'hrave-ucenie-seeded-sk': 'true',
  'hrave-ucenie-user-words-sk': {
    version: 2,
    items: [
      { word: 'Čaj', syllables: 'čaj', emoji: '🍵', audioKey: 'caj', id: 'e2e-caj', status: 'ready', enabled: true, isDefault: false, locale: 'sk', order: 0 },
    ],
  },
};

/** The stored word list a parent ends with after emptying it: the app puts the first default back. */
const EMPTIED_WORD_LIST = {
  'hrave-ucenie-seeded-sk': 'true',
  'hrave-ucenie-user-words-sk': { version: 2, items: [] },
};

const UNPLAYABLE_WITH_THIN_POOL = [
  { id: 'FIRST_LETTER', reason: 'Pridajte alebo nahrajte slová, ktoré začínajú dostupnými písmenkami.' },
  { id: 'ASSEMBLY', reason: 'Pridajte slová so slabikami v sekcii Vlastný obsah.' },
  { id: 'COMPLETE_SYLLABLE', reason: 'Pridajte slová s dvomi až štyrmi slabikami.' },
  { id: 'COMPLETE_LETTER', reason: 'Pridajte slová z aktívnych písmen alebo upravte nastavenia písmen.' },
];

const PLAYABLE_WITH_THIN_POOL = [
  { id: 'ALPHABET', path: '/alphabet' },
  { id: 'SYLLABLES', path: '/syllables' },
  { id: 'WORDS', path: '/words' },
  { id: 'NUMBERS', path: '/numbers' },
  { id: 'COUNTING_ITEMS', path: '/counting' },
  { id: 'COMPARE_QUANTITIES', path: '/compare' },
  { id: 'ADDITION', path: '/addition' },
];

const card = (page: Page, gameId: string) => page.locator(`[data-game-id="${gameId}"]`);

test.describe('Unplayable Game cards', () => {
  test('with the thinnest word pool, the games that need more are dimmed with their reason', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);
    await seedLocalStorage(page, THIN_POOL);
    await page.goto('/');

    for (const { id, reason } of UNPLAYABLE_WITH_THIN_POOL) {
      const dimmed = card(page, id);
      await expect(dimmed, id).toHaveAttribute('data-unplayable', 'true');
      await expect(dimmed, id).toHaveAttribute('aria-disabled', 'true');
      await expect(dimmed, id).not.toHaveAttribute('href');
      await expect(dimmed, id).toContainText(reason);

      // Playwright refuses to click an aria-disabled element, so force the tap a child would make.
      await dimmed.click({ force: true });
      await expect(page, id).toHaveURL(/\/$/);
    }

    for (const { id, path } of PLAYABLE_WITH_THIN_POOL) {
      await expect(card(page, id), id).toHaveAttribute('href', path);
      await expect(card(page, id), id).not.toHaveAttribute('data-unplayable');
      await expect(card(page, id), id).not.toHaveAttribute('aria-disabled');
    }
    await expect(page.getByTestId('game-card')).toHaveCount(11);

    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });

  test('a dimmed card is a focusable, disabled link that describes why, not only a colour change', async ({ page }) => {
    await seedLocalStorage(page, THIN_POOL);
    await page.goto('/');

    const assembly = card(page, 'ASSEMBLY');
    await expect(assembly).toHaveAttribute('role', 'link');
    // The title names it and the reason describes it, so a screen reader announces both.
    await expect(assembly).toHaveAccessibleName(await assembly.getByRole('heading').innerText());
    await expect(assembly).toHaveAccessibleDescription('Pridajte slová so slabikami v sekcii Vlastný obsah.');
    await assembly.focus();
    await expect(assembly).toBeFocused();
  });

  test('no card is dimmed while the content is still loading', async ({ page }) => {
    // The word list is empty until the content arrives; that is no reason to dim a card. Watch the
    // DOM from the first render, since the loaded state alone would hide a brief dimmed flash.
    await page.addInitScript(() => {
      const probe = window as unknown as { __everDimmed: boolean };
      probe.__everDimmed = false;
      new MutationObserver(() => {
        if (document.querySelector('[data-unplayable]')) probe.__everDimmed = true;
      }).observe(document, { subtree: true, childList: true, attributes: true });
    });
    await page.goto('/');

    await expect(card(page, 'ASSEMBLY')).toHaveAttribute('href', '/assembly');
    expect(await page.evaluate(() => (window as unknown as { __everDimmed: boolean }).__everDimmed)).toBe(false);
  });

  test('touching a card starts loading its game before the tap completes', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const chunk = page.waitForRequest((request) => /\/AlphabetGame-[\w-]+\.js$/.test(request.url()));
    const box = await card(page, 'ALPHABET').boundingBox();
    if (!box) throw new Error('The Alphabet card has no box');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    // The finger is still down: only pointerdown can have asked for the chunk.
    await chunk;
    await page.mouse.up();

    await page.waitForURL((url) => url.pathname === '/alphabet');
    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });

  test('a dimmed card does not start loading its game', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const requested: string[] = [];
    page.on('request', (request) => requested.push(request.url()));
    await seedLocalStorage(page, THIN_POOL);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const box = await card(page, 'ASSEMBLY').boundingBox();
    if (!box) throw new Error('The Assembly card has no box');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.up();
    await page.waitForLoadState('networkidle');

    expect(requested.filter((url) => /\/AssemblyGame-/.test(url))).toEqual([]);
    await expect(page).toHaveURL(/\/$/);
    expectNoConsoleErrors(errors);
  });

  for (const [name, seed] of [['a word list emptied by the parent', EMPTIED_WORD_LIST], ['the thinnest pool', THIN_POOL]] as const) {
    test(`the Syllables game still starts with ${name}`, async ({ page }) => {
      const errors = trackConsoleErrors(page);
      const failedRequests = trackFailedRequests(page);
      await seedLocalStorage(page, seed);

      await startGame(page, '/syllables');
      await waitForGamePhase(page, 'awaiting-answer');

      expectNoConsoleErrors(errors);
      expectNoFailedRequests(failedRequests);
    });
  }

  test('reasons follow the app language', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, locale: 'cs-CZ' });
    try {
      const page = await context.newPage();
      const errors = trackConsoleErrors(page);
      await seedLocalStorage(page, {
        'hrave-ucenie-settings': { alphabetAccents: false },
        'hrave-ucenie-seeded-cs': 'true',
        'hrave-ucenie-user-words-cs': {
          version: 2,
          items: [
            { word: 'Čaj', syllables: 'čaj', emoji: '🍵', audioKey: 'caj', id: 'e2e-caj', status: 'ready', enabled: true, isDefault: false, locale: 'cs', order: 0 },
          ],
        },
      });
      await page.goto('/');

      await expect(page.locator('html')).toHaveAttribute('lang', 'cs');
      await expect(card(page, 'FIRST_LETTER')).toContainText('Přidejte nebo nahrajte slova, která začínají dostupnými písmenky.');
      await expect(card(page, 'ASSEMBLY')).toContainText('Přidejte slova se slabikami v sekci Vlastní obsah.');
      await expect(card(page, 'COMPLETE_SYLLABLE')).toContainText('Přidejte slova se dvěma až čtyřmi slabikami.');
      await expect(card(page, 'COMPLETE_LETTER')).toContainText('Přidejte slova z aktivních písmen nebo upravte nastavení písmen.');
      expectNoConsoleErrors(errors);
    } finally {
      await context.close();
    }
  });

  test('a word disabled in the Parent area dims its card on return', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);
    // A parent can never disable the last playable word, so Mama is a default word that shares
    // the pool with a one-syllable custom word Assembly cannot use.
    await seedLocalStorage(page, {
      'hrave-ucenie-seeded-sk': 'true',
      'hrave-ucenie-user-words-sk': {
        version: 2,
        items: [
          { ...ASSEMBLY_MAMA, id: 'default:word:sk:mama', status: 'ready', enabled: true, isDefault: true, locale: 'sk', order: 0 },
          { word: 'Dom', syllables: 'dom', emoji: '🏠', audioKey: 'dom', id: 'e2e-dom', status: 'ready', enabled: true, isDefault: false, locale: 'sk', order: 1 },
        ],
      },
    });
    await page.goto('/');
    await expect(card(page, 'ASSEMBLY')).toHaveAttribute('href', '/assembly');
    // Proves the return below is a client-side navigation: a reload would drop this marker.
    await page.evaluate(() => { (window as unknown as { __sameDocument?: boolean }).__sameDocument = true; });

    await page.getByRole('button', { name: 'Nastavenia' }).click();
    await unlockParentGate(page);
    await page.getByRole('link', { name: /Vlastný obsah/ }).click();
    await page.getByRole('tab', { name: /Slová/ }).click();
    await page.getByRole('textbox', { name: /Hľadať slovo/ }).fill('Mama');
    await page.getByRole('button', { name: 'Ďalšie možnosti' }).first().click();
    await page.getByRole('menuitem', { name: 'Vypnúť' }).click();
    await expect(page.getByRole('button', { name: /Vypnuté \(\d+\)/ })).toBeVisible();

    // Content screen back to the dashboard, then the dashboard's back button closes the Parent area.
    await page.getByRole('button', { name: 'Späť' }).click();
    await page.getByRole('button', { name: 'Späť' }).click();
    await expect(page).toHaveURL(/\/$/);

    await expect(card(page, 'ASSEMBLY')).toHaveAttribute('data-unplayable', 'true');
    await expect(card(page, 'WORDS')).toHaveAttribute('href', '/words');
    expect(await page.evaluate(() => (window as unknown as { __sameDocument?: boolean }).__sameDocument)).toBe(true);

    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });
});
