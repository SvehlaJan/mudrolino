// Reference audit: render catalog models in the live gallery and pair each with its 2D reference.
// Usage: node tools/avatar/capture_reference_audit.mjs [--out=DIR] [--ids=T01,T02,...]
// Needs the development gallery (CATALOG_PREVIEW_URL, default http://127.0.0.1:3004).
// Every saved review image is at most 320px wide; raw captures stay under DIR/raw.
import fs from 'node:fs';
import crypto from 'node:crypto';
import { chromium } from 'playwright';
import sharp from 'sharp';

const base = process.env.CATALOG_PREVIEW_URL || 'http://127.0.0.1:3004';
const arg = name => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3);
const out = arg('out') || `artifacts/verification/avatar-catalog/reference-audit/${new Date().toISOString().replace(/[:.]/g, '-')}`;
const REF = 'assets/avatar/concepts/2026-10-04/';
const VIEWS = ['front', 'three-quarter', 'side', 'back'];
// Vertical fractions of the rendered figure used for close review.
const REGIONS = { full: [0, 1], head: [0, .2], torso: [.14, .56], legs: [.44, .93], feet: [.82, 1] };
const male = 'catalog-a/05-character-views.png', female = 'catalog-a-female/01-character-turnaround.png';
const tops = 'catalog-a/01-tops.png', bottoms = 'catalog-a/02-bottoms.png', shoes = 'catalog-a/03-footwear.png';
const box = (left, top, width, height) => ({ left, top, width, height });
const topCell = (i, back) => box((i % 3) * 512 + (back ? 250 : 20), i < 3 ? 95 : 560, 250, 370);
// [model view, model region, reference sheet, reference crop] per asset.
const PAIRS = {
  body: [['front', 'full', male, box(15, 70, 395, 885)]],
  'study-h01-reference-a': [['front', 'full', male, box(15, 70, 395, 885)], ['three-quarter', 'full', male, box(1130, 70, 395, 885)]],
  'head-style-reference-a': [['front', 'full', 'catalog-a/06-face-hair.png', box(15, 75, 260, 380)], ['side', 'full', 'catalog-a/06-face-hair.png', box(275, 75, 210, 380)]],
  'h01-painted-face-head': [['front', 'full', 'catalog-a/06-face-hair.png', box(15, 75, 260, 380)], ['three-quarter', 'full', 'catalog-a/05-character-views.png', box(1180, 70, 300, 300)], ['side', 'full', 'catalog-a/06-face-hair.png', box(275, 75, 210, 380)]],
  'study-h01-painted-face': [['front', 'full', male, box(15, 70, 395, 885)], ['three-quarter', 'full', male, box(1130, 70, 395, 885)]],
  'female-foundation-h02-study': [['front', 'full', female, box(15, 70, 395, 885)]],
  'female-h02-head-study': [['front', 'full', female, box(90, 70, 250, 260)], ['three-quarter', 'full', 'catalog-a/13-head-turnarounds.png', box(0, 60, 384, 440)]],
  'female-outfit-T02-B01-F01-study': [['front', 'full', female, box(15, 70, 395, 885)], ['front', 'torso', 'catalog-a-female/03-hoodie-fit-turnaround.png', box(0, 60, 400, 560)], ['back', 'torso', 'catalog-a-female/03-hoodie-fit-turnaround.png', box(760, 60, 400, 560)]],
  ...Object.fromEntries(['T01', 'T02', 'T03', 'T04', 'T05', 'T06'].map((id, i) => [id, [['front', 'torso', tops, topCell(i, false)], ['back', 'torso', tops, topCell(i, true)]]])),
  B01: [['front', 'legs', bottoms, box(100, 60, 290, 430)], ['back', 'legs', bottoms, box(420, 60, 290, 430)]],
  B02: [['front', 'legs', bottoms, box(860, 60, 290, 430)]],
  B03: [['front', 'legs', bottoms, box(100, 520, 290, 400)]],
  B04: [['front', 'legs', bottoms, box(860, 520, 290, 430)]],
  F01: [['three-quarter', 'feet', shoes, box(30, 90, 420, 330)]],
  F02: [['three-quarter', 'feet', shoes, box(800, 90, 420, 330)]],
  F03: [['three-quarter', 'feet', shoes, box(30, 560, 420, 350)]],
  F04: [['three-quarter', 'feet', shoes, box(800, 560, 420, 350)]],
  A01: [['three-quarter', 'head', 'catalog-a/04-accessories.png', box(20, 90, 460, 330)]],
};
const ids = arg('ids')?.split(',') ?? Object.keys(PAIRS);

async function figureBox(buffer) {
  const { data, info } = await sharp(buffer).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let minX = info.width, minY = info.height, maxX = 0, maxY = 0;
  // Skip the rounded viewport corners; compare against the row's vertical-gradient background.
  for (let y = 24; y < info.height - 24; y++) {
    const b = (y * info.width + 30) * 3;
    for (let x = 30; x < info.width - 30; x++) {
      const i = (y * info.width + x) * 3;
      if (Math.abs(data[i] - data[b]) + Math.abs(data[i + 1] - data[b + 1]) + Math.abs(data[i + 2] - data[b + 2]) > 30) {
        minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      }
    }
  }
  return { minX, minY, maxX, maxY, width: info.width, height: info.height };
}

function regionCrop(figure, [from, to]) {
  const h = figure.maxY - figure.minY;
  const top = Math.max(0, Math.round(figure.minY + h * from) - 6);
  const height = Math.min(figure.height, Math.round(figure.minY + h * to) + 6) - top;
  const width = Math.min(figure.width, Math.max(Math.round(height * .9), figure.maxX - figure.minX + 12));
  const left = Math.max(0, Math.min(figure.width - width, Math.round((figure.minX + figure.maxX) / 2 - width / 2)));
  return { left, top, width, height };
}

// Heads tall: silhouette height over top-to-neck height, the neck being the narrowest row
// between 10% and 35% of the figure. Hair counts as head, as in the references.
async function proportions(image, crop) {
  let input = sharp(image); if (crop) input = input.extract(crop);
  const { data, info } = await input.removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const rows = [];
  for (let y = 0; y < info.height; y++) {
    const b = (y * info.width + 30) * 3; let min = info.width, max = -1, count = 0;
    for (let x = 30; x < info.width - 30; x++) {
      const i = (y * info.width + x) * 3;
      if (Math.abs(data[i] - data[b]) + Math.abs(data[i + 1] - data[b + 1]) + Math.abs(data[i + 2] - data[b + 2]) > 40) { count++; min = Math.min(min, x); max = x; }
    }
    rows.push(count > 2 ? { min, max, count } : null);
  }
  const top = rows.findIndex(Boolean); let bottom = top;
  for (let y = top, gap = 0; y < info.height; y++) { if (rows[y]) { bottom = y; gap = 0; } else if (++gap > 6) break; }
  const height = bottom - top; let neck = top, narrowest = Infinity;
  for (let y = top + Math.round(height * .1); y < top + Math.round(height * .35); y++) if (rows[y] && rows[y].count < narrowest) { narrowest = rows[y].count; neck = y; }
  let headWidth = 0; for (let y = top; y < neck; y++) if (rows[y]) headWidth = Math.max(headWidth, rows[y].max - rows[y].min);
  return { headsTall: +(height / (neck - top)).toFixed(2), headWidthToHeight: +(headWidth / height).toFixed(3) };
}
const FULL_BODY = new Set(['body', 'study-h01-reference-a', 'study-h01-painted-face', 'female-foundation-h02-study', 'female-outfit-T02-B01-F01-study']);

async function pair(reference, crop, model, file, height = 220) {
  const fit = { width: 158, height, fit: 'contain', background: '#ffffff' };
  const [a, b] = await Promise.all([sharp(REF + reference).extract(crop).resize(fit).png().toBuffer(), sharp(model).resize(fit).png().toBuffer()]);
  await sharp({ create: { width: 320, height, channels: 3, background: '#ffffff' } })
    .composite([{ input: a, left: 0, top: 0 }, { input: b, left: 162, top: 0 }]).png().toFile(file);
}

fs.mkdirSync(`${out}/raw`, { recursive: true });
const library = await (await fetch(`${base}/__avatar_catalog/library.json`)).json();
const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader', '--use-gl=angle'] });
const errors = [], failed = [], records = [];
try {
  const page = await browser.newPage({ viewport: { width: 1000, height: 1300 } });
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('requestfailed', r => { if (r.failure()?.errorText !== 'net::ERR_ABORTED') failed.push(r.url()); });
  for (const id of ids) {
    const entry = library.assets.find(asset => asset.id === id && asset.model);
    if (!entry) throw new Error(`No gallery model for ${id}`);
    const modelPath = `assets/${decodeURIComponent(entry.model.modelUrl.split('/assets/')[1].split('?')[0])}`;
    const resolved = fs.existsSync(modelPath) ? modelPath : `assets/avatar/catalog-a/${modelPath.slice(7)}`;
    await page.goto(`${base}/avatar-preview?asset=${encodeURIComponent(id)}`);
    await page.getByTestId('catalog-ready').waitFor({ timeout: 90000 });
    const captures = {};
    for (const view of VIEWS) {
      await page.getByRole('button', { name: view, exact: true }).click();
      await page.waitForTimeout(250);
      const pixels = await page.getByTestId('catalog-viewport').screenshot();
      fs.writeFileSync(`${out}/raw/${id}-${view}.png`, pixels);
      const figure = await figureBox(pixels);
      captures[view] = {};
      for (const [region, range] of Object.entries(REGIONS)) {
        const file = `${out}/${id}-${view}-${region}.png`;
        const crop = regionCrop(figure, range);
        await sharp(pixels).extract(crop).resize({ width: Math.min(320, crop.width) }).toFile(file);
        captures[view][region] = file;
      }
    }
    const pairs = [];
    for (const [view, region, reference, crop] of PAIRS[id] ?? []) {
      const file = `${out}/pair-${id}-${view}-${region}.png`;
      await pair(reference, crop, captures[view][region], file);
      pairs.push({ file, view, region, reference: REF + reference, crop });
    }
    const measured = FULL_BODY.has(id) ? await proportions(`${out}/raw/${id}-front.png`, { left: 0, top: 24, width: 920, height: 690 }) : undefined;
    records.push({ id, model: resolved, modelSha256: fs.existsSync(resolved) ? crypto.createHash('sha256').update(fs.readFileSync(resolved)).digest('hex') : null, proportions: measured, pairs });
    console.log('captured', id);
  }
} finally { await browser.close(); }
const referenceProportions = {
  male: await proportions(REF + male, box(15, 70, 395, 885)),
  female: await proportions(REF + female, box(15, 70, 395, 885)),
};
fs.writeFileSync(`${out}/manifest.json`, `${JSON.stringify({ base, created: new Date().toISOString(), viewport: { width: 1000, height: 1300 }, referenceProportions, records, errors, failed }, null, 2)}\n`);
if (errors.length || failed.length) { console.error({ errors, failed }); process.exit(1); }
console.log(`Saved ${records.length} models to ${out}`);
