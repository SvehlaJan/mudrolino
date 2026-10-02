import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { buildIdentity } from '../verification/identity.mjs';
import { resolveChromiumExecutable } from '../../e2e/browserResolver.ts';
import { CANONICAL_VIEWPORTS } from '../../e2e/support/viewports.ts';
import { RELEASE_VIEWPORTS } from '../../e2e/support/releaseMatrix.ts';

const recorderInitPath = fileURLToPath(new URL('./fakeRecorderInit.js', import.meta.url));

async function installCaptureRecorder(page) {
  await page.addInitScript({ path: recorderInitPath });
}

export function parseArgs(args) {
  let base = 'http://127.0.0.1:4173';
  const scenes = [];
  const viewports = [];
  let output = null;
  let matrix = null;
  let help = false;
  let seed = 20261002;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      help = true;
    } else if (arg.startsWith('--seed=')) {
      seed = Number(arg.slice('--seed='.length));
    } else if (arg === '--seed' && i + 1 < args.length) {
      seed = Number(args[++i]);
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
    } else if (arg.startsWith('--matrix=')) {
      matrix = arg.slice('--matrix='.length);
    } else if (arg === '--matrix' && i + 1 < args.length) {
      matrix = args[++i];
    } else if (arg.startsWith('--output=')) {
      output = arg.slice('--output='.length);
    } else if (arg === '--output' && i + 1 < args.length) {
      output = args[++i];
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  base = base.replace(/\/+$/, '');

  if (matrix !== null && matrix !== 'release') {
    throw new Error(`Unknown screenshot matrix: "${matrix}". Valid matrices are: release`);
  }

  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error('Seed must be an unsigned 32-bit integer');
  return { base, scenes, viewports, output, matrix, help, seed };
}

export function printHelp() {
  console.log(`Usage: npm run shots -- [--base=<url>] [--matrix=release] [--scene=<id>] [--viewport=<name>] [--output=<dir>] [--seed=<integer>] [--help]

Repeat --scene/--viewport to capture more than one. --matrix=release selects the shipping scene set and release viewports; explicit scenes or viewports narrow that set. Omitting selectors captures all scenes and canonical viewports. By default, captures go to artifacts/ui/<UTC-date-time>-<pid>-<short-git-sha>/.

Scenes:    ${Object.keys(SCENES).join(', ')}
Viewports: ${Object.keys(CANONICAL_VIEWPORTS).join(', ')}`);
}

export function formatRunDirectoryName(date, gitSha, pid) {
  const pad = (value, width = 2) => String(value).padStart(width, '0');
  const timestamp = `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}T${pad(date.getUTCHours())}-${pad(date.getUTCMinutes())}-${pad(date.getUTCSeconds())}-${pad(date.getUTCMilliseconds(), 3)}Z`;
  return `${timestamp}-${pid}-${gitSha.slice(0, 7)}`;
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
    // Release captures use reduced motion, so the error message is the stable
    // signal; the shake class is deliberately absent in this context.
    await page.getByRole('alert').waitFor({ state: 'visible' });
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
  'recordings': async (page, baseUrl) => {
    // /recordings remains a supported legacy entry point, but the product intentionally redirects
    // it to the consolidated custom-content screen after the parent gate opens.
    await page.goto(`${baseUrl}/recordings`);
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
  'game-settings': async (page, baseUrl) => {
    await page.goto(`${baseUrl}/settings/games`);
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
    await page.getByRole('heading', { name: 'Nastavenia hier' }).waitFor({ state: 'visible' });
    await page.getByRole('navigation', { name: 'Nastavenia hier' }).waitFor({ state: 'visible' });
  },
  'app-settings': async (page, baseUrl) => {
    await page.goto(`${baseUrl}/settings/app`);
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
    await page.getByText('Aplikácia a vzhľad', { exact: true }).waitFor({ state: 'visible' });
  },
  'parent-feedback': async (page, baseUrl) => {
    await page.goto(`${baseUrl}/settings/help`);
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
    await page.getByRole('heading', { level: 1, name: 'Pomoc a spätná väzba' }).waitFor({ state: 'visible' });
    await page.getByRole('form', { name: 'Spätná väzba' }).waitFor({ state: 'visible' });
    await page.getByRole('radio', { name: /Chyba v hre/ }).click();
    await page.getByRole('textbox', { name: /Vaša správa/ }).fill('Hra sa zasekne po výbere odpovede.');
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
  'game-shell-retry': async (page, baseUrl) => {
    await page.goto(`${baseUrl}/ui-kit?example=game-shell&state=retry`);
    await page.getByRole('status').waitFor({ state: 'visible' });
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

// The dashboard has historically been called "settings" in this runner. Keep that name for
// scripts that already use it while giving the release matrix an explicit shipping-scene name.
SCENES.dashboard = SCENES.settings;

// Task 7: round/retry/success/failure(-or-reset)/completion scenes for the four bespoke
// literacy games. Lobby scenes already exist via the LOBBY_SLUGS aliasing below; protected
// routes keep using the Phase 1 gate adapter above — these four games interact only through the
// real Hrať control and the answer/tile controls it reveals, reading window.__E2E__ (the Phase
// 3-6 oracle hook, active in this test-mode build) to find the correct/wrong id rather than
// guessing from rendered content.
async function readGameE2E(page) {
  return page.evaluate(() => window.__E2E__);
}

async function waitForGamePhaseScene(page, phase) {
  await page.waitForFunction((p) => window.__E2E__?.gamePhase === p, phase);
}

/** Every interactive control on a playing surface: AnswerGroup's choice buttons and Assembly's
 * felt tray tiles. */
const PLAY_SURFACE_CONTROLS =
  '[data-testid="game-answer-region"] button, [data-testid="play-tray"] [data-tile-id]';

/**
 * Waits until two consecutive readings of every play-surface control's box agree.
 *
 * `AnswerGroup` derives its column count and its explicit pixel `--tile-size` inside a
 * ResizeObserver callback, so tile boxes can still move a frame or two after first paint and
 * again after every round change. Only the `round` scenes waited for anything at all before
 * clicking; the rest clicked as soon as `window.__E2E__.gamePhase` allowed it, which is the most
 * likely cause of the non-deterministic failures the Task 8 capture run hit — one of them was a
 * click actionability timeout with a sibling tile intercepting the pointer, exactly what an
 * unsettled grid produces. Mirrors the `expect.poll` settle wait in `e2e/bespoke-literacy.spec.ts`.
 */
async function waitForPlaySurfaceSettled(page) {
  await page.locator(PLAY_SURFACE_CONTROLS).first().waitFor({ state: 'visible' });
  await page.waitForFunction(
    (selector) => {
      const current = Array.from(document.querySelectorAll(selector))
        .map((el) => {
          const rect = el.getBoundingClientRect();
          return `${Math.round(rect.x)},${Math.round(rect.y)},${Math.round(rect.width)},${Math.round(rect.height)}`;
        })
        .join('|');
      const previous = window.__shotPlaySurface;
      window.__shotPlaySurface = current;
      return current !== '' && current === previous;
    },
    PLAY_SURFACE_CONTROLS,
    { polling: 100, timeout: 15000 },
  );
}

/**
 * Builds the round/retry/success/failure/completion scene set shared by the three single-tap
 * choice games (first-letter, complete-letter, complete-syllable) — each publishes the same
 * `correctItemId`/`answerItemIds` shape and answers through one `data-answer-id` tap.
 */
function bespokeChoiceScenes(path) {
  async function enterPlay(page, baseUrl) {
    await page.goto(`${baseUrl}${path}`);
    await page.getByRole('button', { name: 'Hrať' }).click();
  }
  async function pressAnswer(page, id) {
    await waitForPlaySurfaceSettled(page);
    await page.locator(`[data-answer-id="${id}"]`).click();
  }

  return {
    round: async (page, baseUrl) => {
      await enterPlay(page, baseUrl);
      await waitForPlaySurfaceSettled(page);
    },
    retry: async (page, baseUrl) => {
      await enterPlay(page, baseUrl);
      const state = await readGameE2E(page);
      const wrongId = state.answerItemIds.find((id) => id !== state.correctItemId);
      await pressAnswer(page, wrongId);
      await waitForGamePhaseScene(page, 'answered-incorrectly');
      await page.getByRole('status').waitFor({ state: 'visible' });
      await page.waitForTimeout(250);
    },
    success: async (page, baseUrl) => {
      await enterPlay(page, baseUrl);
      const state = await readGameE2E(page);
      await pressAnswer(page, state.correctItemId);
      await waitForGamePhaseScene(page, 'answered-correctly');
      await page.getByRole('status').waitFor({ state: 'visible' });
      await page.waitForTimeout(250);
    },
    failure: async (page, baseUrl) => {
      await enterPlay(page, baseUrl);
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const state = await readGameE2E(page);
        const wrongId = state.answerItemIds.find((id) => id !== state.correctItemId);
        await pressAnswer(page, wrongId);
        if (attempt < 2) await waitForGamePhaseScene(page, 'awaiting-answer');
      }
      await waitForGamePhaseScene(page, 'answered-incorrectly');
      await page.getByRole('button', { name: 'Pokračovať' }).waitFor({ state: 'visible' });
      await page.waitForTimeout(250);
    },
    completion: async (page, baseUrl) => {
      await enterPlay(page, baseUrl);
      for (let round = 0; round < 5; round += 1) {
        const state = await readGameE2E(page);
        await pressAnswer(page, state.correctItemId);
        await waitForGamePhaseScene(page, 'answered-correctly');
        if (round < 4) {
          await page.getByRole('button', { name: 'Pokračovať' }).click();
          await waitForGamePhaseScene(page, 'ready');
        }
      }
      await waitForGamePhaseScene(page, 'session-complete');
      await page.getByRole('button', { name: 'Hrať znova' }).waitFor({ state: 'visible' });
      await page.waitForTimeout(250);
    },
  };
}

for (const [prefix, path] of [
  ['first-letter', '/first-letter'],
  ['complete-letter', '/complete-letter'],
  ['complete-syllable', '/complete-syllable'],
]) {
  const scenes = bespokeChoiceScenes(path);
  SCENES[`${prefix}-round`] = scenes.round;
  SCENES[`${prefix}-retry`] = scenes.retry;
  SCENES[`${prefix}-success`] = scenes.success;
  SCENES[`${prefix}-failure`] = scenes.failure;
  SCENES[`${prefix}-completion`] = scenes.completion;
}

/**
 * Assembly has no single-tap answer and no failure state (no max attempts) — a wrong outcome
 * only exists at a wrong FULL rail, which then auto-resets the tray. 'assembly-reset' stands in
 * for the failure scene the other three games have, capturing the tray just after that automatic
 * reset instead of a terminal failure overlay that this game never shows.
 */
const assemblyScenes = (() => {
  async function enterPlay(page, baseUrl) {
    await page.goto(`${baseUrl}/assembly`);
    await page.getByRole('button', { name: 'Hrať' }).click();
  }
  async function placeWrongFullRail(page) {
    const state = await readGameE2E(page);
    const order = state.correctTileOrder;
    // A rotation is wrong for the distinct-label ordinary fixture regardless of tile count.
    // Duplicate-label stress captures use only the placed state, never this retry helper.
    const wrongOrder = [...order.slice(1), order[0]];
    await placeRail(page, wrongOrder, 'answered-incorrectly');
  }
  async function placeCorrectFullRail(page) {
    const state = await readGameE2E(page);
    await placeRail(page, state.correctTileOrder, 'answered-correctly');
  }
  /** Every placement re-lays out both the tray and the rail, so the surface has to be re-settled
   * before each tap, not just before the first one. */
  async function placeRail(page, order, finalPhase) {
    const tray = page.getByTestId('play-tray');
    for (const tileId of order.slice(0, -1)) {
      await waitForPlaySurfaceSettled(page);
      await tray.locator(`[data-tile-id="${tileId}"]`).click();
      await waitForGamePhaseScene(page, 'awaiting-answer');
    }
    await waitForPlaySurfaceSettled(page);
    await tray.locator(`[data-tile-id="${order[order.length - 1]}"]`).click();
    await waitForGamePhaseScene(page, finalPhase);
  }

  return {
    round: async (page, baseUrl) => {
      await enterPlay(page, baseUrl);
      await waitForPlaySurfaceSettled(page);
    },
    placed: async (page, baseUrl) => {
      await stubSpeechSynthesis(page);
      await enterPlay(page, baseUrl);
      await waitForGamePhaseScene(page, 'awaiting-answer');
      await waitForPlaySurfaceSettled(page);
      const { correctTileOrder } = await readGameE2E(page);
      const tileId = correctTileOrder[0];
      await page.getByTestId('play-tray').locator(`[data-tile-id="${tileId}"]`).click();
      await page.waitForFunction((id) => window.__E2E__?.placedTileIds?.includes(id), tileId);
      await waitForGamePhaseScene(page, 'awaiting-answer');
      // Wait past the tile-flight clone before reviewing the empty source and filled word cell.
      await page.waitForTimeout(700);
      await waitForPlaySurfaceSettled(page);
    },
    retry: async (page, baseUrl) => {
      await enterPlay(page, baseUrl);
      await placeWrongFullRail(page);
      await page.getByRole('status').waitFor({ state: 'visible' });
      await page.waitForTimeout(250);
    },
    success: async (page, baseUrl) => {
      await enterPlay(page, baseUrl);
      await placeCorrectFullRail(page);
      await page.getByRole('status').waitFor({ state: 'visible' });
      await page.waitForTimeout(250);
    },
    reset: async (page, baseUrl) => {
      await enterPlay(page, baseUrl);
      await placeWrongFullRail(page);
      // The wrong-full-rail verdict sequence finishes and the board auto-resets to a full tray
      // (see resetWrongBoardToTray in AssemblyGame.tsx) well before the shared retry-ready timer
      // clears the phase back to 'awaiting-answer' — waiting for that phase, then past the GSAP
      // tile-flight duration, is enough to guarantee a settled, fully-refilled tray.
      await waitForGamePhaseScene(page, 'awaiting-answer');
      await page.waitForTimeout(700);
    },
    completion: async (page, baseUrl) => {
      await enterPlay(page, baseUrl);
      for (let round = 0; round < 5; round += 1) {
        await placeCorrectFullRail(page);
        if (round < 4) {
          await page.getByRole('button', { name: 'Pokračovať' }).click();
          await waitForGamePhaseScene(page, 'ready');
        }
      }
      await waitForGamePhaseScene(page, 'session-complete');
      await page.getByRole('button', { name: 'Hrať znova' }).waitFor({ state: 'visible' });
      await page.waitForTimeout(250);
    },
  };
})();

SCENES['assembly-round'] = assemblyScenes.round;
SCENES['assembly-placed'] = assemblyScenes.placed;
// Fixed stress content complements seeded ordinary captures: long and repeated labels.
for (const [scene, word] of [
  ['assembly-long-label', { word: 'Dlhý strom', syllables: 'dlo-hý-stro', emoji: '🌳', audioKey: 'dlhy-strom' }],
  ['assembly-duplicate-label', { word: 'Mama', syllables: 'ma-ma', emoji: '👩', audioKey: 'mama' }],
]) {
  SCENES[scene] = async (page, baseUrl) => {
    await page.addInitScript((entry) => {
      localStorage.setItem('hrave-ucenie-seeded-sk', 'true');
      localStorage.setItem('hrave-ucenie-user-words-sk', JSON.stringify({ version: 2, items: [{
        ...entry, id: 'capture-stress-word', status: 'ready', enabled: true, isDefault: false, locale: 'sk', order: 0,
      }] }));
    }, word);
    await assemblyScenes.placed(page, baseUrl);
  };
}
SCENES['counting-maximum'] = async (page, baseUrl) => {
  await page.addInitScript(() => localStorage.setItem('hrave-ucenie-settings', JSON.stringify({ countingRange: { start: 1, end: 10 } })));
  await page.goto(`${baseUrl}/counting`);
  // Place the highest item first in Fisher-Yates, then preserve it. Install after
  // navigation so the generic seed initializer cannot replace this stress fixture.
  await page.evaluate(() => {
    let first = true;
    Math.random = () => { if (first) { first = false; return 0; } return 0.999; };
  });
  await page.getByRole('button', { name: 'Hrať' }).click();
  await page.waitForFunction(() => window.__E2E__?.correctItemId === '10');
  await waitForPlaySurfaceSettled(page);
  if (await page.getByRole('button', { name: /^Predmet \d+ z 10$/ }).count() !== 10) throw new Error('Maximum quantity fixture must render ten counters');
};
SCENES['assembly-retry'] = assemblyScenes.retry;
SCENES['assembly-success'] = assemblyScenes.success;
SCENES['assembly-reset'] = assemblyScenes.reset;
SCENES['assembly-completion'] = assemblyScenes.completion;

/** Active numeracy rounds for the Phase 7 responsive review set. The hook is only used to wait
 * for the real game session to enter its answer phase; no React handler is invoked directly. */
async function enterNumeracyRound(page, baseUrl, path) {
  await stubSpeechSynthesis(page);
  await page.goto(`${baseUrl}${path}`);
  await page.getByRole('button', { name: 'Hrať' }).click();
  await waitForGamePhaseScene(page, 'awaiting-answer');
  await page.getByTestId('game-answer-region').getByRole('button').first().waitFor({ state: 'visible' });
}

/** Match the E2E game harness: numeral prompts can fall back to Web Speech, which headless
 * Chromium does not reliably complete. The visible controls and real click path remain intact. */
async function stubSpeechSynthesis(page) {
  await page.addInitScript(() => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    const prototype = Object.getPrototypeOf(synth);
    prototype.speak = function speak(utterance) {
      setTimeout(() => utterance.onend?.(new Event('end')), 0);
    };
  });
}

SCENES['counting-round'] = (page, baseUrl) => enterNumeracyRound(page, baseUrl, '/counting');
SCENES['compare-round'] = (page, baseUrl) => enterNumeracyRound(page, baseUrl, '/compare');
SCENES['addition-round'] = (page, baseUrl) => enterNumeracyRound(page, baseUrl, '/addition');

/** The four Find It games share the real game-session hook and answer surface. These release
 * scenes stop at a settled, answerable first round; feedback is represented separately by the
 * deterministic GameShell examples below. */
async function enterFindItRound(page, baseUrl, path) {
  await page.goto(`${baseUrl}${path}`);
  await page.getByRole('button', { name: 'Hrať' }).click();
  await waitForGamePhaseScene(page, 'awaiting-answer');
  await waitForPlaySurfaceSettled(page);
}

SCENES['alphabet-round'] = (page, baseUrl) => enterFindItRound(page, baseUrl, '/alphabet');
SCENES['syllables-round'] = (page, baseUrl) => enterFindItRound(page, baseUrl, '/syllables');
SCENES['numbers-round'] = (page, baseUrl) => enterFindItRound(page, baseUrl, '/numbers');
SCENES['words-round'] = (page, baseUrl) => enterFindItRound(page, baseUrl, '/words');

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

/** Open a protected parent route through the same test-only gate adapter used by the existing
 * parent scenes. Keeping access setup in one place makes the detailed capture states as
 * deterministic as the dashboard capture. */
async function openParentRoute(page, baseUrl, path) {
  await page.goto(`${baseUrl}${path}`);
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
  await page.getByRole('dialog', { name: 'Pre rodičov' }).waitFor({ state: 'hidden' });
}

async function openContentSection(page, baseUrl, section) {
  await openParentRoute(page, baseUrl, '/content');
  await page.getByRole('heading', { name: 'Vlastný obsah' }).waitFor({ state: 'visible' });
  await page.getByRole('tab', { name: new RegExp(`^${section} \\(`) }).click();
}

async function openFeedback(page, baseUrl, responseStatus) {
  await page.route('**/api.web3forms.com/submit', route => route.fulfill({
    status: responseStatus,
    contentType: 'application/json',
    body: JSON.stringify({ success: responseStatus < 400 }),
  }));
  await openParentRoute(page, baseUrl, '/settings/help');
  await page.getByRole('form', { name: 'Spätná väzba' }).waitFor({ state: 'visible' });
  await page.getByRole('radio', { name: /Chyba v hre/ }).click();
  await page.getByRole('textbox', { name: /Vaša správa/ }).fill('Testovací opis chyby.');
  await page.getByRole('button', { name: 'Odoslať', exact: true }).click();
  if (responseStatus >= 400) {
    await page.getByText(/odosielanie zlyhalo/i).waitFor({ state: 'visible' });
  } else {
    await page.getByRole('heading', { name: 'Ďakujeme!' }).waitFor({ state: 'visible' });
  }
}

// Detailed parent, content, and form states are part of the release review rather than being
// implied by their overview routes. Each scene performs the same visible interaction a parent
// would use, with network outcomes intercepted only for deterministic feedback states.
SCENES['game-settings-alphabet'] = async (page, baseUrl) => {
  await openParentRoute(page, baseUrl, '/settings/games/ALPHABET');
  await page.getByTestId('game-settings-detail').waitFor({ state: 'visible' });
};
SCENES['game-settings-counting'] = async (page, baseUrl) => {
  await openParentRoute(page, baseUrl, '/settings/games/COUNTING_ITEMS');
  await page.getByTestId('game-settings-detail').waitFor({ state: 'visible' });
};
SCENES['parent-help'] = async (page, baseUrl) => {
  await openParentRoute(page, baseUrl, '/settings/help');
  await page.getByText('Pomoc a spätná väzba', { exact: true }).waitFor({ state: 'visible' });
};

for (const [id, label] of [
  ['content-letters', 'Písmená'],
  ['content-numbers', 'Čísla'],
  ['content-phrases', 'Frázy'],
  ['content-words', 'Slová'],
  ['content-praise', 'Pochvaly'],
]) {
  SCENES[id] = (page, baseUrl) => openContentSection(page, baseUrl, label);
}

SCENES['content-word-editor'] = async (page, baseUrl) => {
  await openContentSection(page, baseUrl, 'Slová');
  await page.getByRole('button', { name: 'Pridať slovo' }).click();
  await page.getByRole('heading', { name: 'Pridať slovo' }).waitFor({ state: 'visible' });
};
SCENES['content-praise-editor'] = async (page, baseUrl) => {
  await openContentSection(page, baseUrl, 'Pochvaly');
  await page.getByRole('button', { name: 'Pridať pochvalu' }).click();
  await page.getByRole('heading', { name: 'Pridať pochvalu' }).waitFor({ state: 'visible' });
};
SCENES['content-disabled-list'] = async (page, baseUrl) => {
  await openContentSection(page, baseUrl, 'Slová');
  await page.getByRole('button', { name: 'Ďalšie možnosti' }).first().click();
  await page.getByRole('menuitem', { name: 'Vypnúť' }).click();
  await page.getByRole('button', { name: /Vypnuté \(1\)/ }).click();
};
async function createDraftWord(page, baseUrl, word = 'Hruska', syllables = 'hru-ska', emoji = '🍐') {
  await openContentSection(page, baseUrl, 'Slová');
  await page.getByRole('button', { name: 'Pridať slovo' }).click();
  await page.getByLabel(/^Slovo\b/).fill(word);
  await page.getByLabel('Slabiky').fill(syllables);
  await page.getByLabel('Emoji').fill(emoji);
  await page.getByRole('button', { name: 'Pridať', exact: true }).click();
  await page.getByText(`${word} ${emoji} ·`, { exact: true }).waitFor({ state: 'visible' });
}
SCENES['content-recording-draft'] = async (page, baseUrl) => {
  await createDraftWord(page, baseUrl);
};
SCENES['content-recording-ready'] = async (page, baseUrl) => {
  await installCaptureRecorder(page);
  await createDraftWord(page, baseUrl, 'Marakuja', 'ma-ra-ku-ja', '🥭');
  await page.getByRole('button', { name: 'Nahrať', exact: true }).last().click();
  await page.getByRole('status').filter({ hasText: /Nahrávam/ }).waitFor({ state: 'visible' });
  await page.getByRole('button', { name: 'Zastaviť', exact: true }).click();
  await page.getByText('Vlastné', { exact: true }).waitFor({ state: 'visible' });
  await page.getByRole('button', { name: 'Zmazať nahrávku' }).waitFor({ state: 'visible' });
};
SCENES['recording-permission'] = async (page, baseUrl) => {
  await installCaptureRecorder(page);
  await openContentSection(page, baseUrl, 'Písmená');
  await page.evaluate(() => { window.__captureRecorder.mode = 'delayed-permission'; });
  await page.getByRole('button', { name: 'Nahrať', exact: true }).first().click();
  await page.getByRole('status').filter({ hasText: /Čakám na povolenie mikrofónu/ }).waitFor({ state: 'visible' });
};
SCENES['recording-active'] = async (page, baseUrl) => {
  await installCaptureRecorder(page);
  await openContentSection(page, baseUrl, 'Písmená');
  await page.getByRole('button', { name: 'Nahrať', exact: true }).first().click();
  await page.getByRole('status').filter({ hasText: /Nahrávam/ }).waitFor({ state: 'visible' });
  await page.getByRole('button', { name: 'Zastaviť', exact: true }).waitFor({ state: 'visible' });
};
SCENES['feedback-error'] = (page, baseUrl) => openFeedback(page, baseUrl, 500);
SCENES['feedback-success'] = (page, baseUrl) => openFeedback(page, baseUrl, 200);
SCENES['keyboard-focus'] = async (page, baseUrl) => {
  await openContentSection(page, baseUrl, 'Písmená');
  const lettersTab = page.getByRole('tab', { name: /^Písmená \(/ });
  await lettersTab.focus();
  const orientation = await page.getByRole('tablist').getAttribute('aria-orientation');
  const arrow = orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight';
  await page.keyboard.down(arrow);
  await page.waitForFunction(() => document.activeElement?.getAttribute('role') === 'tab' && document.activeElement?.textContent?.includes('Čísla'));
  await page.keyboard.up(arrow);
};

/**
 * A compact, intentional review surface for shipping UI. It covers the home, both parent-gate
 * outcomes, one lobby and one live round for every released game, deterministic feedback
 * states, and every parent-facing destination. The legacy recordings entry is included by name
 * even though it resolves to the consolidated content screen after access is granted.
 */
export const RELEASE_SCENE_NAMES = [
  'home',
  'parents-gate',
  'parents-gate-error',
  ...LOBBY_SLUGS.map((slug) => `lobby-${slug}`),
  ...LOBBY_SLUGS.map((slug) => `${slug}-round`),
  'game-shell-success',
  'game-shell-failure',
  'game-shell-retry',
  'game-shell-completion',
  'game-shell-paused',
  'dashboard',
  'game-settings',
  'app-settings',
  'content',
  'recordings',
  'parent-feedback',
  'game-settings-alphabet',
  'game-settings-counting',
  'parent-help',
  'content-letters',
  'content-numbers',
  'content-phrases',
  'content-words',
  'content-praise',
  'content-word-editor',
  'content-praise-editor',
  'content-disabled-list',
  'content-recording-draft',
  'content-recording-ready',
  'recording-permission',
  'recording-active',
  'feedback-error',
  'feedback-success',
  'keyboard-focus',
  'ui-kit',
];

async function main() {
  const { base, scenes: inputScenes, viewports: inputViewports, output: outputArg, matrix, help, seed } = parseArgs(process.argv.slice(2));
  if (help) {
    printHelp();
    return;
  }
  const baseOrigin = new URL(base).origin;

  const targetScenes = inputScenes.length > 0
    ? inputScenes
    : matrix === 'release'
      ? RELEASE_SCENE_NAMES
      : Object.keys(SCENES);
  for (const scene of targetScenes) {
    if (!(scene in SCENES)) {
      throw new Error(`Unknown scene: "${scene}". Valid scenes are: ${Object.keys(SCENES).join(', ')}`);
    }
  }

  const targetViewports = inputViewports.length > 0
    ? inputViewports
    : matrix === 'release'
      ? Object.keys(RELEASE_VIEWPORTS)
      : Object.keys(CANONICAL_VIEWPORTS);
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
    const runName = formatRunDirectoryName(new Date(), gitSha, process.pid);
    outputDir = path.resolve(process.cwd(), 'artifacts', 'ui', runName);
    if (fs.existsSync(outputDir)) {
      throw new Error(`Output collision: directory already exists at ${outputDir}`);
    }
  }
  fs.mkdirSync(outputDir, { recursive: true });

  const localIdentity = buildIdentity('capture');
  let servedIdentity = { mode: 'unidentified-development', fingerprint: null };
  try {
    const response = await fetch(`${base}/build-identity.json`);
    if (response.ok) servedIdentity = await response.json();
  } catch { /* A development server may have no built identity. Record that explicitly. */ }
  const manifest = { createdAt: new Date().toISOString(), commit: localIdentity.commit, fingerprint: localIdentity.fingerprint, build: servedIdentity, base, seed, captures: [] };
  const executablePath = resolveChromiumExecutable();
  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      ...(executablePath ? { executablePath } : {}),
    });
    for (const viewportName of targetViewports) {
      const viewport = CANONICAL_VIEWPORTS[viewportName];
      const context = await browser.newContext({
        viewport,
        reducedMotion: 'reduce',
      });

      try {
        for (const sceneName of targetScenes) {
          const page = await context.newPage();
          await page.addInitScript(({ initialSeed }) => {
            let state = initialSeed >>> 0;
            Math.random = () => {
              state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
              return state / 4294967296;
            };
          }, { initialSeed: seed });
          const errors = [];
          const failedRequests = [];
          const capture = { scene: sceneName, viewport: viewportName, seed, errors, failedRequests, success: false };
          manifest.captures.push(capture);

          page.on('console', (msg) => {
            if (msg.type() === 'error') {
              // The mocked external feedback endpoint intentionally returns 500
              // for this one scene; Chromium logs that HTTP response as an error.
              if (sceneName === 'feedback-error' && msg.text() === 'Failed to load resource: the server responded with a status of 500 (Internal Server Error)') return;
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
            const reviewDir = path.join(outputDir, 'review', sceneName);
            fs.mkdirSync(reviewDir, { recursive: true });
            const reviewPath = path.join(reviewDir, `${viewportName}.png`);
            await sharp(filePath).resize({ width: 320, withoutEnlargement: true }).png().toFile(reviewPath);
            capture.original = path.relative(outputDir, filePath);
            capture.review = path.relative(outputDir, reviewPath);

            if (errors.length > 0) {
              throw new Error(`Console errors in scene "${sceneName}" [${viewportName}]:\n${errors.join('\n')}`);
            }
            if (failedRequests.length > 0) {
              throw new Error(`Failed same-origin requests in scene "${sceneName}" [${viewportName}]:\n${failedRequests.join('\n')}`);
            }
            capture.success = true;
          } catch (error) {
            capture.failure = error.message;
            throw error;
          } finally {
            await page.close();
          }
        }
      } finally {
        await context.close();
      }
    }
  } catch (error) {
    manifest.failure = error.message;
    throw error;
  } finally {
    await browser?.close();
    fs.writeFileSync(path.join(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
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
