import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { chromium } from 'playwright';
import { parseArgs } from 'node:util';
import { resolveChromiumExecutable } from '../../e2e/browserResolver.ts';
import { analyzeBearGlbQuality } from './audit_bear_animation_quality.mjs';

const { values } = parseArgs({
  options: {
    base: { type: 'string', default: 'http://127.0.0.1:3003' },
    model: { type: 'string', default: 'assets/avatar/catalog-a/companions/bear-v2/revisions/celebration-v9/web-v1/model.glb' },
    'output-dir': { type: 'string', default: 'artifacts/verification/bear-companion/contact-sheets' },
    clips: { type: 'string', default: 'all' },
    views: { type: 'string', default: 'three-quarter' },
  },
});

const preview = new URL(values.base);
if (preview.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(preview.hostname)) {
  throw new Error('Preview origin must be loopback HTTP');
}
const baseOrigin = preview.origin;
const bytes = fs.readFileSync(values.model);
const quality = analyzeBearGlbQuality(bytes);
const requestedClips =
  values.clips === 'all'
    ? quality.clips.map((c) => c.name)
    : values.clips.split(',').map((s) => s.trim()).filter(Boolean);
const views = values.views.split(',').map((s) => s.trim()).filter(Boolean);
const poses = [0, 0.16, 0.33, 0.5, 0.66, 0.83];

fs.mkdirSync(values['output-dir'], { recursive: true });

const browser = await chromium.launch({
  executablePath: resolveChromiumExecutable(),
  headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--mute-audio'],
});

const rows = [];
try {
  const page = await browser.newPage({ viewport: { width: 440, height: 500 } });
  await page.route('**/__avatar_fixture/bear-v1.glb', async (route) => {
    const method = route.request().method();
    await route.fulfill({
      status: 200,
      contentType: 'model/gltf-binary',
      headers: { 'content-length': String(bytes.length) },
      body: method === 'HEAD' ? undefined : bytes,
    });
  });

  for (const clipName of requestedClips) {
    for (const view of views) {
      const tileBuffers = [];
      const tileSize = 180;
      const tileHeight = 200;

      for (const pose of poses) {
        const url = `${baseOrigin}/avatar-preview?agent=1&companion=bear&clip=${encodeURIComponent(clipName)}&pose=${pose}&view=${view}`;
        await page.goto(url);
        await page.waitForLoadState('networkidle', { timeout: 60000 });
        await page.waitForFunction(
          ({ clipName, pose, view }) => {
            try {
              const state = JSON.parse(document.querySelector('[data-testid="avatar-debug-json"]')?.textContent ?? '');
              const canvas = document.querySelector('canvas');
              return (
                state.ready &&
                state.animations.includes(clipName) &&
                Math.abs(state.progress - pose) < 1e-4 &&
                state.view === view &&
                canvas &&
                canvas.clientWidth > 0
              );
            } catch {
              return false;
            }
          },
          { clipName, pose, view },
          { timeout: 60000 },
        );
        await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
        const shot = await page.locator('canvas').screenshot();
        const resized = await sharp(shot)
          .resize({ width: tileSize, height: tileHeight, fit: 'contain', background: { r: 247, g: 247, b: 242, alpha: 1 } })
          .png()
          .toBuffer();
        tileBuffers.push(resized);
      }

      const stripWidth = tileSize * poses.length;
      const stripBuffer = await sharp({
        create: {
          width: stripWidth,
          height: tileHeight,
          channels: 4,
          background: { r: 247, g: 247, b: 242, alpha: 1 },
        },
      })
        .composite(tileBuffers.map((input, idx) => ({ input, left: idx * tileSize, top: 0 })))
        .png()
        .toBuffer();

      const fullName = `${clipName}-${view}-strip.png`;
      const reviewName = `${clipName}-${view}-strip-320.png`;
      await sharp(stripBuffer).toFile(path.join(values['output-dir'], fullName));
      await sharp(stripBuffer).resize({ width: 320 }).toFile(path.join(values['output-dir'], reviewName));

      const metrics = quality.clips.find((c) => c.name === clipName);
      rows.push({ clipName, view, fullName, reviewName, metrics });
    }
  }
} finally {
  await browser.close();
}

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Bear Animation Contact Sheets</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 24px; background: #f8fafc; color: #0f172a; }
  .card { background: #fff; border-radius: 14px; padding: 16px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
  .meta { font-size: 13px; color: #475569; margin: 4px 0 10px; }
  .warn { color: #b45309; font-weight: 700; }
  .ok { color: #15803d; font-weight: 700; }
  img { width: 100%; max-width: 1080px; border-radius: 10px; display: block; }
</style>
</head>
<body>
<h1>Bear Animation Contact Sheets (${rows.length} views)</h1>
<p>Model: <code>${values.model}</code> | Raw: ${(quality.glbBytes / 1024).toFixed(1)} KB | Gzip: ${(quality.gzipBytes / 1024).toFixed(1)} KB | Clips: ${quality.clipCount} | Warnings: ${quality.warningCount}</p>
${rows
  .map((r) => {
    const m = r.metrics;
    const warnHtml = m?.warnings?.length
      ? `<span class="warn">Warnings: ${m.warnings.join(', ')}</span>`
      : `<span class="ok">Clean</span>`;
    return `<div class="card">
      <strong>${r.clipName}</strong> (${r.view}) — ${m?.durationSeconds ?? '?'}s | Bones: ${m?.movingBoneCount ?? '?'} | Legs: ${m?.hasLegMotion ? 'yes' : 'no'} | MaxVel: ${m?.maxAngularVelocityDegPerSec ?? '?'}°/s | Jerk: ${m?.maxAngularAccelDegPerSec2 ?? '?'}°/s² | LoopSeam: ${m?.loopVelocityMismatchDegPerSec ?? '?'}°/s | ${warnHtml}
      <div class="meta">Poses: ${poses.join(', ')}</div>
      <img src="${r.fullName}" alt="${r.clipName} ${r.view}" />
    </div>`;
  })
  .join('\n')}
</body>
</html>
`;
fs.writeFileSync(path.join(values['output-dir'], 'index.html'), html);
fs.writeFileSync(path.join(values['output-dir'], 'quality.json'), `${JSON.stringify(quality, null, 2)}\n`);
console.log(JSON.stringify({ rendered: rows.length, outputDir: values['output-dir'], warningCount: quality.warningCount }));
