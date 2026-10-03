import { test, expect, Page } from './support/fixtures';
import {
  trackConsoleErrors,
  expectNoConsoleErrors,
  trackFailedRequests,
  expectNoFailedRequests,
} from './support/assertions';
import { expectNoHorizontalOverflow } from './support/layoutAssertions';
import { CANONICAL_VIEWPORTS } from './support/viewports';
import { unlockParentGate } from './support/parentGate';

async function openContent(page: Page) {
  await page.goto('/content');
  await unlockParentGate(page);
}

async function installSuccessfulRecorder(page: Page) {
  await page.addInitScript(() => {
    class FakeAudioContext {
      createMediaStreamSource() { return { connect() {} }; }
      createAnalyser() {
        return {
          fftSize: 0,
          frequencyBinCount: 8,
          getFloatTimeDomainData(values: Float32Array) { values.fill(0); },
        };
      }
      async decodeAudioData() {
        return { getChannelData: () => new Float32Array([0.3, 0.2, 0.1]) };
      }
      close() { return Promise.resolve(); }
    }

    class FakeMediaRecorder extends EventTarget {
      state: 'inactive' | 'recording' = 'inactive';
      mimeType = 'audio/webm';
      ondataavailable: ((event: BlobEvent) => void) | null = null;
      onstop: (() => void) | null = null;
      constructor(_stream: MediaStream) { super(); }
      start() { this.state = 'recording'; }
      stop() {
        if (this.state === 'inactive') return;
        this.state = 'inactive';
        window.setTimeout(() => {
          this.ondataavailable?.({ data: new Blob(['recording'], { type: this.mimeType }) } as BlobEvent);
          this.onstop?.();
        }, 25);
      }
    }

    Object.defineProperty(window, 'AudioContext', { configurable: true, value: FakeAudioContext });
    Object.defineProperty(window, 'MediaRecorder', { configurable: true, value: FakeMediaRecorder });
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: async () => ({ getTracks: () => [{ stop() {} }] }) },
    });
  });
}

async function openTab(page: Page, name: RegExp) {
  await page.getByRole('tab', { name }).click();
}

async function disableRow(page: Page, searchLabel: RegExp, searchTerm: string) {
  const search = page.getByRole('textbox', { name: searchLabel });
  await search.fill(searchTerm);
  await page.getByRole('button', { name: 'Ďalšie možnosti' }).first().click();
  await page.getByRole('menuitem', { name: 'Vypnúť' }).click();
  await search.fill('');
  await page.evaluate(() => window.scrollTo(0, 0));
}

test.describe('Custom content manager', () => {
  test('shows all five categories with counts and supports keyboard selection', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);

    await openContent(page);
    await expect(page.getByRole('heading', { name: 'Vlastný obsah' })).toBeVisible();

    const tablist = page.getByRole('tablist', { name: 'Kategórie vlastného obsahu' });
    await expect(tablist).toBeVisible();
    for (const name of [/Písmená \(\d+\)/, /Čísla \(\d+\)/, /Frázy \(\d+\)/, /Slová \(\d+\)/, /Pochvaly \(\d+\)/]) {
      await expect(page.getByRole('tab', { name })).toBeVisible();
    }

    const wordsTab = page.getByRole('tab', { name: /Slová/ });
    await wordsTab.click();
    await expect(wordsTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('textbox', { name: /Hľadať slovo/ })).toBeVisible();

    await wordsTab.focus();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('tab', { name: /Pochvaly/ })).toHaveAttribute('aria-selected', 'true');

    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });

  test('a narrow viewport shows a scrollable tab strip with a visible overflow cue; a wide one does not', async ({ page }) => {
    await page.setViewportSize(CANONICAL_VIEWPORTS.narrowPhone);
    await openContent(page);
    const scrollLeft = page.getByRole('button', { name: 'Posunúť kategórie doľava' });
    const scrollRight = page.getByRole('button', { name: 'Posunúť kategórie doprava' });
    await expect(scrollLeft).toBeVisible();
    await expect(scrollLeft).toBeDisabled();
    await expect(scrollRight).toBeEnabled();
    await scrollRight.click();
    await expect(scrollLeft).toBeEnabled();
    await scrollRight.click();
    const praisesTab = page.getByRole('tab', { name: /Pochvaly/ });
    await praisesTab.click();
    await expect(praisesTab).toBeVisible();
    await expect(praisesTab).toHaveAttribute('aria-selected', 'true');
    const tablist = page.getByRole('tablist', { name: 'Kategórie vlastného obsahu' });
    for (let attempt = 0; attempt < 5; attempt++) {
      const atPhysicalEnd = await tablist.evaluate(el => el.scrollLeft + el.clientWidth >= el.scrollWidth - 1);
      if (atPhysicalEnd) break;

      const previousOffset = await tablist.evaluate(el => el.scrollLeft);
      await scrollRight.click();
      await expect.poll(() => tablist.evaluate(el => el.scrollLeft)).toBeGreaterThan(previousOffset);
    }
    await expect.poll(() => tablist.evaluate(el => el.scrollLeft + el.clientWidth >= el.scrollWidth - 1)).toBe(true);
    await expect(scrollRight).toBeDisabled();
    await expectNoHorizontalOverflow(page);

    await page.setViewportSize(CANONICAL_VIEWPORTS.desktop);
    await expect(page.getByTestId('content-tabs-scroll-left')).toHaveCount(0);
    await expect(page.getByTestId('content-tabs-scroll-right')).toHaveCount(0);
  });

  test('phrase rows show parent-friendly text without internal keys', async ({ page }) => {
    await openContent(page);
    await openTab(page, /Frázy/);

    await expect(page.getByText('Nájdi', { exact: true })).toBeVisible();
    await expect(page.getByText(/^find:/)).toHaveCount(0);
  });

  test('search filters the word list to matching rows only', async ({ page }) => {
    await openContent(page);
    await openTab(page, /Slová/);

    await page.getByRole('textbox', { name: /Hľadať slovo/ }).fill('Auto');
    await expect(page.getByText('AU-TO', { exact: true })).toBeVisible();
    await expect(page.getByText('ma-ma')).toHaveCount(0);
  });

  test('stopping a recording saves a playable override for its active row', async ({ page }) => {
    await installSuccessfulRecorder(page);
    await openContent(page);
    await openTab(page, /Slová/);
    await page.getByRole('textbox', { name: /Hľadať slovo/ }).fill('Auto');

    const autoRow = page.getByText('Auto 🚗', { exact: true }).locator('xpath=../..');
    await autoRow.getByRole('button', { name: 'Nahrať' }).click();
    const stop = page.getByRole('button', { name: 'Zastaviť' });
    await expect(stop).toBeVisible();
    const stopBox = await stop.boundingBox();
    expect(stopBox).not.toBeNull();
    expect(stopBox!.width).toBeGreaterThanOrEqual(44);
    expect(stopBox!.height).toBeGreaterThanOrEqual(44);
    await stop.click();

    await expect(page.getByRole('button', { name: 'Zmazať nahrávku' })).toBeVisible();
  });

  test('a pending recording save blocks a newer row from taking its blob', async ({ page }) => {
    await installSuccessfulRecorder(page);
    await openContent(page);
    await openTab(page, /Slová/);
    await page.getByRole('textbox', { name: /Hľadať slovo/ }).fill('Auto');
    const autoRow = page.getByText('Auto 🚗', { exact: true }).locator('xpath=../..');
    await autoRow.getByRole('button', { name: 'Nahrať' }).click();
    await page.getByRole('button', { name: 'Zastaviť' }).click();
    await page.getByRole('button', { name: 'Nahrať' }).last().click();
    await expect(autoRow.getByRole('button', { name: 'Zmazať nahrávku' })).toBeVisible();
  });

  test('adding a word with valid input appears in the list and updates the tab count', async ({ page }) => {
    await openContent(page);
    await openTab(page, /Slová/);

    const tab = page.getByRole('tab', { name: /Slová/ });
    const before = await tab.textContent();
    const beforeCount = Number(before?.match(/\((\d+)\)/)?.[1]);

    await page.getByRole('button', { name: 'Pridať slovo' }).click();
    await page.getByLabel(/^Slovo\b/).fill('Cvikla');
    await page.getByLabel(/^Slabiky\b/).fill('cvik-la');
    await page.getByLabel(/^Emoji\b/).fill('🥬');
    await page.getByRole('button', { name: 'Pridať', exact: true }).click();

    await expect(page.getByText('CVIK-LA', { exact: true })).toBeVisible();
    await expect(tab).toContainText(`(${beforeCount + 1})`);
  });

  test('adding a word with invalid input shows inline errors and focuses an error summary', async ({ page }) => {
    await openContent(page);
    await openTab(page, /Slová/);

    await page.getByRole('button', { name: 'Pridať slovo' }).click();
    await page.getByRole('button', { name: 'Pridať', exact: true }).click();

    const summary = page.getByRole('alert').filter({ hasText: 'Opravte, prosím, tieto polia' });
    await expect(summary).toBeVisible();
    await expect(summary).toBeFocused();
    await expect(page.getByLabel(/^Slovo\b/)).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('[role="alert"][id$="-error"]', { hasText: 'Zadajte slovo.' })).toBeVisible();
  });

  test('editor and delete confirmation return focus to their originating controls', async ({ page }) => {
    await page.setViewportSize(CANONICAL_VIEWPORTS.tabletPortrait);
    await openContent(page);
    await openTab(page, /Slová/);

    const add = page.getByRole('button', { name: 'Pridať slovo' });
    await add.click();
    await page.keyboard.press('Escape');
    await expect(add).toBeFocused();

    await add.click();
    await page.getByLabel(/^Slovo\b/).fill('Rebarbora');
    await page.getByLabel(/^Slabiky\b/).fill('re-bar-bo-ra');
    await page.getByLabel(/^Emoji\b/).fill('🌿');
    await page.getByRole('button', { name: 'Pridať', exact: true }).click();
    await page.getByRole('textbox', { name: /Hľadať slovo/ }).fill('Rebarbora');

    const menu = page.getByRole('button', { name: 'Ďalšie možnosti' });
    await menu.click();
    await page.getByRole('menuitem', { name: 'Zmazať' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Zrušiť' }).click();
    await expect(menu).toBeFocused();
  });

  test('editing a custom word updates its details', async ({ page }) => {
    await openContent(page);
    await openTab(page, /Slová/);

    await page.getByRole('button', { name: 'Pridať slovo' }).click();
    await page.getByLabel(/^Slovo\b/).fill('Repa');
    await page.getByLabel(/^Slabiky\b/).fill('re-pa');
    await page.getByLabel(/^Emoji\b/).fill('🥕');
    await page.getByRole('button', { name: 'Pridať', exact: true }).click();
    await expect(page.getByText('RE-PA', { exact: true })).toBeVisible();

    await page.getByRole('textbox', { name: /Hľadať slovo/ }).fill('Repa');
    await page.getByRole('button', { name: 'Ďalšie možnosti' }).first().click();
    await page.getByRole('menuitem', { name: 'Upraviť' }).click();
    await expect(page.getByLabel(/^Slovo\b/)).toHaveValue('Repa');
    await page.getByLabel(/^Slovo\b/).fill('Repka');
    await page.getByRole('button', { name: 'Uložiť', exact: true }).click();

    await page.getByRole('textbox', { name: /Hľadať slovo/ }).fill('');
    await expect(page.getByText('Repka')).toBeVisible();
  });

  test('disabling a default word collapses it into a Vypnuté section and it can be restored individually', async ({ page }) => {
    await openContent(page);
    await openTab(page, /Slová/);

    await disableRow(page, /Hľadať slovo/, 'Mama');

    const disabledToggle = page.getByRole('button', { name: /Vypnuté \(1\)/ });
    await expect(disabledToggle).toBeVisible();
    await expect(page.getByText('ma-ma')).toHaveCount(0);

    await disabledToggle.click();
    await expect(page.getByText('MA-MA', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Obnoviť' }).click();

    await expect(page.getByRole('button', { name: /Vypnuté/ })).toHaveCount(0);
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(page.getByText('ma-ma')).toBeVisible();
  });

  test('restore-all only appears once more than one default is disabled, and restores them all', async ({ page }) => {
    await openContent(page);
    await openTab(page, /Slová/);

    await disableRow(page, /Hľadať slovo/, 'Mama');
    await expect(page.getByRole('button', { name: /Vypnuté \(1\)/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Obnoviť všetko' })).toHaveCount(0);

    await disableRow(page, /Hľadať slovo/, 'Tata');
    await expect(page.getByRole('button', { name: /Vypnuté \(2\)/ })).toBeVisible();
    const restoreAll = page.getByRole('button', { name: 'Obnoviť všetko' });
    await expect(restoreAll).toBeVisible();
    await restoreAll.click();

    await expect(page.getByRole('button', { name: /Vypnuté/ })).toHaveCount(0);
  });

  test('the last enabled praise cannot be disabled and the constraint is explained', async ({ page }) => {
    await openContent(page);
    await openTab(page, /Pochvaly/);

    for (const text of ['Skvelá', 'šikovný', 'To je ono', 'Úžasné', 'Paráda']) {
      await disableRow(page, /Hľadať pochvalu/, text);
    }

    await expect(page.getByText('Aspoň jedna položka musí zostať zapnutá.')).toBeVisible();
    await page.getByRole('button', { name: 'Ďalšie možnosti' }).first().click();
    await expect(page.getByRole('menuitem', { name: 'Vypnúť' })).toBeDisabled();
  });

  test('deleting a custom word requires confirmation and can be undone', async ({ page }) => {
    await openContent(page);
    await openTab(page, /Slová/);

    await page.getByRole('button', { name: 'Pridať slovo' }).click();
    await page.getByLabel(/^Slovo\b/).fill('Hruska');
    await page.getByLabel(/^Slabiky\b/).fill('hru-ska');
    await page.getByLabel(/^Emoji\b/).fill('🍐');
    await page.getByRole('button', { name: 'Pridať', exact: true }).click();

    await page.getByRole('textbox', { name: /Hľadať slovo/ }).fill('Hruska');
    await page.getByRole('button', { name: 'Ďalšie možnosti' }).first().click();
    await page.getByRole('menuitem', { name: 'Zmazať' }).click();

    const dialog = page.getByRole('alertdialog', { name: 'Zmazať slovo?' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Zmazať' }).click();

    await expect(page.getByText('hru-ska')).toHaveCount(0);
    const undoBanner = page.getByRole('status').filter({ hasText: 'bolo zmazané' });
    await expect(undoBanner).toBeVisible();
    await undoBanner.getByRole('button', { name: 'Vrátiť späť' }).click();

    await page.getByRole('textbox', { name: /Hľadať slovo/ }).fill('Hruska');
    await expect(page.getByText('HRU-SKA', { exact: true })).toBeVisible();
  });

  test('Undo restores a recorded custom word as playable', async ({ page }) => {
    await installSuccessfulRecorder(page);
    await openContent(page);
    await openTab(page, /Slová/);
    await page.getByRole('button', { name: 'Pridať slovo' }).click();
    await page.getByLabel(/^Slovo\b/).fill('Hlasik');
    await page.getByLabel(/^Slabiky\b/).fill('hla-sik');
    await page.getByLabel(/^Emoji\b/).fill('🔊');
    await page.getByRole('button', { name: 'Pridať', exact: true }).click();
    await page.getByRole('textbox', { name: /Hľadať slovo/ }).fill('Hlasik');
    await page.getByRole('button', { name: 'Nahrať' }).click();
    await page.getByRole('button', { name: 'Zastaviť' }).click();
    await expect(page.getByRole('button', { name: 'Zmazať nahrávku' })).toBeVisible();
    await page.getByRole('button', { name: 'Ďalšie možnosti' }).click();
    await page.getByRole('menuitem', { name: 'Zmazať' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Zmazať' }).click();
    await page.getByRole('status').filter({ hasText: 'bolo zmazané' }).getByRole('button', { name: 'Vrátiť späť' }).click();
    await expect(page.getByRole('button', { name: 'Prehrať' })).toBeVisible();
    await expect(page.getByText('Koncept')).toHaveCount(0);
  });

  test('deleting the last playable custom item is blocked with an explanation', async ({ page }) => {
    await installSuccessfulRecorder(page);
    await openContent(page);
    await openTab(page, /Pochvaly/);

    // Add the custom replacement and record it so it is playable (ready):
    // the guard protects the last *playable* item, so every default can then
    // be disabled one at a time while the custom praise keeps the pool non-empty.
    await page.getByRole('button', { name: 'Pridať pochvalu' }).click();
    await page.getByLabel(/^Text pochvaly\b/).fill('Bravo!');
    await page.getByLabel(/^Emoji\b/).fill('👏');
    await page.getByRole('button', { name: 'Pridať', exact: true }).click();
    await expect(page.getByText('Bravo!')).toBeVisible();

    const search = page.getByRole('textbox', { name: /Hľadať pochvalu/ });
    await search.fill('Bravo');
    await page.getByRole('button', { name: 'Nahrať' }).click();
    await page.getByRole('button', { name: 'Zastaviť' }).click();
    await expect(page.getByRole('button', { name: 'Zmazať nahrávku' })).toBeVisible();
    await search.fill('');

    for (const text of ['Výborne', 'Skvelá', 'šikovný', 'To je ono', 'Úžasné', 'Paráda']) {
      await disableRow(page, /Hľadať pochvalu/, text);
    }

    await expect(page.getByText('Aspoň jedna položka musí zostať zapnutá.')).toBeVisible();
    await page.getByRole('button', { name: 'Ďalšie možnosti' }).first().click();
    await expect(page.getByRole('menuitem', { name: 'Zmazať' })).toBeDisabled();
  });

  test('667x375 short landscape stacks the layout and opens a full-screen editor dialog', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);

    await page.setViewportSize(CANONICAL_VIEWPORTS.shortLandscape);
    await openContent(page);
    await openTab(page, /Slová/);
    await page.getByRole('button', { name: 'Pridať slovo' }).click();

    const dialog = page.getByRole('dialog', { name: 'Pridať slovo' });
    await expect(dialog).toBeVisible();
    const box = await dialog.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(CANONICAL_VIEWPORTS.shortLandscape.width - 20);
    await expectNoHorizontalOverflow(page);

    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });

  test('768x1024 tablet shows a two-pane layout with a focused (non-full-screen) editor dialog', async ({ page }) => {
    await page.setViewportSize(CANONICAL_VIEWPORTS.tabletPortrait);
    await openContent(page);
    await openTab(page, /Slová/);
    await page.getByRole('button', { name: 'Pridať slovo' }).click();

    const dialog = page.getByRole('dialog', { name: 'Pridať slovo' });
    await expect(dialog).toBeVisible();
    const box = await dialog.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeLessThan(CANONICAL_VIEWPORTS.tabletPortrait.width - 40);
    await expectNoHorizontalOverflow(page);
  });

  test('1280px desktop centers content and edits in a dismissible dialog', async ({ page }) => {
    await page.setViewportSize(CANONICAL_VIEWPORTS.desktop);
    await openContent(page);
    await openTab(page, /Slová/);
    await page.getByRole('button', { name: 'Pridať slovo' }).click();

    const dialog = page.getByRole('dialog', { name: 'Pridať slovo' });
    await expect(dialog).toBeVisible();
    const contentBox = (await page.getByRole('main').locator(':scope > div').first().boundingBox())!;
    expect(contentBox.width).toBeLessThanOrEqual(672);
    expect(Math.abs(contentBox.x + contentBox.width / 2 - CANONICAL_VIEWPORTS.desktop.width / 2)).toBeLessThan(1);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Pridať slovo' })).toBeFocused();
    await expect(page.getByRole('tab', { name: /Slová/ })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test('custom content rows keep readable labels and 44x44 reachable actions on narrow phones', async ({ page }) => {
    const phoneViewports = [
      CANONICAL_VIEWPORTS.narrowPhone,
      CANONICAL_VIEWPORTS.smallPhone,
      CANONICAL_VIEWPORTS.phonePortrait,
    ];

    for (const viewport of phoneViewports) {
      await page.setViewportSize(viewport);
      await openContent(page);
      await openTab(page, /Slová/);

      const mamaText = page.getByText(/^Mama\b/);
      await expect(mamaText).toBeVisible();
      const row = mamaText.locator('xpath=ancestor::div[contains(@class, "rounded-2xl")]').first();
      await expect(row).toBeVisible();

      const labelBox = await mamaText.boundingBox();
      expect(labelBox).not.toBeNull();
      expect(labelBox!.width).toBeGreaterThanOrEqual(160);

      const isSingleLine = await mamaText.evaluate((el) => {
        const style = window.getComputedStyle(el);
        const lineHeight = parseFloat(style.lineHeight) || (parseFloat(style.fontSize) * 1.3);
        return el.clientHeight <= lineHeight * 1.5;
      });
      expect(isSingleLine).toBe(true);

      const playBtn = row.getByRole('button', { name: 'Prehrať' });
      await expect(playBtn).toBeVisible();
      const playBox = await playBtn.boundingBox();
      expect(playBox!.width).toBeGreaterThanOrEqual(44);
      expect(playBox!.height).toBeGreaterThanOrEqual(44);

      const recordBtn = row.getByRole('button', { name: 'Nahrať' });
      await expect(recordBtn).toBeVisible();
      const recordBox = await recordBtn.boundingBox();
      expect(recordBox!.width).toBeGreaterThanOrEqual(44);
      expect(recordBox!.height).toBeGreaterThanOrEqual(44);

      const menuBtn = row.getByRole('button', { name: 'Ďalšie možnosti' });
      await expect(menuBtn).toBeVisible();
      const menuBox = await menuBtn.boundingBox();
      expect(menuBox!.width).toBeGreaterThanOrEqual(44);
      expect(menuBox!.height).toBeGreaterThanOrEqual(44);

      for (const [left, right] of [[playBox, recordBox], [recordBox, menuBox]] as const) {
        expect(right!.x - (left!.x + left!.width)).toBeGreaterThanOrEqual(12);
      }

      await menuBtn.click();
      await expect(page.getByRole('menuitem', { name: 'Vypnúť' })).toBeVisible();
      await page.keyboard.press('Escape');

      await expectNoHorizontalOverflow(page);
    }
  });

  test('requesting recorder keeps the cancel action reachable without an empty stop slot', async ({ page }) => {
    await page.setViewportSize(CANONICAL_VIEWPORTS.narrowPhone);
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        value: { getUserMedia: () => new Promise<MediaStream>(() => {}) },
      });
    });
    await openContent(page);
    await openTab(page, /Slová/);

    const mamaText = page.getByText(/^Mama\b/);
    const row = mamaText.locator('xpath=ancestor::div[contains(@class, "rounded-2xl")]').first();
    await row.getByRole('button', { name: 'Nahrať' }).click();

    await expect(row.getByRole('status')).toContainText('Čakám na povolenie mikrofónu');
    await expect(row.getByRole('button', { name: 'Zastaviť' })).toHaveCount(0);
    const cancel = row.getByRole('button', { name: 'Zrušiť nahrávanie' });
    const cancelBox = await cancel.boundingBox();
    expect(cancelBox).not.toBeNull();
    expect(cancelBox!.width).toBeGreaterThanOrEqual(44);
    expect(cancelBox!.height).toBeGreaterThanOrEqual(44);
    expect(await cancel.evaluate(button => button.previousElementSibling)).toBeNull();
    await expectNoHorizontalOverflow(page);
  });

  test('desktop letter-row actions have separate 44px targets', async ({ page }) => {
    await page.setViewportSize(CANONICAL_VIEWPORTS.desktop);
    await openContent(page);
    await openTab(page, /Písmená/);

    const row = page.getByText(/^A — Auto/).locator('xpath=ancestor::div[contains(@class, "rounded-2xl")]').first();
    const play = row.getByRole('button', { name: 'Prehrať' });
    const record = row.getByRole('button', { name: 'Nahrať' });
    const a = await play.boundingBox();
    const b = await record.boundingBox();
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    expect(a!.width).toBeGreaterThanOrEqual(44);
    expect(a!.height).toBeGreaterThanOrEqual(44);
    expect(b!.width).toBeGreaterThanOrEqual(44);
    expect(b!.height).toBeGreaterThanOrEqual(44);
    expect(b!.x - (a!.x + a!.width)).toBeGreaterThanOrEqual(12);
    await expectNoHorizontalOverflow(page);
  });
});
