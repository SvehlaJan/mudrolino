import { expect, test, type Locator, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { E2EGlobalState } from '../src/shared/services/e2eState';
import { getE2EState } from './support/e2eHook';
import { stubSpeechSynthesis, waitForGamePhase } from './support/gameHarness';

const SERIOUS_IMPACTS = ['critical', 'serious'];
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'];

type NumeracyGameId = 'COUNTING_ITEMS' | 'COMPARE_QUANTITIES' | 'ADDITION';

interface NumeracyE2EState extends E2EGlobalState {
  gameId: NumeracyGameId;
  correctItemId?: string | null;
  correctSide?: 'left' | 'right' | null;
  correctSum?: number | null;
  optionValues?: number[];
  wrongAttempts: number;
}

interface NumeracyRoute {
  path: string;
  heading: string;
  answerGroup: string;
  retryTitle: string;
  chooseWrongAnswer: (page: Page, state: NumeracyE2EState) => Locator;
}

function isSeriousViolation(impact: string | null | undefined): boolean {
  return SERIOUS_IMPACTS.includes(impact ?? '');
}

// See e2e/accessibility-foundation.spec.ts for the package-version explanation.
function toAxeParams(page: Page): ConstructorParameters<typeof AxeBuilder>[0] {
  return { page } as unknown as ConstructorParameters<typeof AxeBuilder>[0];
}

const NUMERACY_ROUTES: NumeracyRoute[] = [
  {
    path: '/counting',
    heading: 'Spočítaj',
    answerGroup: 'Vyber počet',
    retryTitle: 'Skús ešte raz',
    chooseWrongAnswer: (page, state) => {
      const wrong = state.optionValues?.find(value => String(value) !== state.correctItemId);
      expect(wrong, 'counting needs a visible non-target answer').toBeDefined();
      return page.locator(`[data-answer-id=${JSON.stringify(String(wrong))}]:visible`);
    },
  },
  {
    path: '/compare',
    heading: 'Viac alebo Menej',
    answerGroup: 'Porovnanie množstiev',
    retryTitle: 'Skús druhú skupinu.',
    chooseWrongAnswer: (page, state) => {
      expect(state.correctSide, 'compare needs an active correct side').not.toBeNull();
      const wrongSide = state.correctSide === 'left' ? 'right' : 'left';
      return page.locator(`[data-answer-side=${wrongSide}]:visible`);
    },
  },
  {
    path: '/addition',
    heading: 'Sčítaj',
    answerGroup: 'Vyber súčet',
    retryTitle: 'Skús ešte raz',
    chooseWrongAnswer: (page, state) => {
      const wrong = state.optionValues?.find(value => value !== state.correctSum);
      expect(wrong, 'addition needs a visible non-target answer').toBeDefined();
      return page.locator(`[data-answer-id=${JSON.stringify(String(wrong))}]:visible`);
    },
  },
];

async function startRound(page: Page, route: NumeracyRoute): Promise<void> {
  await stubSpeechSynthesis(page);
  await page.goto(route.path);
  await page.getByRole('button', { name: 'Hrať' }).click();
  await expect(page.getByRole('heading', { name: route.heading })).toBeVisible();
  await waitForGamePhase(page, 'awaiting-answer');
}

async function expectReducedMotionResultDoesNotTransform(page: Page, answer: Locator): Promise<void> {
  await page.evaluate(() => {
    const state = window as typeof window & {
      __reducedMotionStatusTransforms?: string[];
      __reducedMotionStatusCapture?: Promise<void>;
    };
    const transforms = new Set<string>();
    const sample = () => {
      for (const banner of document.querySelectorAll('[data-testid="game-retry-status"]')) {
        transforms.add(getComputedStyle(banner).transform);
      }
    };
    state.__reducedMotionStatusCapture = new Promise((resolve) => {
      let started = false;
      const captureFrame = () => {
        sample();
        if (framesRemaining-- > 0) {
          requestAnimationFrame(captureFrame);
        } else {
          state.__reducedMotionStatusTransforms = [...transforms];
          resolve();
        }
      };
      let framesRemaining = 16;
      const beginWhenVisible = () => {
        if (started || !document.querySelector('[data-testid="game-retry-status"]')) return;
        started = true;
        observer.disconnect();
        captureFrame();
      };
      const observer = new MutationObserver(beginWhenVisible);
      observer.observe(document.body, { childList: true, subtree: true });
      beginWhenVisible();
    });
  });
  await answer.click();
  const status = page.getByRole('status');
  await expect(status).toBeVisible();
  await page.evaluate(async () => {
    const state = window as typeof window & { __reducedMotionStatusCapture?: Promise<void> };
    await state.__reducedMotionStatusCapture;
  });
  await expect(status).toHaveCSS('transform', 'none');
  const transforms = await page.evaluate(() =>
    (window as typeof window & { __reducedMotionStatusTransforms?: string[] }).__reducedMotionStatusTransforms ?? [],
  );
  expect(transforms).toEqual(['none']);
}

for (const route of NUMERACY_ROUTES) {
  test(`${route.heading}: exposes the semantic round structure and has no serious axe violations`, async ({ page }) => {
    await startRound(page, route);

    await expect(page.getByRole('main')).toHaveCount(1);
    await expect(page.getByRole('heading', { name: route.heading })).toHaveCount(1);
    await expect(page.getByRole('region', { name: 'Zadanie' })).toBeVisible();
    await expect(page.getByTestId('game-visible-instruction')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Zopakovať zadanie' })).toBeVisible();
    await expect(page.getByRole('progressbar', { name: 'Postup v hre' })).toBeVisible();
    await expect(page.getByRole('group', { name: route.answerGroup })).toBeVisible();

    const results = await new AxeBuilder(toAxeParams(page)).withTags(AXE_TAGS).analyze();
    expect(results.violations.filter(violation => isSeriousViolation(violation.impact))).toEqual([]);

    const state = await getE2EState<NumeracyE2EState>(page);
    await route.chooseWrongAnswer(page, state).click();
    await expect(page.getByRole('status')).toBeVisible();
    await expect(page.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });

  test(`${route.heading}: keyboard activates one answer and a wrong result is announced politely`, async ({ page }) => {
    await startRound(page, route);

    const answers = page.getByRole('group', { name: route.answerGroup }).getByRole('button');
    const beforeAnswers = route.path === '/counting'
      ? page.getByRole('button', { name: /^Predmet \d+ z \d+$/ }).last()
      : page.getByRole('button', { name: 'Zopakovať zadanie' });
    await beforeAnswers.focus();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('group', { name: route.answerGroup }).locator('button[tabindex="0"]')).toBeFocused();
    if (await answers.count() > 1) {
      await page.keyboard.press('ArrowRight');
      await expect(answers.nth(1)).toBeFocused();
    }
    await page.keyboard.press('Enter');
    await expect.poll(async () => (await getE2EState<NumeracyE2EState>(page)).gamePhase).not.toBe('awaiting-answer');
    await expect(page.locator('[data-testid="game-answer-region"] button[data-piece-state="pressed"], [data-testid="game-answer-region"] button[data-piece-state="retry"], [data-testid="game-answer-region"] button[data-piece-state="settled"]')).toHaveCount(1);

    // Restart to produce a known wrong outcome. The E2E hook supplies only the answer identity;
    // the test still triggers the real visible control and observes the rendered announcement.
    await startRound(page, route);
    const state = await getE2EState<NumeracyE2EState>(page);
    const wrongAnswer = route.chooseWrongAnswer(page, state);
    await wrongAnswer.click();
    const status = page.getByRole('status');
    await expect(status).toHaveAttribute('aria-live', 'polite');
    await expect(status).toContainText(route.retryTitle);
  });

  test(`${route.heading}: reduced motion has no infinite animations and keeps the result untransformed`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await startRound(page, route);
    const state = await getE2EState<NumeracyE2EState>(page);
    const wrongAnswer = route.chooseWrongAnswer(page, state);
    await expectReducedMotionResultDoesNotTransform(page, wrongAnswer);

    const infiniteAnimations = await page.evaluate(() => Array.from(document.querySelectorAll('*')).filter((element) => {
      const style = getComputedStyle(element);
      return style.animationIterationCount === 'infinite';
    }).length);
    expect(infiniteAnimations).toBe(0);
  });
}

test('Viac alebo Menej: Space activates a roving answer choice', async ({ page }) => {
  const route = NUMERACY_ROUTES.find(({ path }) => path === '/compare')!;
  await startRound(page, route);

  const answers = page.getByRole('group', { name: route.answerGroup }).getByRole('button');
  await answers.first().focus();
  await page.keyboard.press('Space');
  await expect.poll(async () => (await getE2EState<NumeracyE2EState>(page)).gamePhase).not.toBe('awaiting-answer');
  await expect(page.locator('[data-testid="game-answer-region"] button[data-piece-state="pressed"], [data-testid="game-answer-region"] button[data-piece-state="retry"], [data-testid="game-answer-region"] button[data-piece-state="settled"]')).toHaveCount(1);
});
