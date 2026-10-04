import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { expect } from '@playwright/test';
import sharp from 'sharp';
import { buildIdentity } from '../verification/identity.mjs';

const base = process.env.CATALOG_PREVIEW_URL || 'http://127.0.0.1:3004';
const output = 'artifacts/verification/avatar-catalog/gallery';
fs.mkdirSync(output, { recursive: true });
const results = [];
const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader', '--use-gl=angle'] });
const identity = buildIdentity('development');
const token = `gallerylive${Date.now()}`;
const fixtureDir = path.resolve(`assets/avatar/concepts/${token}`);
const fixtureFile = path.join(fixtureDir, `${token}.png`);
let createdFixture = false;
const card = (page, id) => page.locator(`[data-testid="gallery-card"][data-asset-id=${JSON.stringify(id)}]`);
async function screenshot(page, name) {
  const original = await page.screenshot({ fullPage: !name.endsWith('-gallery') });
  fs.writeFileSync(`${output}/${name}.png`, original);
  await sharp(original).resize({ width: 320 }).png().toFile(`${output}/${name}-review.png`);
}
try {
  for (const [name, viewport] of [['desktop', {width:1280,height:900}], ['phone', {width:390,height:844}]]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const errors = [], failed = [], cleanupAborts = [], expectedFaults = [];
    let faulting = false;
    let navigations = 0;
    page.on('framenavigated', frame => { if (frame === page.mainFrame()) navigations++; });
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
      if (message.type() !== 'error') return;
      if (faulting && message.text().includes('503')) expectedFaults.push(message.text());
      else errors.push({message:message.text(),location:message.location()});
    });
    page.on('requestfailed', request => {
      const row = { url:request.url(), reason:request.failure()?.errorText };
      if (row.reason === 'net::ERR_ABORTED') cleanupAborts.push(row);
      else failed.push(row);
    });
    await page.goto(`${base}/avatar-preview`);
    await page.getByLabel('Search assets', {exact:true}).waitFor({timeout:20000});
    await expect(page.getByTestId('gallery-card').first()).toBeVisible();
    assert.equal(await page.locator('canvas').count(), 0, 'Gallery must not create WebGL canvases');
    const libraryResponse = await context.request.get(`${base}/__avatar_catalog/library.json`);
    assert.equal(libraryResponse.status(), 200);
    const manifest = await libraryResponse.json();
    const initialCards = await page.getByTestId('gallery-card').count();
    assert(initialCards > 20, 'Discover references, current models and unbuilt concepts');
    assert.equal(initialCards, manifest.assets.filter(asset => !asset.history).length);
    assert.equal(manifest.assets.filter(asset => asset.accepted).length, 0, 'Current catalog has no accepted pieces');
    await screenshot(page, `${name}-gallery`);
    // A POP can return to the same query before React commits the optimistic
    // inspector transition. The visible view must still follow browser history.
    await page.evaluate(() => {
      const reference = document.querySelector('[data-testid="gallery-card"][data-asset-id^="reference:"]');
      if (!reference) throw new Error('Expected a reference card for the rapid Back contract');
      reference.click();
      history.back();
    });
    await page.waitForTimeout(250);
    await expect.poll(() => new URL(page.url()).searchParams.has('asset')).toBe(false);
    await expect(page.getByLabel('Search assets', {exact:true})).toBeVisible();
    assert.equal(await page.getByTestId('asset-title').count(), 0, 'Rapid Back returns to the gallery view');
    const broken = await page.locator('[data-testid="gallery-card"] img').evaluateAll(images => images.filter(image => image.complete && !image.naturalWidth).map(image => image.src));
    assert.deepEqual(broken, []);
    await page.getByLabel('Character base', {exact:true}).selectOption('female');
    await page.getByLabel('Representation', {exact:true}).selectOption('2d');
    await expect.poll(() => page.getByTestId('gallery-card').count()).toBeGreaterThan(0);
    const female = manifest.assets.find(asset => !asset.history && asset.base === 'female' && !asset.model && asset.references.length);
    assert(female, 'Female reference-only asset must exist');
    await card(page, female.id).click();
    await expect(page.getByTestId('asset-title')).toHaveText(female.label);
    await expect(page.getByText(/3D pending/i).first()).toBeVisible();
    assert.equal(await page.locator('canvas').count(), 0);
    assert(await page.getByTestId('asset-reference').count() > 0);
    assert(await page.getByTestId('asset-source').count() > 0);
    await screenshot(page, `${name}-female-reference`);
    await page.getByRole('button', {name:'Back to gallery',exact:true}).click();
    assert.equal(await page.getByLabel('Character base', {exact:true}).inputValue(), 'female');
    assert.equal(await page.getByLabel('Representation', {exact:true}).inputValue(), '2d');
    await page.getByLabel('Character base', {exact:true}).selectOption('');
    await page.getByLabel('Representation', {exact:true}).selectOption('');
    await page.getByLabel('Status', {exact:true}).selectOption('pending');
    assert(await page.getByTestId('gallery-card').count() > 0);
    await page.getByLabel('Status', {exact:true}).selectOption('');
    await page.getByRole('checkbox', {name:'Include history',exact:true}).click();
    await expect(page.getByRole('checkbox', {name:'Include history',exact:true})).toBeChecked();
    await expect.poll(() => page.getByTestId('gallery-card').count()).toBeGreaterThan(initialCards);
    await page.getByRole('checkbox', {name:'Include history',exact:true}).click();
    await expect(page.getByRole('checkbox', {name:'Include history',exact:true})).not.toBeChecked();
    await page.getByLabel('Search assets', {exact:true}).fill('no-such-gallery-asset-zzzz');
    await expect(page.getByTestId('gallery-card')).toHaveCount(0);
    await page.getByLabel('Search assets', {exact:true}).fill('');
    const modelAsset = manifest.assets.find(asset => asset.id === 'T02' && asset.model);
    assert(modelAsset);
    await card(page, modelAsset.id).click();
    await page.getByTestId('catalog-ready').waitFor({timeout:90000});
    assert.equal(await page.locator('canvas').count(), 1);
    if (name === 'desktop') {
      const referenceBounds = await page.getByTestId('asset-reference').boundingBox();
      const modelBounds = await page.getByTestId('catalog-viewport').boundingBox();
      assert(referenceBounds && modelBounds && referenceBounds.x + referenceBounds.width <= modelBounds.x, 'Desktop reference and model are side-by-side');
    }
    await page.getByRole('button', {name:'Walk',exact:true}).click();
    await page.getByTestId('catalog-ready').waitFor({timeout:60000});
    await page.getByRole('button', {name:'Pause',exact:true}).click();
    if (name === 'desktop') {
      // Pause without scrubbing first: progress-based scrubbing would mask a
      // refresh that recreates the clip and resets its action to the first pose.
      await page.waitForTimeout(250);
      const pausedPixels = await page.getByTestId('catalog-viewport').screenshot();
      fs.mkdirSync(fixtureDir);
      createdFixture = true;
      fs.copyFileSync('assets/avatar/concepts/2026-10-04/catalog-a-female/01-character-turnaround.png', fixtureFile);
      const changed = await (await context.request.get(`${base}/__avatar_catalog/library.json`)).json();
      await page.waitForTimeout(7000);
      const refreshed = await (await context.request.get(`${base}/__avatar_catalog/library.json`)).json();
      assert.notEqual(refreshed.version, manifest.version, 'Unrelated fixture changes inventory revision');
      assert(changed.assets || refreshed.assets);
      assert(pausedPixels.equals(await page.getByTestId('catalog-viewport').screenshot()), 'Unrelated inventory refresh preserves paused pose');
      fs.unlinkSync(fixtureFile);
      fs.rmdirSync(fixtureDir);
      createdFixture = false;
      // Let the visible inspector consume the next five-second inventory poll
      // before returning to cards that would otherwise still reference this deleted fixture.
      await page.waitForTimeout(5500);
    }
    await page.getByTestId('catalog-pose').fill('0.45');
    await page.getByRole('button', {name:'back',exact:true}).click();
    const canvas = await page.locator('canvas').evaluate(canvas => ({width:canvas.width,height:canvas.height,bytes:canvas.toDataURL().length}));
    assert(canvas.width > 0 && canvas.height > 0 && canvas.bytes > 1000);
    await screenshot(page, `${name}-model-inspector`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'No horizontal overflow');
    for (const source of modelAsset.sources.slice(0, 3)) assert.equal((await context.request.head(`${base}${source.url}`)).status(), 200);
    assert.equal((await context.request.get(`${base}/__avatar_catalog/files/.env`)).status(), 404);
    await page.getByRole('button', {name:'Back to gallery',exact:true}).click();
    await expect(page.getByTestId('gallery-card').first()).toBeVisible();
    assert.equal(await page.locator('canvas').count(), 0);
    let live = false, recovery = false;
    if (name === 'desktop') {
      await page.getByLabel('Search assets', {exact:true}).fill(token);
      await expect(page.getByTestId('gallery-card')).toHaveCount(0);
      const baselineNavigations = navigations;
      fs.mkdirSync(fixtureDir);
      createdFixture = true;
      fs.copyFileSync('assets/avatar/concepts/2026-10-04/catalog-a-female/01-character-turnaround.png', fixtureFile);
      await expect.poll(() => page.getByTestId('gallery-card').count(), {timeout:20000}).toBeGreaterThan(0);
      assert.equal(navigations, baselineNavigations, 'Inventory refresh must not reload the page');
      // Discovery mounts the thumbnail asynchronously; finish that request before
      // deleting the test's file so deletion does not race its first image load.
      await expect.poll(() => page.getByTestId('gallery-card').locator('img').evaluateAll(images => images.length > 0 && images.every(image => image.complete && image.naturalWidth > 0))).toBe(true);
      fs.unlinkSync(fixtureFile);
      fs.rmdirSync(fixtureDir);
      createdFixture = false;
      await expect(page.getByTestId('gallery-card')).toHaveCount(0, {timeout:20000});
      live = true;
      await page.getByLabel('Search assets', {exact:true}).fill('');
      await expect.poll(() => page.getByTestId('gallery-card').count()).toBeGreaterThan(0);
      const goodCount = await page.getByTestId('gallery-card').count();
      faulting = true;
      await page.route('**/__avatar_catalog/library.json', route => route.fulfill({status:503,contentType:'application/json',body:'{}'}));
      await expect(page.getByTestId('gallery-live-status')).toContainText(/Inventory stale/i, {timeout:15000});
      await expect(page.getByRole('button', {name:'Retry',exact:true})).toBeVisible();
      assert.equal(await page.getByTestId('gallery-card').count(), goodCount, 'Failed refresh retains last good inventory');
      await page.unroute('**/__avatar_catalog/library.json');
      await page.getByRole('button', {name:/Retry/}).click();
      await expect(page.getByTestId('gallery-live-status')).toContainText(/live/i, {timeout:15000});
      faulting = false;
      recovery = true;
    }
    await page.goto(`${base}/avatar-preview?model=study-h01-reference-a`);
    await page.getByTestId('catalog-ready').waitFor({timeout:60000});
    assert.equal(await page.getByTestId('catalog-model').inputValue(), 'study-h01-reference-a');
    // Three's consumed stream can report a cleanup abort even after successful
    // GLB parsing. HEAD probes are also cancelled during unmount. Keep evidence
    // and reject cancellations of non-catalog transport rather than hiding them.
    assert.deepEqual(cleanupAborts.filter(row => !row.url.includes('/__avatar_catalog/')), []);
    assert.deepEqual(errors, []);
    assert.deepEqual(failed, []);
    results.push({name,scene:'avatar-asset-gallery',viewport,seed:null,initialCards,referenceOnly:true,modelReady:true,controls:true,legacyDeepLink:true,liveDiscovery:live,refreshRecovery:recovery,errors,failed,cleanupAborts,expectedFaults});
    await context.close();
  }
} finally {
  if (createdFixture) {
    if (fs.existsSync(fixtureFile)) fs.unlinkSync(fixtureFile);
    if (fs.existsSync(fixtureDir)) fs.rmdirSync(fixtureDir);
  }
  await browser.close();
  fs.writeFileSync(`${output}/report.json`, JSON.stringify({checkedAt:new Date().toISOString(),base,identity,results},null,2));
}
console.log(JSON.stringify({status:'passed',results},null,2));
