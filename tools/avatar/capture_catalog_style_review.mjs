import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { buildIdentity } from '../verification/identity.mjs';

const base = process.env.CATALOG_PREVIEW_URL || 'http://127.0.0.1:3004';
const out = process.env.CATALOG_STYLE_REVIEW_OUTPUT || `assets/avatar/catalog-a/style-review/${new Date().toISOString().replace(/[:.]/g, '-')}`;
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader', '--use-gl=angle'] });
const records = [], errors = [], failed = [], cancellations = [], rawCaptures = new Map();
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('requestfailed', r => { const row = { url: r.url(), method: r.method(), reason: r.failure()?.errorText }; (row.reason === 'net::ERR_ABORTED' ? cancellations : failed).push(row); });
  await page.goto(`${base}/avatar-preview`);
  await page.getByTestId('catalog-ready').waitFor({ timeout: 60000 });
  const manifest = await (await page.request.get(`${base}/__avatar_catalog/manifest.json`)).json();
  for (const id of ['study-f04', 'H01', 'study-h01-reference-a', 'head-style-reference-a']) {
    await page.getByTestId('catalog-model').selectOption(id);
    await page.getByTestId('catalog-ready').waitFor({ timeout: 60000 });
    const entry = manifest.entries.find(e => e.id === id);
    for (const view of ['front', 'side', 'back', 'three-quarter']) {
      await page.getByRole('button', { name: view, exact: true }).click();
      await page.waitForTimeout(100);
      const name = `${id}-${view}-review.png`;
      const pixels = await page.getByTestId('catalog-viewport').screenshot();
      rawCaptures.set(`${id}-${view}`, pixels);
      await sharp(pixels).resize({ width: 320 }).toFile(`${out}/${name}`);
      records.push({ scene: id, view, file: name, width: 320, viewport: { width: 1100, height: 900 }, seed: null, modelUrl: entry.modelUrl, modelSha256: crypto.createHash('sha256').update(fs.readFileSync(`assets/avatar/catalog-a/${entry.modelUrl.split('/assets/')[1]}`)).digest('hex') });
    }
  }
  assert.deepEqual(errors, []); assert.deepEqual(failed, []);
  const source = 'assets/avatar/concepts/2026-10-04';
  const crops = [
    ['catalog-a/06-face-hair.png', { left: 15, top: 75, width: 260, height: 380 }, 'reference-h01-front-review.png'],
    ['catalog-a/06-face-hair.png', { left: 275, top: 75, width: 210, height: 380 }, 'reference-h01-side-review.png'],
    ['catalog-a/05-character-views.png', { left: 15, top: 70, width: 395, height: 885 }, 'reference-character-front-review.png'],
    ['catalog-a/07-outfit-combinations.png', { left: 515, top: 525, width: 500, height: 480 }, 'reference-o05-review.png'],
    ['a-bright-friendly.png', null, 'reference-a-review.png'],
  ];
  for (const [relative, crop, name] of crops) {
    const file = `${source}/${relative}`; let image = sharp(file);
    if (crop) image = image.extract(crop);
    await image.resize({ width: 320 }).toFile(`${out}/${name}`);
    records.push({ scene: 'reference', file: name, source: file, crop, width: 320, sourceSha256: crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') });
  }
  for (const [name, crop] of [
    ['H01-front', { left: 66, top: 20, width: 189, height: 218 }],
    ['H01-side', { left: 71, top: 18, width: 185, height: 220 }],
    ['study-f04-front', { left: 88, top: 15, width: 145, height: 226 }],
    ['head-style-reference-a-front', { left: 44, top: 18, width: 232, height: 220 }],
    ['head-style-reference-a-side', { left: 71, top: 18, width: 185, height: 220 }],
    ['study-h01-reference-a-front', { left: 88, top: 15, width: 145, height: 226 }],
  ]) {
    const source = `${out}/${name}-review.png`; const file = `${name}-detail-review.png`;
    const pixels = rawCaptures.get(name); const metadata = await sharp(pixels).metadata(); const ratio = metadata.width / 320;
    const nativeCrop = Object.fromEntries(Object.entries(crop).map(([key, value]) => [key, Math.round(value * ratio)]));
    await sharp(pixels).extract(nativeCrop).resize({ width: 320 }).toFile(`${out}/${file}`);
    records.push({ scene: 'comparison-detail', file, width: 320, source, crop });
  }
  fs.writeFileSync(`${out}/manifest.json`, JSON.stringify({ checkedAt: new Date().toISOString(), identity: buildIdentity('development'), base, records, errors, failed, cancellations, qualification: 'Rest-pose visual review; source-bound loaded-model snapshots. ERR_ABORTED events retained; this capture is not a fitting or transport acceptance gate. Full transport/control proof is in tools/avatar/verify_catalog_inspection.mjs.' }, null, 2));
  console.log(JSON.stringify({ status: 'captured', out, reviews: records.length, errors, failed }));
} finally { await browser.close(); }
