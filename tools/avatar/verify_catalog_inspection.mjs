import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { buildIdentity } from '../verification/identity.mjs';

const base = process.env.CATALOG_PREVIEW_URL || 'http://127.0.0.1:3004';
const defaultModel = process.env.CATALOG_INSPECTION_DEFAULT_MODEL || 'study-f04';
const inspectionUrl = `${base}/avatar-preview?model=${encodeURIComponent(defaultModel)}`;
const dir = 'artifacts/verification/avatar-catalog/inspection-page';
fs.mkdirSync(dir, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader', '--use-gl=angle'] });
const warmup = await browser.newPage();
await warmup.goto(inspectionUrl);
await warmup.getByTestId('catalog-ready').waitFor({ timeout: 60000 });
await warmup.waitForLoadState('networkidle');
await warmup.close();
const results = [];
const identity = buildIdentity('development');
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
try {
  for (const [label, viewport] of [['desktop', { width: 1280, height: 900 }], ['phone', { width: 390, height: 844 }]]) {
    const context = await browser.newContext({ viewport }); const page = await context.newPage();
    const errors = [], failed = [], cleanupAborts = []; const fulfilled = new Set(); const completedGets = new Set(); const parsedModels = new Set();
    page.on('requestfinished', request => { if (request.method() === 'GET') completedGets.add(request.url()); });
    page.on('response', response => { if (response.ok()) fulfilled.add(response.url()); });
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('requestfailed', request => { const row = { url: request.url(), method: request.method(), range: request.headers().range, reason: request.failure()?.errorText }; if (row.reason === 'net::ERR_ABORTED') cleanupAborts.push(row); else failed.push(row); });
    await page.goto(inspectionUrl);
    await page.getByTestId('catalog-ready').waitFor({ timeout: 60000 });
    assert.equal(await page.getByTestId('catalog-model').inputValue(), defaultModel);
    const manifest = await (await context.request.get(`${base}/__avatar_catalog/manifest.json`)).json();
    const recordParsed = (entry, animation = 'rest') => {
      for (const url of [entry.modelUrl, entry.garmentUrl, animation === 'rest' ? undefined : manifest.animations[animation]]) {
        if (url) parsedModels.add(`${base}${url}`);
      }
    };
    recordParsed(manifest.entries.find(e => e.id === defaultModel));
    const capture = async name => {
      const bytes = await page.getByTestId('catalog-viewport').screenshot();
      await sharp(bytes).resize({ width: 320 }).toFile(`${dir}/${label}-${name}-review.png`);
      return hash(bytes);
    };
    const initial = await capture('rest');
    await sharp(await page.screenshot({ fullPage: true })).resize({ width: 320 }).toFile(`${dir}/${label}-page-review.png`);
    await page.getByRole('button', { name: 'Walk', exact: true }).click();
    await page.getByTestId('catalog-ready').waitFor({ timeout: 60000 });
    recordParsed(manifest.entries.find(e => e.id === defaultModel), 'walk');
    const walking = await capture('walk');
    await page.waitForTimeout(200);
    assert.notEqual(walking, await capture('walk-later'), 'Walking model must animate');
    await page.getByRole('button', { name: 'Run', exact: true }).click();
    await page.getByTestId('catalog-ready').waitFor({ timeout: 60000 });
    recordParsed(manifest.entries.find(e => e.id === defaultModel), 'run');
    const first = await capture('run');
    await page.waitForTimeout(200);
    const later = await capture('run-later');
    assert.notEqual(first, later, 'Running model must animate');
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await page.waitForTimeout(150);
    const paused = await capture('paused');
    await page.waitForTimeout(150);
    assert.equal(paused, await capture('paused-later'), 'Pause must freeze the displayed pose');
    await page.getByTestId('catalog-pose').fill('0.45');
    await page.waitForTimeout(100);
    const scrubbed = await capture('scrubbed');
    assert.notEqual(paused, scrubbed, 'Scrubbing must change pose');
    await page.getByRole('button', { name: 'back', exact: true }).click();
    await page.waitForTimeout(100);
    assert.notEqual(scrubbed, await capture('back'), 'Camera preset must change viewpoint');
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
    await page.getByRole('button', { name: 'Rest', exact: true }).click();
    await page.getByTestId('catalog-ready').waitFor();
    const probe = await context.request.get(`${base}${manifest.entries.find(e => e.id === 'F04').modelUrl}`, { headers: { Range: 'bytes=0-0' } });
    assert.equal(probe.status(), 206); assert.equal((await probe.body()).length, 1);
    const inspected = [];
    // Desktop covers every independent model, and representative complete outfits.
    const entries = label === 'desktop' ? manifest.entries.filter(e => e.kind !== 'outfit' || ['outfit-T01-B01-F01-A01', 'outfit-T04-B04-F03-A01'].includes(e.id)) : manifest.entries.filter(e => ['F04', 'B03', 'T02'].includes(e.id));
    for (const entry of entries) {
      await page.getByTestId('catalog-model').selectOption(entry.id);
      await page.getByTestId('catalog-ready').waitFor({ timeout: 60000 });
      recordParsed(entry);
      assert.equal(await page.getByTestId('catalog-title').textContent(), entry.label);
      const canvas = await page.locator('canvas').evaluate(c => ({ width: c.width, height: c.height, data: c.toDataURL().length }));
      assert(canvas.width > 0 && canvas.height > 0 && canvas.data > 1000);
      inspected.push(entry.id);
    }
    await page.getByTestId('catalog-model').selectOption('F04');
    await page.getByTestId('catalog-ready').waitFor();
    await page.getByRole('button', { name: 'front', exact: true }).click();
    const bootsFront = await capture('boots-front');
    await page.getByRole('checkbox', { name: 'Skeleton', exact: true }).check();
    await page.waitForTimeout(100);
    assert.notEqual(bootsFront, await capture('skeleton'), 'Skeleton overlay must be visible');
    await page.getByRole('checkbox', { name: 'Skeleton', exact: true }).uncheck();
    await page.getByTestId('catalog-viewport').hover();
    await page.mouse.wheel(0, -400); await page.waitForTimeout(250);
    assert.notEqual(bootsFront, await capture('zoom'), 'Zoom must change framing');
    await page.getByRole('button', { name: 'Reset camera', exact: true }).click();
    await page.waitForTimeout(250);
    assert.equal(bootsFront, await capture('reset'), 'Reset must restore front framing');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'No horizontal overflow');
    assert.equal((await context.request.get(`${base}/__avatar_catalog/assets/F04/F04.blend`)).status(), 404);
    assert.deepEqual(errors, []); assert.deepEqual(failed, []);
    // Chromium can report ERR_ABORTED after Three's FileLoader consumes a wrapped
    // ReadableStream completely. A standalone reproduction read the full GLB
    // (including its declared length) with the same event. Accept only exact
    // successfully parsed model URLs with OK responses, and check full transport
    // independently below. Retain every cancellation in the report.
    const unpaired = cleanupAborts.filter(row => !(row.method === 'HEAD' || (row.method === 'GET' && row.url.startsWith(`${base}/__avatar_catalog/`) && (completedGets.has(row.url) || (parsedModels.has(row.url) && fulfilled.has(row.url))))));
    assert.equal(unpaired.length, 0, JSON.stringify({ unpaired, completed: [...completedGets] }));
    const fullTransport = [];
    for (const url of new Set(cleanupAborts.filter(row => row.method === 'GET' && parsedModels.has(row.url)).map(row => row.url))) {
      const response = await context.request.get(url); const bytes = await response.body();
      assert.equal(response.status(), 200); assert.equal(bytes.subarray(0, 4).toString(), 'glTF');
      assert.equal(bytes.readUInt32LE(4), 2); assert.equal(bytes.readUInt32LE(8), bytes.length);
      assert.equal(Number(response.headers()['content-length']), bytes.length);
      fullTransport.push({ url, bytes: bytes.length, validGlb: true });
    }
    results.push({ label, viewport, scene: 'catalog-inspection', seed: null, initial, inspected, walk_changes: true, animation_changes: true, pause_freezes: true, scrub_changes: true, camera_changes: true, skeleton_changes: true, zoom_changes: true, reset_restores: true, errors, failed, cleanupAborts, fullTransport, parsedModels: [...parsedModels], completedGetCount: completedGets.size });
    await context.close();
  }
  const page = await browser.newPage();
  await page.goto(`${base}/avatar-preview?view=modular`); await page.getByText('Modular preview', { exact: true }).waitFor();
  results.push({ label: 'existing-modular-workbench', status: 'passed' });
} finally { await browser.close(); fs.writeFileSync(`${dir}/browser-report.json`, JSON.stringify({ checkedAt: new Date().toISOString(), base, defaultModel, identity, results }, null, 2)); }
console.log(JSON.stringify({ status: 'passed', results }, null, 2));
