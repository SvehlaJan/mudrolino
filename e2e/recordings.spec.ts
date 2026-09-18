import { expect, test } from '@playwright/test';
import { unlockParentGate } from './support/parentGate';

import { installFakeRecorder, fakeRecorderMode, recordingResources, storedRecordings } from './support/fakeRecorder';

test.beforeEach(async ({ page }) => {
  await installFakeRecorder(page);
});

test('fake recorder emits non-empty data before its stop event', async ({ page }) => {
  await page.goto('/');
  const events = await page.evaluate(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    const received: string[] = [];
    recorder.ondataavailable = event => {
      if (event.data.size > 0) received.push('data');
    };
    recorder.onstop = () => received.push('stop');
    recorder.start();
    recorder.stop();
    await new Promise(resolve => setTimeout(resolve, 50));
    return received;
  });
  expect(events).toEqual(['data', 'stop']);
});

test('recording exposes Stop-save and Cancel-discard and disables other rows', async ({ page }) => {
  await page.goto('/content');
  await unlockParentGate(page);
  await page.getByRole('button', { name: 'Nahrať', exact: true }).first().click();
  await expect(page.getByRole('button', { name: 'Zastaviť', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Zrušiť nahrávanie', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Nahrať', exact: true }).first()).toBeDisabled();
  await page.getByRole('button', { name: 'Zrušiť nahrávanie', exact: true }).click();
  await expect(page.getByText('Nahrávanie zrušené.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Zmazať nahrávku' })).toHaveCount(0);
  expect(await storedRecordings(page)).toEqual([]);
  expect(await recordingResources(page)).toEqual({ tracks: 0, contexts: 0, recorders: 0 });
});

test('Stop saves a non-empty WAV and supports replacement, play and confirmed deletion', async ({ page }) => {
  await page.goto('/content');
  await unlockParentGate(page);
  for (let attempt = 0; attempt < 2; attempt++) {
    await page.getByRole('button', { name: 'Nahrať', exact: true }).first().click();
    await page.getByRole('button', { name: 'Zastaviť', exact: true }).click();
    await expect(page.getByText('Nahrávka uložená.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Nahrať', exact: true }).first()).toBeEnabled();
    const stored = await storedRecordings(page);
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ type: 'audio/wav', header: 'RIFF' });
    expect(stored[0].size).toBeGreaterThan(44);
    expect(await recordingResources(page)).toEqual({ tracks: 0, contexts: 0, recorders: 0 });
  }
  await page.getByRole('button', { name: 'Prehrať', exact: true }).first().click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __fakeRecorder: { plays: number } }).__fakeRecorder.plays)).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Zmazať nahrávku' }).click();
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await page.getByRole('button', { name: 'Zrušiť', exact: true }).click();
  expect(await storedRecordings(page)).toHaveLength(1);
  await page.getByRole('button', { name: 'Zmazať nahrávku' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Zmazať', exact: true }).click();
  await expect.poll(() => storedRecordings(page)).toEqual([]);
});

for (const viewport of [{ width: 320, height: 568 }, { width: 667, height: 375 }, { width: 768, height: 1024 }, { width: 1280, height: 900 }]) {
  test(`recording targets and live status at ${viewport.width}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/content');
    await unlockParentGate(page);
    const record = page.getByRole('button', { name: 'Nahrať', exact: true }).first();
    const bounds = await record.boundingBox();
    expect(bounds?.width).toBeGreaterThanOrEqual(44);
    expect(bounds?.height).toBeGreaterThanOrEqual(44);
    await record.click();
    await expect(page.getByRole('status').filter({ hasText: /Nahrávam/ })).toBeVisible();
    for (const name of ['Zastaviť', 'Zrušiť nahrávanie']) {
      const action = page.getByRole('button', { name, exact: true });
      await action.scrollIntoViewIfNeeded();
      const box = await action.boundingBox();
      expect(box?.width).toBeGreaterThanOrEqual(44);
      expect(box?.height).toBeGreaterThanOrEqual(44);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('button', { name: 'Zrušiť nahrávanie' }).click();
  });
}

for (const mode of ['delayed-permission', 'delayed-processing']) {
  test(`cancel during ${mode} ignores stale events after starting another row`, async ({ page }) => {
    await page.goto('/content');
    await unlockParentGate(page);
    await fakeRecorderMode(page, mode);
    await page.getByRole('button', { name: 'Nahrať', exact: true }).first().click();
    if (mode === 'delayed-processing') {
      await page.getByRole('button', { name: 'Zastaviť', exact: true }).click();
      await page.waitForFunction(() => Boolean((window as unknown as { __fakeRecorder: { pendingDecode: unknown } }).__fakeRecorder.pendingDecode));
    }
    await page.getByRole('button', { name: 'Zrušiť nahrávanie' }).click();
    await fakeRecorderMode(page, 'success');
    await page.getByRole('button', { name: 'Nahrať', exact: true }).nth(1).click();
    await page.evaluate(() => {
      const control = (window as unknown as { __fakeRecorder: { pendingDecode: (() => void) | null; pendingPermission: (() => void) | null } }).__fakeRecorder;
      control.pendingDecode?.();
      control.pendingPermission?.();
    });
    await page.getByRole('button', { name: 'Zastaviť', exact: true }).click();
    await expect(page.getByText('Nahrávka uložená.')).toBeVisible();
    const stored = await storedRecordings(page);
    expect(stored).toHaveLength(1);
    expect(stored[0].key).not.toBe('sk/letters/a');
    expect(await recordingResources(page)).toEqual({ tracks: 0, contexts: 0, recorders: 0 });
  });
}

for (const mode of ['denied', 'processing-failed']) {
  test(`${mode} is recoverable without saving a blob`, async ({ page }) => {
    await page.goto('/content');
    await unlockParentGate(page);
    await fakeRecorderMode(page, mode);
    await page.getByRole('button', { name: 'Nahrať', exact: true }).first().click();
    if (mode === 'processing-failed') await page.getByRole('button', { name: 'Zastaviť', exact: true }).click();
    await expect(page.getByText(mode === 'denied' ? /Povoľte mikrofón/ : /Spracovanie nahrávky zlyhalo/)).toBeVisible();
    expect(await storedRecordings(page)).toEqual([]);
    expect(await recordingResources(page)).toEqual({ tracks: 0, contexts: 0, recorders: 0 });
    await fakeRecorderMode(page, 'success');
    await page.getByRole('button', { name: 'Nahrať', exact: true }).first().click();
    await page.getByRole('button', { name: 'Zastaviť', exact: true }).click();
    await expect(page.getByText('Nahrávka uložená.')).toBeVisible();
  });
}
