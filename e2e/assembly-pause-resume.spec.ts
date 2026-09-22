import { expect, test, type Page } from '@playwright/test';
import type { E2EGlobalState } from '../src/shared/services/e2eState';
import type { GamePhase } from '../src/shared/game/gameState';
import { getE2EState } from './support/e2eHook';
import { waitForGamePhase, waitForPaused } from './support/gameHarness';
import { unlockParentGate } from './support/parentGate';
import { seedLocalStorage } from './support/persistenceFixtures';

interface AssemblyE2EState extends E2EGlobalState {
  gameId: 'ASSEMBLY';
  gamePhase: GamePhase;
  paused: boolean;
  correctTileOrder: string[];
}

const ASSEMBLY_JAHODA = { word: 'Jahoda', syllables: 'ja-ho-da', emoji: '🍓', audioKey: 'jahoda' };

function seedSingleAssemblyWord(page: Page): Promise<void> {
  return seedLocalStorage(page, {
    'hrave-ucenie-seeded-sk': 'true',
    'hrave-ucenie-user-words-sk': {
      version: 2,
      items: [{
        id: 'e2e-assembly-pause-resume-jahoda',
        word: ASSEMBLY_JAHODA.word,
        syllables: ASSEMBLY_JAHODA.syllables,
        emoji: ASSEMBLY_JAHODA.emoji,
        audioKey: ASSEMBLY_JAHODA.audioKey,
        status: 'ready',
        enabled: true,
        isDefault: false,
        locale: 'sk',
        order: 0,
      }],
    },
  });
}

test('Skladaj resets a correct full rail when a parent pauses during the final syllable audio', async ({ page }) => {
  await seedSingleAssemblyWord(page);
  await page.goto('/assembly');
  await page.getByRole('button', { name: 'Hrať' }).click();

  const state = await getE2EState<AssemblyE2EState>(page);
  const [first, second, third] = state.correctTileOrder;
  const tray = page.getByTestId('play-tray');
  const rail = page.getByTestId('word-rail');

  await tray.locator(`[data-tile-id="${first}"]`).click();
  await waitForGamePhase(page, 'awaiting-answer');
  await tray.locator(`[data-tile-id="${second}"]`).click();
  await waitForGamePhase(page, 'awaiting-answer');

  // The board changes synchronously, then useGameSession awaits the final syllable clip while
  // the phase is still resolving-answer. Pause in that window: resume currently returns the
  // session to awaiting-answer, so a complete rail would otherwise have no available tray tile.
  await tray.locator(`[data-tile-id="${third}"]`).click();
  await page.waitForFunction(() => window.__E2E__?.gamePhase === 'resolving-answer', undefined, { polling: 20 });
  await expect(rail.locator('[data-slot-state="filled"]')).toHaveCount(3);
  await page.getByRole('button', { name: 'Rodičovská prestávka' }).click();
  await waitForPaused(page, true);

  await unlockParentGate(page);
  await waitForPaused(page, false);
  await waitForGamePhase(page, 'awaiting-answer');

  await expect(rail.locator('[data-slot-state="filled"]')).toHaveCount(0);
  await expect(rail.locator('[data-slot-state="pending"]')).toHaveCount(3);
  await expect(tray.locator('[data-tile-id]')).toHaveCount(3);
});
