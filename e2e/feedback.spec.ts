import { expect, test, type Page } from '@playwright/test';
import { unlockParentGate } from './support/parentGate';

async function openFeedback(page: Page) {
  await page.goto('/settings/help');
  await unlockParentGate(page);
  await page.getByRole('button', { name: 'Odoslať spätnú väzbu' }).click();
  await expect(page.getByRole('dialog', { name: 'Spätná väzba' })).toBeVisible();
}

function mockWeb3Forms(page: Page, status: number, delay = 0) {
  return page.route('**/api.web3forms.com/submit', async route => {
    if (delay) await new Promise(resolve => setTimeout(resolve, delay));
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ success: true }) });
  });
}

test('keyboard category selection, optional message, honest copy, selectable mailto', async ({ page }) => {
  await openFeedback(page);
  const group = page.getByRole('radiogroup', { name: 'Typ správy' });
  const firstRadio = group.getByRole('radio', { name: /Chyba v hre/ });
  await firstRadio.click();
  await expect(firstRadio).toBeChecked();
  await firstRadio.focus();
  await page.keyboard.down('ArrowRight');
  await expect(group.getByRole('radio', { name: /Nápad/ })).toBeChecked();
  await page.keyboard.up('ArrowRight');
  await page.keyboard.down('ArrowRight');
  await expect(group.getByRole('radio', { name: /Pochvala/ })).toBeChecked();
  await page.keyboard.up('ArrowRight');
  await page.getByRole('textbox', { name: /Vaša správa/ }).fill('Návrh: pridať ďalšie hry.');
  await expect(page.getByText(/48 hodín/)).toHaveCount(0);
  await expect(page.getByText(/neposiela|neodpovedáme|nemôžeme odpovedať/i)).toBeVisible();
  const mail = page.getByRole('link', { name: /jan\.svehla@pm\.me/ });
  await expect(mail.first()).toHaveAttribute('href', 'mailto:jan.svehla@pm.me');
});

test('loading, success stays visible until dismissed, no auto-close', async ({ page }) => {
  await openFeedback(page);
  await mockWeb3Forms(page, 200, 600);
  await page.getByRole('radiogroup', { name: 'Typ správy' }).getByRole('radio', { name: /Chyba v hre/ }).click();
  await page.getByRole('textbox', { name: /Vaša správa/ }).fill('Hra sa zasekne po výbere odpovede.');
  await page.getByRole('button', { name: 'Odoslať' }).click();
  await expect(page.getByText('Odosielam…')).toBeVisible();
  await expect(page.getByText('Ďakujeme!')).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Spätná väzba' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Zavrieť', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Zavrieť', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('server failure shows recoverable error and retry succeeds', async ({ page }) => {
  await openFeedback(page);
  await mockWeb3Forms(page, 500);
  await page.getByRole('radiogroup', { name: 'Typ správy' }).getByRole('radio', { name: /Chyba v hre/ }).click();
  await page.getByRole('textbox', { name: /Vaša správa/ }).fill('Hra sa zasekne po výbere odpovede.');
  await page.getByRole('button', { name: 'Odoslať' }).click();
  await expect(page.getByText(/odosielanie zlyhalo/i)).toBeVisible();
  await mockWeb3Forms(page, 200);
  await page.getByRole('button', { name: 'Odoslať' }).click();
  await expect(page.getByText('Ďakujeme!')).toBeVisible();
});

test('bug and suggestion require a non-empty message; praise and other allow an empty message', async ({ page }) => {
  await openFeedback(page);
  const group = page.getByRole('radiogroup', { name: 'Typ správy' });
  const message = page.getByRole('textbox', { name: /Vaša správa/ });
  const submit = page.getByRole('button', { name: 'Odoslať' });

  for (const category of [/Chyba v hre/, /Nápad/]) {
    await group.getByRole('radio', { name: category }).click();
    await expect(message).toHaveAttribute('aria-required', 'true');
    await expect(submit).toBeDisabled();
    await message.fill('   ');
    await expect(submit).toBeDisabled();
    await message.fill('Užitočný opis.');
    await expect(submit).toBeEnabled();
    await message.fill('');
  }

  for (const category of [/Pochvala/, /Iné/]) {
    await group.getByRole('radio', { name: category }).click();
    await expect(message).toHaveAttribute('aria-required', 'false');
    await expect(submit).toBeEnabled();
  }
});

test('Escape closes and focus returns to the opener', async ({ page }) => {
  await openFeedback(page);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Odoslať spätnú väzbu' })).toBeFocused();
});

test('close and submit controls stay reachable on short screens', async ({ page }) => {
  for (const viewport of [{ width: 320, height: 568 }, { width: 667, height: 375 }]) {
    await page.setViewportSize(viewport);
    await openFeedback(page);
    const dialog = page.getByRole('dialog', { name: 'Spätná väzba' });
    const submit = page.getByRole('button', { name: 'Odoslať', exact: true });
    const close = page.getByRole('button', { name: 'Zavrieť dialóg' });
    await expect(submit).toBeInViewport();
    await expect(close).toBeInViewport();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  }
});
