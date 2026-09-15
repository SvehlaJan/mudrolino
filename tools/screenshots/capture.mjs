import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { chromium } from 'playwright';
import { resolveChromiumExecutable } from '../../e2e/browserResolver.ts';
import { CANONICAL_VIEWPORTS } from '../../e2e/support/viewports.ts';

function parseArgs(args) {
  let base = 'http://127.0.0.1:4173';
  const scenes = [];
  const viewports = [];
  let output = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--base=')) {
      base = arg.slice('--base='.length);
    } else if (arg === '--base' && i + 1 < args.length) {
      base = args[++i];
    } else if (arg.startsWith('--scene=')) {
      scenes.push(arg.slice('--scene='.length));
    } else if (arg === '--scene' && i + 1 < args.length) {
      scenes.push(args[++i]);
    } else if (arg.startsWith('--viewport=')) {
      viewports.push(arg.slice('--viewport='.length));
    } else if (arg === '--viewport' && i + 1 < args.length) {
      viewports.push(args[++i]);
    } else if (arg.startsWith('--output=')) {
      output = arg.slice('--output='.length);
    } else if (arg === '--output' && i + 1 < args.length) {
      output = args[++i];
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  base = base.replace(/\/+$/, '');

  return { base, scenes, viewports, output };
}

const SCENES = {
  'parents-gate': async (page, baseUrl) => {
    await page.goto(`${baseUrl}/settings`);
    await page.getByRole('heading', { name: 'Pre rodičov' }).waitFor({ state: 'visible' });
    await page.getByRole('button', { name: '1', exact: true }).waitFor({ state: 'visible' });
  },
  'parents-gate-error': async (page, baseUrl) => {
    await page.goto(`${baseUrl}/settings`);
    await page.getByRole('heading', { name: 'Pre rodičov' }).waitFor({ state: 'visible' });
    let wrongDigits = ['9', '9'];
    const hasAdapter = await page.waitForFunction(
      () => typeof window.__E2E__?.parentGate?.answer === 'number',
      null,
      { timeout: 1000 },
    ).catch(() => false);
    if (hasAdapter) {
      const answer = await page.evaluate(() => window.__E2E__?.parentGate?.answer);
      const wrong = (answer + 1) % 10;
      wrongDigits = [String(wrong)];
    }
    for (const digit of wrongDigits) {
      await page.getByRole('button', { name: digit, exact: true }).click();
    }
    await page.getByRole('button', { name: 'Potvrdiť' }).click();
    await page.locator('.animate-shake').waitFor({ state: 'visible' });
  },
  'settings': async (page, baseUrl) => {
    await page.goto(`${baseUrl}/settings`);
    await page.getByRole('heading', { name: 'Pre rodičov' }).waitFor({ state: 'visible' });
    const hasAdapter = await page.waitForFunction(
      () => typeof window.__E2E__?.parentGate?.unlock === 'function',
      null,
      { timeout: 5000 },
    ).catch(() => false);
    if (!hasAdapter) {
      throw new Error('Protected quick-pass request failed: window.__E2E__.parentGate.unlock() is missing (non-test server)');
    }
    await page.evaluate(() => window.__E2E__.parentGate.unlock());
    await page.getByRole('heading', { name: 'Rodičovská zóna' }).waitFor({ state: 'visible' });
  },
  'content': async (page, baseUrl) => {
    await page.goto(`${baseUrl}/content`);
    await page.getByRole('heading', { name: 'Pre rodičov' }).waitFor({ state: 'visible' });
    const hasAdapter = await page.waitForFunction(
      () => typeof window.__E2E__?.parentGate?.unlock === 'function',
      null,
      { timeout: 5000 },
    ).catch(() => false);
    if (!hasAdapter) {
      throw new Error('Protected quick-pass request failed: window.__E2E__.parentGate.unlock() is missing (non-test server)');
    }
    await page.evaluate(() => window.__E2E__.parentGate.unlock());
    await page.getByRole('heading', { name: 'Vlastný obsah' }).waitFor({ state: 'visible' });
  },
};

async function main() {
  const { base, scenes: inputScenes, viewports: inputViewports, output: outputArg } = parseArgs(process.argv.slice(2));
  const baseOrigin = new URL(base).origin;

  const targetScenes = inputScenes.length > 0 ? inputScenes : Object.keys(SCENES);
  for (const scene of targetScenes) {
    if (!(scene in SCENES)) {
      throw new Error(`Unknown scene: "${scene}". Valid scenes are: ${Object.keys(SCENES).join(', ')}`);
    }
  }

  const targetViewports = inputViewports.length > 0 ? inputViewports : Object.keys(CANONICAL_VIEWPORTS);
  for (const viewport of targetViewports) {
    if (!(viewport in CANONICAL_VIEWPORTS)) {
      throw new Error(`Unknown viewport: "${viewport}". Valid viewports are: ${Object.keys(CANONICAL_VIEWPORTS).join(', ')}`);
    }
  }

  let outputDir;
  if (outputArg) {
    outputDir = path.resolve(process.cwd(), outputArg);
    if (fs.existsSync(outputDir)) {
      throw new Error(`Output collision: directory already exists at ${outputDir}`);
    }
  } else {
    let gitSha;
    try {
      gitSha = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
    } catch (err) {
      throw new Error(`Failed to resolve git SHA: ${err.message}`);
    }
    const now = new Date();
    const pad = (n, w = 2) => String(n).padStart(w, '0');
    const utcRunId = `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())}T${pad(now.getUTCHours())}-${pad(now.getUTCMinutes())}-${pad(now.getUTCSeconds())}-${pad(now.getUTCMilliseconds(), 3)}Z-${process.pid}`;
    outputDir = path.resolve(process.cwd(), 'artifacts', 'ui', gitSha, utcRunId);
    if (fs.existsSync(outputDir)) {
      throw new Error(`Output collision: directory already exists at ${outputDir}`);
    }
  }
  fs.mkdirSync(outputDir, { recursive: true });

  const executablePath = resolveChromiumExecutable();
  const browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
  });

  try {
    for (const viewportName of targetViewports) {
      const viewport = CANONICAL_VIEWPORTS[viewportName];
      const context = await browser.newContext({
        viewport,
        reducedMotion: 'reduce',
      });

      try {
        for (const sceneName of targetScenes) {
          const page = await context.newPage();
          const errors = [];
          const failedRequests = [];

          page.on('console', (msg) => {
            if (msg.type() === 'error') {
              errors.push(msg.text());
            }
          });
          page.on('pageerror', (err) => {
            errors.push(err.message);
          });
          page.on('requestfailed', (req) => {
            const failure = req.failure();
            if (failure?.errorText === 'net::ERR_ABORTED') return;
            try {
              const reqOrigin = new URL(req.url()).origin;
              if (reqOrigin === baseOrigin) {
                failedRequests.push(`${req.method()} ${req.url()} — ${failure?.errorText ?? 'unknown error'}`);
              }
            } catch {
              // Ignore malformed URLs
            }
          });
          page.on('response', (res) => {
            try {
              const resOrigin = new URL(res.url()).origin;
              if (resOrigin === baseOrigin && res.status() >= 400) {
                failedRequests.push(`${res.request().method()} ${res.url()} — HTTP ${res.status()}`);
              }
            } catch {
              // Ignore malformed URLs
            }
          });

          try {
            await SCENES[sceneName](page, base);

            // Font readiness and the two animation frames are part of the
            // captured state; failures during either phase must be reported.
            await page.evaluate(() => document.fonts.ready);
            await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));

            const sceneDir = path.join(outputDir, sceneName);
            fs.mkdirSync(sceneDir, { recursive: true });
            const filePath = path.join(sceneDir, `${viewportName}.png`);
            await page.screenshot({ path: filePath });

            if (errors.length > 0) {
              throw new Error(`Console errors in scene "${sceneName}" [${viewportName}]:\n${errors.join('\n')}`);
            }
            if (failedRequests.length > 0) {
              throw new Error(`Failed same-origin requests in scene "${sceneName}" [${viewportName}]:\n${failedRequests.join('\n')}`);
            }
          } finally {
            await page.close();
          }
        }
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }

  console.log(outputDir);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
