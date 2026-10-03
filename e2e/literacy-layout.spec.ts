import { expect, test, type Page } from './support/fixtures';
import AxeBuilder from '@axe-core/playwright';
import { expectMinimumTarget, expectNoHorizontalOverflow, expectNoPairwiseOverlap, expectWithinViewport } from './support/layoutAssertions';
import { getE2EState } from './support/e2eHook';
import { stubAudioPlayback, stubSpeechSynthesis, waitForGamePhase } from './support/gameHarness';
import { CANONICAL_VIEWPORTS, INTEGRATION_VIEWPORTS } from './support/viewports';
import { toAxeParams, isSeriousAxeViolation, LONG_LABEL_WORDS, seedSingleLiteracyWord, BespokeRoundState, BespokeGameCase, BESPOKE_GAMES, actedControl, waitForOverlaySettled, AXE_TAGS, expectNotClippedByAncestorOverflow, PLAY_SURFACE_CONTROLS, waitForPlaySurfaceSettled } from './support/literacyHarness';

test('UI kit exposes the literacy material vocabulary', async ({ page }) => {
  await page.goto('/ui-kit');
  const section = page.getByRole('region', { name: 'Literárne materiály' });
  await expect(section.getByTestId('picture-card')).toBeVisible();
  await expect(section.getByTestId('word-rail')).toBeVisible();
  await expect(section.getByTestId('inset-slot-active')).toHaveAttribute('data-slot-state', 'active');
  await expect(section.getByTestId('inset-slot-filled')).toHaveAttribute('data-slot-state', 'filled');
  await expectMinimumTarget(page, section.getByRole('button', { name: 'Slabika MA' }), 48);
  await expectNoHorizontalOverflow(page);
});

test.describe('Task 7: Full viewport matrix', () => {
  const viewportEntries = Object.entries(INTEGRATION_VIEWPORTS) as Array<
    [keyof typeof CANONICAL_VIEWPORTS, (typeof CANONICAL_VIEWPORTS)[keyof typeof CANONICAL_VIEWPORTS]]
  >;

  for (const game of BESPOKE_GAMES) {
    for (const [viewportName, viewport] of viewportEntries) {
      test(`${game.name} meets viewport constraints at ${viewportName} (${viewport.width}x${viewport.height})`, async ({ page }) => {

        await page.setViewportSize(viewport);
        await game.enterPlay(page);

        await expectNoHorizontalOverflow(page);

        // Child playfields (the picture/word-rail prompt visuals) may compress or scroll inside
        // the bounded shell, so they only need to intersect the viewport, not sit fully inside
        // it — unlike the answer region, replay, progress, and back action below.
        for (const locator of [page.getByTestId('game-visible-instruction'), page.getByTestId('game-answer-region')]) {
          const box = await locator.boundingBox();
          expect(box, `${game.name} at ${viewportName}: expected a visible bounding box`).not.toBeNull();
          expect(box!.x, `${game.name} at ${viewportName}: must intersect the viewport horizontally`).toBeLessThan(viewport.width);
          expect(box!.x + box!.width, `${game.name} at ${viewportName}: must intersect the viewport horizontally`).toBeGreaterThan(0);
        }

        // Three of the four games render a WordRail — the actual blank(s) the round is about —
        // inside the same prompt area as PictureCard. It must stay genuinely visible, not just
        // "somewhere on the page": this is what a fixed, too-small wrapper cap broke silently.
        const wordRail = page.getByTestId('word-rail');
        if (await wordRail.count() > 0) {
          await expect(wordRail).toBeVisible();
          await expectWithinViewport(page, wordRail);
          await expectNotClippedByAncestorOverflow(wordRail);
        }

        const replay = page.getByRole('button', { name: 'Zopakovať zadanie' });
        const back = page.getByRole('button', { name: 'Späť', exact: true });
        const progress = page.getByRole('progressbar', { name: 'Postup v hre' });
        const answerRegion = page.getByTestId('game-answer-region');

        await expectWithinViewport(page, answerRegion);
        await expectWithinViewport(page, replay);
        await expectWithinViewport(page, progress);
        await expectWithinViewport(page, back);

        await expectMinimumTarget(page, replay, 48);
        await expectMinimumTarget(page, back, 48);

        const answers = page.locator('[data-testid="game-answer-region"] button');
        const count = await answers.count();
        expect(count, `${game.name} at ${viewportName}: expected at least one answer control`).toBeGreaterThan(0);
        for (let i = 0; i < count; i += 1) {
          await expectMinimumTarget(page, answers.nth(i), 48);
        }
        await expectNoPairwiseOverlap(answers);
      });
    }
  }
});

/**
 * The retry announcement must not change the prompt or answer area's geometry. Exercise every
 * bespoke game at each canonical viewport, then confirm the playfield remains usable.
 */
test.describe('Final review: retries keep the prompt and answer area geometry', () => {
  const viewportEntries = Object.entries(INTEGRATION_VIEWPORTS) as Array<
    [keyof typeof CANONICAL_VIEWPORTS, (typeof CANONICAL_VIEWPORTS)[keyof typeof CANONICAL_VIEWPORTS]]
  >;

  for (const game of BESPOKE_GAMES) {
    for (const [viewportName, viewport] of viewportEntries) {
      test(`${game.name} keeps retry announcement off the play surface at ${viewportName} (${viewport.width}x${viewport.height})`, async ({ page }) => {

        // Audio completion is stubbed because this check measures geometry, not playback timing.
        await stubAudioPlayback(page);
        await stubSpeechSynthesis(page);
        await page.setViewportSize(viewport);
        await game.enterPlay(page);
        await waitForPlaySurfaceSettled(page);

        const readGeometry = () => page.evaluate((selector) => {
          const box = (el: Element | null) => {
            if (!el) return null;
            const rect = el.getBoundingClientRect();
            return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, width: rect.width, height: rect.height };
          };
          const tray = document.querySelector('[data-testid="play-tray"]');
          return {
            prompt: box(document.querySelector('[data-testid="game-visible-instruction"]')),
            interactiveContent: box(document.querySelector('[data-testid="game-interactive-content"]')),
            answerRegion: box(document.querySelector('[data-testid="game-answer-region"]')),
            tray: box(document.querySelector('[data-testid="play-tray"]')),
            controls: Array.from(document.querySelectorAll(selector)).map((el) => box(el)!),
            trayOverflowPx: tray ? tray.scrollHeight - tray.clientHeight : null,
            viewportHeight: window.innerHeight,
          };
        }, PLAY_SURFACE_CONTROLS);
        const beforeRetry = await readGeometry();
        await game.answerWrong(page);
        const snapshot = await readGeometry();

        expect(snapshot.prompt, `${game.name} at ${viewportName}: expected a measurable prompt`).not.toBeNull();
        expect(snapshot.interactiveContent).toEqual(beforeRetry.interactiveContent);
        expect(snapshot.answerRegion, `${game.name} at ${viewportName}: expected a measurable answer region`).not.toBeNull();
        expect(snapshot.prompt).toEqual(beforeRetry.prompt);
        expect(snapshot.answerRegion).toEqual(beforeRetry.answerRegion);
        expect(snapshot.tray).toEqual(beforeRetry.tray);
        await expect(page.getByTestId('game-retry-status')).toHaveClass(/sr-only/);
        await expect(page.getByTestId('game-retry-status')).toHaveAttribute('aria-live', 'polite');

        // Every control must remain an on-screen, minimum-size target in the retry state.
        expect(snapshot.controls.length, `${game.name} at ${viewportName}: expected at least one control`).toBeGreaterThan(0);
        for (const control of snapshot.controls) {
          expect(
            Math.min(control.width, control.height),
            `${game.name} at ${viewportName}: control ${JSON.stringify(control)} is under the 48px child target during retry`,
          ).toBeGreaterThanOrEqual(47.5);
          expect(
            control.bottom,
            `${game.name} at ${viewportName}: control ${JSON.stringify(control)} runs past the bottom of the viewport during retry`,
          ).toBeLessThanOrEqual(snapshot.viewportHeight + 1);
        }
        expect(
          snapshot.trayOverflowPx,
          `${game.name} at ${viewportName}: the play tray is clipping ${snapshot.trayOverflowPx}px of its own content during retry`,
        ).toBeLessThanOrEqual(1);

        const answerRegion = page.getByTestId('game-answer-region');
        await expectNotClippedByAncestorOverflow(answerRegion);
        await expectNoHorizontalOverflow(page);
      });
    }
  }
});

/**
 * The answer-grid geometry is deliberately driven by the available tray height on short
 * landscapes. Its labels therefore cannot use viewport width alone: at 667px wide the former
 * 7vw scale made a three-character syllable much wider than its roughly 61px answer tile. Check
 * the rendered label box itself rather than scroll metrics, because TactilePiece intentionally
 * allows its child content to paint outside its border in ordinary layouts.
 */
test.describe('Final review: literacy answer labels stay inside their tiles on landscape phones', () => {
  const LANDSCAPE_VIEWPORTS: Array<[string, { width: number; height: number }]> = [
    ['shortLandscape', CANONICAL_VIEWPORTS.shortLandscape],
    ['phoneLandscape', CANONICAL_VIEWPORTS.phoneLandscape],
  ];
  const EXPECTED_STRESS_LABELS: Record<BespokeGameCase['name'], string[]> = {
    'first-letter': ['DŽ'],
    'complete-letter': ['DŽ'],
    'complete-syllable': ['STRO'],
    assembly: ['DLO', 'STRO'],
  };

  async function expectAnswerLabelsContained(
    page: Page,
    context: string,
    expectedLabels: string[],
  ): Promise<void> {
    const geometry = await page.locator('[data-testid="game-answer-region"] button > .font-spline').evaluateAll((labels) =>
      labels.map((label) => {
        const labelRect = label.getBoundingClientRect();
        const tileRect = label.parentElement!.getBoundingClientRect();
        return {
          label: label.textContent?.trim(),
          labelLeft: labelRect.left,
          labelRight: labelRect.right,
          labelTop: labelRect.top,
          labelBottom: labelRect.bottom,
          tileLeft: tileRect.left,
          tileRight: tileRect.right,
          tileTop: tileRect.top,
          tileBottom: tileRect.bottom,
          tileWidth: tileRect.width,
          tileHeight: tileRect.height,
        };
      }),
    );

    expect(geometry.length, `${context}: expected answer labels`).toBeGreaterThan(0);
    for (const expectedLabel of expectedLabels) {
      expect(
        geometry.some((item) => item.label === expectedLabel),
        `${context}: expected stress label ${expectedLabel} before measuring containment`,
      ).toBe(true);
    }
    for (const item of geometry) {
      expect(item.tileWidth, `${context}: ${item.label} target width`).toBeGreaterThanOrEqual(48);
      expect(item.tileHeight, `${context}: ${item.label} target height`).toBeGreaterThanOrEqual(48);
      expect(item.labelLeft, `${context}: ${item.label} extends left of its tile`).toBeGreaterThanOrEqual(item.tileLeft - 0.5);
      expect(item.labelRight, `${context}: ${item.label} extends right of its tile`).toBeLessThanOrEqual(item.tileRight + 0.5);
      expect(item.labelTop, `${context}: ${item.label} extends above its tile`).toBeGreaterThanOrEqual(item.tileTop - 0.5);
      expect(item.labelBottom, `${context}: ${item.label} extends below its tile`).toBeLessThanOrEqual(item.tileBottom + 0.5);
    }
  }

  async function enterLongLabelRound(page: Page, game: BespokeGameCase): Promise<void> {
    // The production pools are shuffled, so pin one word per game and make the missing-letter
    // picker choose its first unit. This guarantees the label that previously escaped its tile:
    // DŽ for the two letter games, STRO for missing-syllable, and DLO/STRO in Assembly.
    await page.addInitScript(() => { Math.random = () => 0; });
    await seedSingleLiteracyWord(page, LONG_LABEL_WORDS[game.name]);
    await page.goto(game.path);
    await page.getByRole('button', { name: 'Hrať' }).click();
  }

  for (const game of BESPOKE_GAMES) {
    for (const [viewportName, viewport] of LANDSCAPE_VIEWPORTS) {
      test(`${game.name} contains every answer label in ${viewportName} during a round and retry`, async ({ page }) => {
        await stubSpeechSynthesis(page);
        await page.setViewportSize(viewport);
        await enterLongLabelRound(page, game);
        await waitForPlaySurfaceSettled(page);

        await expectAnswerLabelsContained(
          page,
          `${game.name} at ${viewportName} during a round`,
          EXPECTED_STRESS_LABELS[game.name],
        );

        await game.answerWrong(page);
        await expectAnswerLabelsContained(
          page,
          `${game.name} at ${viewportName} during retry`,
          EXPECTED_STRESS_LABELS[game.name],
        );
      });
    }
  }
});

test.describe('Task 7: WordRail must stay genuinely visible, not just on-page', () => {
  // Dedicated, never-CI-skipped coverage for exactly the two sizes a real ancestor-clipping
  // regression was found at: the app's own canonical mobile viewport (phonePortrait, the same
  // size as MOBILE_VIEWPORT used throughout the rest of this suite) and shortLandscape. The full
  // viewport-matrix test above also checks this at all 10 sizes, but only asserts the 4-viewport
  // CI subset in CI — this block runs regardless, so a regression here always fails the suite.
  const WORD_RAIL_GAMES = BESPOKE_GAMES.filter((game) => game.name !== 'first-letter');
  const CHECK_VIEWPORTS: Array<[string, { width: number; height: number }]> = [
    ['phonePortrait (MOBILE_VIEWPORT)', CANONICAL_VIEWPORTS.phonePortrait],
    ['shortLandscape', CANONICAL_VIEWPORTS.shortLandscape],
  ];

  for (const game of WORD_RAIL_GAMES) {
    for (const [viewportName, viewport] of CHECK_VIEWPORTS) {
      test(`${game.name}: word-rail is visible and unclipped at ${viewportName} (${viewport.width}x${viewport.height})`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await game.enterPlay(page);

        const wordRail = page.getByTestId('word-rail');
        await expect(wordRail).toBeVisible();
        await expectWithinViewport(page, wordRail);
        await expectNotClippedByAncestorOverflow(wordRail);

        // The actual blank(s)/letters inside must be visible too, not merely the section shell.
        const slots = wordRail.locator('[data-slot-state]');
        const slotCount = await slots.count();
        expect(slotCount, `${game.name} at ${viewportName}: expected at least one word-rail slot`).toBeGreaterThan(0);
        for (let i = 0; i < slotCount; i += 1) {
          await expect(slots.nth(i)).toBeVisible();
        }
      });
    }
  }
});

test.describe('Task 7: Rotation preserves focus', () => {
  for (const game of BESPOKE_GAMES) {
    test(`${game.name}: rotating portrait to landscape mid-round preserves round state and focus without clipping`, async ({ page }) => {
      await page.setViewportSize(CANONICAL_VIEWPORTS.phonePortrait);
      await game.enterPlay(page);
      await game.answerWrong(page);
      await waitForGamePhase(page, 'awaiting-answer');

      const before = await getE2EState<BespokeRoundState>(page);
      const replay = page.getByRole('button', { name: 'Zopakovať zadanie' });
      await replay.focus();

      await page.setViewportSize(CANONICAL_VIEWPORTS.phoneLandscape);
      await expectNoHorizontalOverflow(page);
      // AnswerGroup's own grid geometry is recomputed from a ResizeObserver callback, not
      // synchronously with the resize itself — unlike a fresh page load (where it's already
      // settled by the time a check runs), a resize on an already-mounted page needs a beat to
      // catch up. Poll for that settlement instead of asserting once immediately after resizing.
      await expect.poll(async () => {
        const rect = await page.getByTestId('game-answer-region').evaluate((el) => el.getBoundingClientRect());
        const viewport = page.viewportSize();
        return viewport !== null && rect.bottom <= viewport.height + 1;
      }).toBe(true);
      await expectWithinViewport(page, page.getByTestId('game-answer-region'));
      await expectWithinViewport(page, replay);
      await expect(replay).toBeFocused();

      const afterLandscape = await getE2EState<BespokeRoundState>(page);
      expect(afterLandscape.gamePhase).toBe(before.gamePhase);
      expect(afterLandscape.roundsPlayed).toBe(before.roundsPlayed);
      expect(afterLandscape.wrongAttempts).toBe(before.wrongAttempts);

      await page.setViewportSize(CANONICAL_VIEWPORTS.phonePortrait);
      await expectNoHorizontalOverflow(page);
      const restored = await getE2EState<BespokeRoundState>(page);
      expect(restored.roundsPlayed).toBe(before.roundsPlayed);
      expect(restored.wrongAttempts).toBe(before.wrongAttempts);

      // The round must still be completable after two resizes.
      await game.answerCorrect(page);
    });
  }
});

test.describe('Task 7: Assistive contract', () => {
  for (const game of BESPOKE_GAMES) {
    test(`${game.name}: exposes one main, one heading, visible prompt/replay/progress, roving tabstop, and live retry and visible correct states`, async ({ page }) => {
      await game.enterPlay(page);

      await expect(page.getByRole('main')).toHaveCount(1);
      await expect(page.getByRole('heading', { level: 1, name: game.heading })).toHaveCount(1);
      await expect(page.getByTestId('game-visible-instruction')).toHaveText(game.instruction);
      await expect(page.getByRole('button', { name: 'Zopakovať zadanie' })).toBeVisible();
      await expect(page.getByRole('progressbar', { name: 'Postup v hre' })).toHaveAttribute('aria-valuenow', '1');

      // Roving tabstop: every game's choice/tray region is the same shared AnswerGroup
      // instance, so ArrowRight must move focus within it identically for all four.
      const answers = page.locator('[data-testid="game-answer-region"] button');
      await answers.first().focus();
      await page.keyboard.press('ArrowRight');
      await expect(answers.nth(1)).toBeFocused();

      const wrongId = await game.answerWrong(page);
      const status = page.getByRole('status');
      await expect(page.getByTestId('game-retry-status')).toHaveClass(/sr-only/);
      await expect(status).toContainText('Skús ešte raz');
      await expect(status).toHaveAttribute('aria-live', 'polite');
      await expect(actedControl(page, wrongId)).not.toContainText('Skús ešte raz');

      await waitForGamePhase(page, 'awaiting-answer');

      const correctId = await game.answerCorrect(page);
      await expect(page.getByRole('status')).toBeVisible();
      await expect(actedControl(page, correctId)).toHaveAttribute('data-piece-state', 'settled');
    });

    test(`${game.name}: reaching session completion moves focus to Play again`, async ({ page }) => {
      await game.enterPlay(page);
      await game.finishSessionCorrectly(page);

      await expect(page.getByRole('button', { name: 'Hrať znova' })).toBeFocused();
      await expect(page.getByRole('button', { name: 'Domov' })).toBeVisible();
    });
  }
});

test.describe('Task 7: Reduced motion', () => {
  for (const game of BESPOKE_GAMES) {
    test(`${game.name}: reduced motion keeps retry and correct feedback legible with no serious axe violations and no stale clones`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await game.enterPlay(page);

      const roundAxe = await new AxeBuilder(toAxeParams(page)).withTags(AXE_TAGS).analyze();
      expect(roundAxe.violations.filter((v) => isSeriousAxeViolation(v.impact))).toEqual([]);

      const wrongId = await game.answerWrong(page);
      await expect(page.getByRole('status')).toContainText('Skús ešte raz');
      await expect(actedControl(page, wrongId)).not.toContainText('Skús ešte raz');
      await waitForGamePhase(page, 'awaiting-answer');

      const correctId = await game.answerCorrect(page);
      await expect(page.getByRole('status')).toBeVisible();
      await expect(actedControl(page, correctId)).toHaveAttribute('data-piece-state', 'settled');

      // No translational tile flight and no leftover floating clone: every id in the live DOM
      // (mainly exercises Assembly's tile-flight path — the other three render no clones at all)
      // must still appear exactly once.
      const tileIds = await page.locator('[data-tile-id]').evaluateAll((nodes) => nodes.map((n) => n.getAttribute('data-tile-id')));
      expect(new Set(tileIds).size).toBe(tileIds.length);

      await waitForOverlaySettled(page);
      const successAxe = await new AxeBuilder(toAxeParams(page)).withTags(AXE_TAGS).analyze();
      expect(successAxe.violations.filter((v) => isSeriousAxeViolation(v.impact))).toEqual([]);
    });

    test(`${game.name}: reduced motion still reaches a finite completion with no looping animation`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await game.enterPlay(page);
      await game.finishSessionCorrectly(page);

      await expect(page.getByRole('button', { name: 'Hrať znova' })).toBeVisible();
      await waitForOverlaySettled(page);
      const completionAxe = await new AxeBuilder(toAxeParams(page)).withTags(AXE_TAGS).analyze();
      expect(completionAxe.violations.filter((v) => isSeriousAxeViolation(v.impact))).toEqual([]);

      // Finite, not an infinite celebration loop — the same completion controls must still be
      // exactly there well past any short entrance transition.
      await page.waitForTimeout(1500);
      await expect(page.getByRole('button', { name: 'Hrať znova' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Domov' })).toBeVisible();
    });
  }
});
