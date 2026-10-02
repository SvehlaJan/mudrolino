import { expect, test, type Page } from './support/fixtures';
import { unlockParentGate } from './support/parentGate';

async function openFeedback(page: Page) {
  await page.goto('/settings/help');
  await unlockParentGate(page);
  await expect(page.getByRole('heading', { level: 1, name: 'Pomoc a spätná väzba' })).toBeVisible();
  await expect(page.getByRole('form', { name: 'Spätná väzba' })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}

function mockWeb3Forms(page: Page, status: number, delay = 0) {
  return page.route('**/api.web3forms.com/submit', async route => {
    if (delay) await new Promise(resolve => setTimeout(resolve, delay));
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ success: true }) });
  });
}

test('keyboard category selection and optional message retain honest copy', async ({ page }) => {
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
  await expect(page.getByRole('link', { name: /jan\.svehla@pm\.me/ })).toHaveCount(0);
});

test('loading and success stay visible inline', async ({ page }) => {
  await openFeedback(page);
  const submissions: Array<{ method: string | null; data: Record<string, unknown> }> = [];
  await page.route('**/api.web3forms.com/submit', async route => {
    const request = route.request();
    submissions.push({ method: request.method(), data: request.postDataJSON() as Record<string, unknown> });
    await new Promise(resolve => setTimeout(resolve, 600));
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
  });
  const messageText = 'Hra sa zasekne po výbere odpovede.';
  await page.getByRole('radiogroup', { name: 'Typ správy' }).getByRole('radio', { name: /Chyba v hre/ }).click();
  await page.getByRole('textbox', { name: /Vaša správa/ }).fill(messageText);
  const submit = page.getByRole('form', { name: 'Spätná väzba' }).locator('button[type="submit"]');
  await submit.click();
  await expect(page.getByText('Odosielam…')).toBeVisible();
  await expect(submit).toBeDisabled();
  await submit.evaluate(button => (button as HTMLButtonElement).click());
  await expect.poll(() => submissions.length).toBe(1);
  await expect(page.getByText('Ďakujeme!')).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Ďakujeme!' })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(submissions).toHaveLength(1);
  expect(submissions[0].method).toBe('POST');
  expect(submissions[0].data).toMatchObject({
    category: 'Chyba v hre',
    message: messageText,
    screen: 'help',
  });
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

test('inline feedback is the only help content and Back returns to settings', async ({ page }) => {
  await openFeedback(page);
  await expect(page.getByRole('main')).toHaveCount(1);
  await expect(page.getByRole('link', { name: /jan\.svehla@pm\.me/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Späť' }).click();
  await expect(page).toHaveURL(/\/settings$/);
});

test('submit stays reachable on short screens while fields scroll', async ({ page }) => {
  for (const viewport of [{ width: 320, height: 568 }, { width: 667, height: 375 }]) {
    await page.setViewportSize(viewport);
    await openFeedback(page);
    const submit = page.getByRole('button', { name: 'Odoslať', exact: true });
    await expect(submit).toBeInViewport({ ratio: 1 });
    const fields = page.getByRole('form', { name: 'Spätná väzba' }).locator('div.overflow-y-auto');
    await fields.evaluate(element => { element.scrollTop = element.scrollHeight; });
    await expect(submit).toBeInViewport({ ratio: 1 });
  }
});
