import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { chromium } from 'playwright';
import { expect } from '@playwright/test';
import sharp from 'sharp';
import { buildIdentity } from '../verification/identity.mjs';
import { selectCatalogStudyIds } from './catalogStudySelection.mjs';

const base = process.env.CATALOG_PREVIEW_URL || 'http://127.0.0.1:3004';
const requested = process.argv.slice(2).filter(arg => arg.startsWith('--asset=')).map(arg => arg.slice(8));
const progress = JSON.parse(fs.readFileSync('assets/avatar/catalog-a/catalog-progress.json', 'utf8'));
const ids = selectCatalogStudyIds(progress, requested);
const registrations = new Map(progress.model_studies.map(study => [study.id, study]));
const batch = !requested.length ? 'all' : ids.length === 1 ? ids[0] : 'selection-' + crypto.createHash('sha256').update(ids.join('\n')).digest('hex').slice(0,12);
const output = 'artifacts/verification/avatar-catalog/model-studies/' + batch;
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
fs.mkdirSync(output, { recursive: true });
const results = [];
const report = {status:'running', requestedIds:ids, results};
fs.writeFileSync(`${output}/report.json`, JSON.stringify(report, null, 2));
let browser;
let failure;
try {
  report.verifierSha256 = hash(fs.readFileSync(new URL(import.meta.url)));
  report.identity = buildIdentity('development');
  browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader', '--use-gl=angle'] });
  for (const [name, viewport] of [['desktop', {width:1280,height:900}], ['phone', {width:390,height:844}]]) {
    for (const id of ids) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      const errors = [], failed = [], aborted = [], completedGets = [], fetchedGets = [], fetchedHashes = {};
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      page.on('requestfailed', request => {
        const row = { url:request.url(), method:request.method(), reason:request.failure()?.errorText };
        (row.reason === 'net::ERR_ABORTED' ? aborted : failed).push(row);
      });
      page.on('requestfinished', request => { if (request.method() === 'GET') completedGets.push(request.url()); });
      // Three's streamed loader can abort CDP transport after parsing. Complete
      // and hash the actual local HTTP GET before fulfilling its page request;
      // retain page transport aborts separately instead of treating them as proof.
      await page.route('**/__avatar_catalog/**/*.glb*', async route => {
        if (route.request().method() !== 'GET') return route.continue();
        const response = await route.fetch();
        const bytes = await response.body();
        assert.equal(response.status(), 200);
        fetchedGets.push(route.request().url());
        fetchedHashes[route.request().url()] = hash(bytes);
        await route.fulfill({response, body:bytes});
      });
      const manifest = await (await context.request.get(`${base}/__avatar_catalog/library.json`)).json();
      const asset = manifest.assets.find(asset => asset.id === id);
      assert(asset?.model && asset.references.length > 0 && asset.sources.length > 0, `Registered study: ${id}`);
      assert.equal(asset.accepted, false); assert.equal(asset.fitVerified, false); assert.equal(asset.history, registrations.get(id).history === true);
      assert.equal(asset.status, registrations.get(id).repair_needed === true ? 'repair-needed' : 'candidate');
      const relative = decodeURIComponent(new URL(asset.model.modelUrl, base).pathname.replace('/__avatar_catalog/files/', ''));
      const sourceHash = hash(fs.readFileSync(path.resolve(relative)));
      await page.goto(`${base}/avatar-preview?asset=${encodeURIComponent(id)}`);
      await page.getByTestId('catalog-ready').waitFor({timeout:90000});
      await expect(page.getByTestId('asset-title')).toHaveText(asset.label);
      assert.equal(await page.locator('canvas').count(), 1);
      await expect.poll(() => fetchedGets.includes(new URL(asset.model.modelUrl, base).href)).toBe(true);
      const served = await context.request.get(new URL(asset.model.modelUrl, base).href);
      assert.equal(served.status(), 200); assert.equal(hash(await served.body()), sourceHash);
      assert.equal(fetchedHashes[new URL(asset.model.modelUrl, base).href], sourceHash);
      for (const source of asset.sources.filter(source => /report|canonical-face-layout|\.blend$/.test(source.path)).slice(0, 4)) {
        assert.equal((await context.request.head(`${base}${source.url}`)).status(), 200);
      }
      async function capture(view) {
        await page.getByRole('button', {name:view,exact:true}).click();
        await page.getByTestId('catalog-viewport').scrollIntoViewIfNeeded();
        await page.waitForTimeout(200);
        const bytes = await page.getByTestId('catalog-viewport').screenshot();
        const stem = `${name}-${id}-${view}`;
        fs.writeFileSync(`${output}/${stem}.png`, bytes);
        await sharp(bytes).resize({width:320}).png().toFile(`${output}/${stem}-review.png`);
        return hash(bytes);
      }
      const frontHash = await capture('front');
      const backHash = await capture('back');
      assert.notEqual(frontHash, backHash, 'Camera controls change the rendered view');
      let motion = false;
      if (asset.supportsGait) {
        await page.getByRole('button', {name:'Run',exact:true}).click();
        await page.getByTestId('catalog-ready').waitFor({timeout:90000});
        await expect.poll(() => fetchedGets.includes(new URL(manifest.animations.run, base).href)).toBe(true);
        assert.equal(fetchedHashes[new URL(manifest.animations.run, base).href], hash(fs.readFileSync('assets/avatar/catalog-a/foundation/catalog-body-run.glb')));
        const first = hash(await page.locator('canvas').screenshot());
        await page.waitForTimeout(350);
        const second = hash(await page.locator('canvas').screenshot());
        assert.notEqual(first, second, 'Run must move rendered pixels');
        await page.getByRole('button', {name:'Pause',exact:true}).click();
        await page.getByTestId('catalog-pose').fill('0.45');
        await capture('three-quarter');
        motion = true;
      } else {
        await expect(page.getByRole('button', {name:'Walk',exact:true})).toBeDisabled();
        await expect(page.getByRole('button', {name:'Run',exact:true})).toBeDisabled();
      }
      const canvas = await page.locator('canvas').evaluate(canvas => ({width:canvas.width,height:canvas.height,bytes:canvas.toDataURL().length}));
      assert(canvas.width > 0 && canvas.height > 0 && canvas.bytes > 1000);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.deepEqual(errors, []); assert.deepEqual(failed, []);
      assert(aborted.every(row => row.url.includes('/__avatar_catalog/') && (row.method === 'HEAD' || fetchedGets.includes(row.url) || completedGets.includes(row.url))), 'Only catalog probes or URLs with completed HTTP proof may abort during scene cleanup');
      results.push({name,id,viewport,source:relative,sourceSha256:sourceHash,inventoryVersion:manifest.version,canvas,motion,fetchedGets,fetchedHashes,completedGets:completedGets.filter(url => url.includes('/__avatar_catalog/')),errors,failed,aborted});
      await context.close();
    }
  }
} catch (error) {
  failure = error;
  report.error = String(error);
  throw error;
} finally {
  try { await browser?.close(); } catch (error) { failure ??= error; report.error ??= String(error); process.exitCode = 1; }
  report.status = !failure && results.length === ids.length * 2 ? 'passed' : 'failed';
  fs.writeFileSync(`${output}/report.json`, JSON.stringify(report, null, 2));
}
console.log(JSON.stringify({cases:results.length,output}));
