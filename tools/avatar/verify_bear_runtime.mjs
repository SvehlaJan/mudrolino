import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';
import { chromium } from 'playwright';
import { resolveChromiumExecutable } from '../../e2e/browserResolver.ts';
const argument = (name, fallback) => process.argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const preview = new URL(argument('base', 'http://127.0.0.1:3003'));
if (preview.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(preview.hostname)
  || preview.pathname !== '/' || preview.search || preview.hash || preview.username || preview.password) {
  throw new Error('Bear preview must be a loopback HTTP origin');
}
const base = preview.origin;
const directory = argument('output-dir', 'artifacts/verification/bear-companion/browser');
const modelPath = argument('model', 'assets/avatar/catalog-a/companions/bear-v1/outfit-lod.glb');
const companionsPrefix = 'assets/avatar/catalog-a/companions/';
// Keep the fixed fixture URL while choosing only registered local companion
// bytes. Reject traversal before normalization, then also contain symlinks.
if (!modelPath.startsWith(companionsPrefix) || /\\/u.test(modelPath)
  || modelPath.split('/').some(part => !part || part === '.' || part === '..')
  || path.extname(modelPath) !== '.glb') {
  throw new Error('Bear model must be a repository-local companions .glb path without traversal');
}
const companionsRoot = fs.realpathSync(companionsPrefix);
const modelRealPath = fs.realpathSync(modelPath);
const relativeModelPath = path.relative(companionsRoot, modelRealPath);
if (!relativeModelPath || relativeModelPath.startsWith(`..${path.sep}`)
  || relativeModelPath === '..' || path.isAbsolute(relativeModelPath)) {
  throw new Error('Bear model must resolve inside the repository companions directory');
}
const bytes = fs.readFileSync(modelPath);
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const expected = JSON.parse(fs.readFileSync('assets/avatar/asset-manifest.json')).files[modelPath];
if (!expected || hash(bytes) !== expected.sha256 || bytes.length !== expected.size) throw new Error('Bear bytes do not match asset-manifest; restore the companion prefix or register intentional new bytes');
fs.mkdirSync(directory, { recursive: true });
const browser = await chromium.launch({ executablePath: resolveChromiumExecutable(), headless: true, args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'] });
const context = { commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), build: 'guarded Vite development source', seed: 'fixed GLB and deterministic clip poses', browser: browser.version(), startedAt: new Date().toISOString(), sourceHashes: Object.fromEntries(['src/avatar/AvatarScene.tsx', 'src/avatar/AvatarModel.tsx', 'src/avatar/AvatarRuntimeFixture.tsx', 'src/avatar/AvatarPresenter.tsx'].map(file => [file, hash(fs.readFileSync(file))])) };
const results = [];
try {
  for (const [size, width, height] of [['desktop',1280,900], ['phone',390,844], ['short',667,375]]) {
    const page = await browser.newPage({ viewport: { width, height } });
    const errors = [], failed = [], gets = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('requestfinished', request => { if (request.method() === 'GET' && new URL(request.url()).pathname === '/__avatar_fixture/bear-v1.glb') gets.push(expected.sha256); });
    page.on('requestfailed', request => failed.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText}`));
    page.on('response', response => { if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`); });
    await page.route('**/__avatar_fixture/bear-v1.glb', async route => {
      const method = route.request().method();
      if (method !== 'GET' && method !== 'HEAD') throw new Error(`Unexpected model method ${method}`);
      await route.fulfill({ status: 200, contentType: 'model/gltf-binary', headers: { 'content-length': String(bytes.length) }, body: method === 'HEAD' ? undefined : bytes });
    });
    const poses = [0,.25,.5,.75,1];
    for (const view of size === 'desktop' ? ['front','three-quarter','side','back'] : ['front']) {
      for (const pose of poses) {
        const url = `${base}/avatar-preview?agent=1&companion=bear&pose=${pose}&view=${view}`;
        await page.goto(url);
        // The fixture can become ready while the app's other lazy modules are
        // still fetching; settle those requests before the next pose navigation.
        await page.waitForLoadState('networkidle', { timeout: 60000 });
        await page.waitForFunction(({ pose, view }) => {
          try {
            const state = JSON.parse(document.querySelector('[data-testid="avatar-debug-json"]')?.textContent ?? '');
            const canvas = document.querySelector('canvas');
            const hasSize = Boolean(canvas && canvas.clientWidth > 0 && canvas.clientHeight > 0 && !(canvas.width === 300 && canvas.height === 150));
            return state.ready && state.animations.includes('celebrate') && state.progress === pose && state.view === view && hasSize;
          } catch { return false; }
        }, { pose, view }, { timeout: 60000 });
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const canvas = page.locator('canvas');
        const screenshot = await canvas.screenshot();
        const { data, info } = await sharp(screenshot).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        const bounds = { left: info.width, top: info.height, right: 0, bottom: 0, pixels: 0 };
        for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
          const i = (y * info.width + x) * 4;
          const channels = [data[i], data[i + 1], data[i + 2]];
          // Rounded fixture corners expose its neutral app background. Select
          // the colored/dark character, excluding white/neutral compositor pixels.
          if (data[i + 3] < 20 || (Math.max(...channels) - Math.min(...channels) < 20 && Math.min(...channels) > 120)) continue;
          bounds.left = Math.min(bounds.left, x); bounds.right = Math.max(bounds.right, x); bounds.top = Math.min(bounds.top, y); bounds.bottom = Math.max(bounds.bottom, y); bounds.pixels++;
        }
        const label = `${size}-${view}-${pose}`;
        await sharp(screenshot).resize({ width: Math.min(320, info.width) }).toFile(path.join(directory, `${label}-review.png`));
        results.push({ label, url, viewport: { width, height }, pose, view, render_sha256: hash(screenshot), canvas: { width: info.width, height: info.height }, bounds, source_sha256: expected.sha256, errors: [...errors], failed: [...failed], completed_gets: [...gets], framed: bounds.pixels > 100 && bounds.left > 2 && bounds.top > 2 && bounds.right < info.width - 3 && bounds.bottom < info.height - 3 });
      }
    }
    await page.close();
  }
} finally {
  await browser.close();
  const moving = ['desktop','phone','short'].every(size => new Set(results.filter(row => row.label.startsWith(`${size}-front-`)).map(row => row.render_sha256)).size >= 3);
  const passed = results.length === 30 && moving && results.every(row => row.framed && !row.errors.length && !row.failed.length && row.completed_gets.length);
  fs.writeFileSync(path.join(directory, 'browser-report.json'), JSON.stringify({ status: passed ? 'passed' : 'failed', context, profile: 'actual-renderer-fixed-candidate', glb: modelPath, glb_sha256: expected.sha256, verifier_sha256: hash(fs.readFileSync(new URL(import.meta.url))), moving, results }, null, 2) + '\n');
  console.log(JSON.stringify({ status: passed ? 'passed' : 'failed', captures: results.length, moving, unframed: results.filter(row => !row.framed).map(row => row.label) }));
  if (!passed) process.exitCode = 1;
}
