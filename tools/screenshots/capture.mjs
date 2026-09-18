import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { chromium } from 'playwright';
import { resolveChromiumExecutable } from '../../e2e/browserResolver.ts';
import { CANONICAL_VIEWPORTS } from '../../e2e/support/viewports.ts';

export function parseArgs(args) {
  let base = 'http://127.0.0.1:4173';
  const scenes = [];
  const viewports = [];
  let output = null;
  let help = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      help = true;
    } else if (arg.startsWith('--base=')) {
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

  return { base, scenes, viewports, output, help };
}

export function printHelp() {
  console.log(`Usage: npm run shots -- [--base=<url>] [--scene=<id>] [--viewport=<name>] [--output=<dir>] [--help]

Repeat --scene/--viewport to capture more than one; omitting either captures all of them.

Scenes:    ${Object.keys(SCENES).join(', ')}
Viewports: ${Object.keys(CANONICAL_VIEWPORTS).join(', ')}`);
}

export const SCENES = {
  'ui-kit': async (page, baseUrl) => {
    await page.goto(`${baseUrl}/ui-kit`);
    await page.getByRole('heading', { name: 'UI Kit', level: 1 }).waitFor({ state: 'visible' });
  },
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
  'home': async (page, baseUrl) => {
    await page.goto(`${baseUrl}/`);
    await page.getByRole('heading', { name: 'Písmená a slová' }).waitFor({ state: 'visible' });
    await page.getByRole('heading', { name: 'Čísla a počítanie' }).waitFor({ state: 'visible' });
  },
  'lobby-alphabet': async (page, baseUrl) => {
    await page.goto(`${baseUrl}/alphabet`);
    await page.getByRole('button', { name: 'Hrať' }).waitFor({ state: 'visible' });
  },
  'lobby-syllables': async (page, baseUrl) => {
    await page.goto(`${baseUrl}/syllables`);
    await page.getByRole('button', { name: 'Hrať' }).waitFor({ state: 'visible' });
  },
  'lobby-numbers': async (page, baseUrl) => {
    await page.goto(`${baseUrl}/numbers`);
    await page.getByRole('button', { name: 'Hrať' }).waitFor({ state: 'visible' });
  },
  'lobby-counting': async (page, baseUrl) => {
    await page.goto(`${baseUrl}/counting`);
    await page.getByRole('button', { name: 'Hrať' }).waitFor({ state: 'visible' });
  },
  'lobby-compare': async (page, baseUrl) => {
    await page.goto(`${baseUrl}/compare`);
    await page.getByRole('button', { name: 'Hrať' }).waitFor({ state: 'visible' });
  },
  'lobby-addition': async (page, baseUrl) => {
    await page.goto(`${baseUrl}/addition`);
    await page.getByRole('button', { name: 'Hrať' }).waitFor({ state: 'visible' });
  },
  'lobby-words': async (page, baseUrl) => {
    await page.goto(`${baseUrl}/words`);
    await page.getByRole('button', { name: 'Hrať' }).waitFor({ state: 'visible' });
  },
  'lobby-first-letter': async (page, baseUrl) => {
    await page.goto(`${baseUrl}/first-letter`);
    await page.getByRole('button', { name: 'Hrať' }).waitFor({ state: 'visible' });
  },
  'lobby-assembly': async (page, baseUrl) => {
    await page.goto(`${baseUrl}/assembly`);
    await page.getByRole('button', { name: 'Hrať' }).waitFor({ state: 'visible' });
  },
  'lobby-complete-syllable': async (page, baseUrl) => {
    await page.goto(`${baseUrl}/complete-syllable`);
    await page.getByRole('button', { name: 'Hrať' }).waitFor({ state: 'visible' });
  },
  'lobby-complete-letter': async (page, baseUrl) => {
    await page.goto(`${baseUrl}/complete-letter`);
    await page.getByRole('button', { name: 'Hrať' }).waitFor({ state: 'visible' });
  },
  'game-shell-success': async (page, baseUrl) => {
    await page.goto(`${baseUrl}/ui-kit?example=game-shell&state=success`);
    await page.getByRole('button', { name: 'Pokračovať' }).waitFor({ state: 'visible' });
    // `waitFor({ state: 'visible' })` resolves the instant the overlay's opacity leaves 0,
    // not once its enter transition finishes — settle past motionPreset.transition (180ms)
    // so the capture isn't a mid-fade frame.
    await page.waitForTimeout(250);
  },
  'game-shell-failure': async (page, baseUrl) => {
    await page.goto(`${baseUrl}/ui-kit?example=game-shell&state=failure`);
    await page.getByRole('button', { name: 'Pokračovať' }).waitFor({ state: 'visible' });
    await page.waitForTimeout(250);
  },
  'game-shell-completion': async (page, baseUrl) => {
    await page.goto(`${baseUrl}/ui-kit?example=game-shell&state=completion`);
    await page.getByRole('button', { name: 'Hrať znova' }).waitFor({ state: 'visible' });
    await page.waitForTimeout(250);
  },
  'game-shell-paused': async (page, baseUrl) => {
    await page.goto(`${baseUrl}/ui-kit?example=game-shell&state=paused`);
    await page.getByRole('heading', { level: 1 }).waitFor({ state: 'visible' });
  },
  'game-words-visual': async (page, baseUrl) => {
    await page.goto(`${baseUrl}/words`);
    await page.getByRole('button', { name: 'Hrať' }).click();
    await page.locator('main h2').waitFor({ state: 'visible' });
  },
};

// Aliases for convenient shorthand targeting (e.g. --scene=alphabet)
const LOBBY_SLUGS = [
  'alphabet',
  'syllables',
  'numbers',
  'counting',
  'compare',
  'addition',
  'words',
  'first-letter',
  'assembly',
  'complete-syllable',
  'complete-letter',
];
for (const slug of LOBBY_SLUGS) {
  SCENES[slug] = SCENES[`lobby-${slug}`];
}

async function main() {
  const { base, scenes: inputScenes, viewports: inputViewports, output: outputArg, help } = parseArgs(process.argv.slice(2));
  if (help) {
    printHelp();
    return;
  }
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

const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
