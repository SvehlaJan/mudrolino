import { expect, test } from './support/fixtures';
import { getE2EState } from './support/e2eHook';
import { stubSpeechSynthesis } from './support/gameHarness';
import { DOUBLE_TAP_GAMES, DOUBLE_TAP_PRAISES, seedTwoPraises, stubAlternatingRandom, waitForPlaySurfaceSettled, GenericChoiceState } from './support/literacyHarness';
import { clearAudioEvents, getAudioClipPaths } from './support/gameHarness';
for (const game of DOUBLE_TAP_GAMES) {
  test(`${game.name}: a same-tick double tap on the correct answer cannot desync the shown praise from the spoken one`, async ({ page }) => {
    // The seeded praises have no recorded mp3, so their clips always reach the TTS fallback; this
    // test is about which praise was chosen, not about the synthesizer.
    await stubSpeechSynthesis(page);
    await stubAlternatingRandom(page);
    await seedTwoPraises(page);
    await game.seed?.(page);
    await page.goto(game.path);
    await page.getByRole('button', { name: 'Hrať' }).click();
    await waitForPlaySurfaceSettled(page);

    const state = await getE2EState<GenericChoiceState>(page);
    expect(state.correctItemId).not.toBeNull();
    await clearAudioEvents(page);

    // Both clicks are dispatched inside one task, so the second handler runs before the first has
    // resumed from its first await — the window a React-state-derived `canAnswer` cannot close
    // and only a synchronous ref guard can.
    await page
      .locator(`[data-answer-id=${JSON.stringify(state.correctItemId!)}]:visible`)
      .evaluate((el) => {
        (el as HTMLElement).click();
        (el as HTMLElement).click();
      });

    // The success overlay only mounts once the verdict (praise) audio has finished, so this also
    // guarantees the praise clip is already recorded by the time the events are read.
    await expect(page.getByRole('button', { name: 'Pokračovať' })).toBeVisible();

    const praiseClips = (await getAudioClipPaths(page)).filter((path) => path.startsWith('sk/praise/'));
    expect(praiseClips, `expected exactly one praise clip, got ${JSON.stringify(praiseClips)}`).toHaveLength(1);

    const spoken = DOUBLE_TAP_PRAISES.find((praise) => praiseClips[0] === `sk/praise/${praise.audioKey}`);
    expect(spoken, `unrecognised praise clip ${praiseClips[0]}`).toBeDefined();
    const other = DOUBLE_TAP_PRAISES.find((praise) => praise !== spoken)!;

    // The praise the child sees must be the praise the child heard.
    await expect(page.getByText(spoken!.text, { exact: true })).toBeVisible();
    await expect(page.getByText(other.text, { exact: true })).toHaveCount(0);

    const finalState = await getE2EState<GenericChoiceState>(page);
    expect(finalState.roundsPlayed, 'the doubled tap must still count as exactly one round').toBe(1);
  });
}
