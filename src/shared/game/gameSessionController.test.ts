import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createGameSessionController } from './gameSessionController';
import type { AudioSpec } from '../types';

const audio = (path: string): AudioSpec => ({ clips: [{ path, fallbackText: path }] });
const selectionAudio = audio('item');
const verdictAudio = audio('praise');
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
}
function setup(options: { maxRounds?: number; maxAttempts?: number | null } = {}) {
  const pending: ReturnType<typeof deferred>[] = [];
  const played: string[] = [];
  const stop = vi.fn();
  const onNextRound = vi.fn();
  const onPlayAgain = vi.fn();
  const controller = createGameSessionController({ ...options, onNextRound, onPlayAgain }, {
    audio: { stop, play: spec => { played.push(spec.clips[0].path); const next = deferred(); pending.push(next); return next.promise; } },
    clock: { setTimeout: (callback, ms) => setTimeout(callback, ms), clearTimeout: timer => clearTimeout(timer) },
    retryDelayMs: 500,
  });
  return { controller, pending, played, stop, onNextRound, onPlayAgain };
}
const correct = { answerId: 'a', outcome: 'correct' as const, selectionAudio, verdictAudio };
const wrong = { ...correct, outcome: 'wrong' as const };
async function finishSelection(pending: ReturnType<typeof deferred>[]) {
  pending[0].resolve();
  await Promise.resolve();
}

describe('game session controller', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('locks double taps synchronously and plays the item before the verdict', async () => {
    const { controller, pending, played } = setup();
    const result = controller.resolveAnswer(correct);
    expect(controller.getSnapshot().canAnswer).toBe(false);
    expect(await controller.resolveAnswer(wrong)).toBe('cancelled');
    expect(played).toEqual(['item']);
    await finishSelection(pending);
    expect(played).toEqual(['item', 'praise']);
    pending[1].resolve();
    expect(await result).toBe('success');
    expect(controller.getSnapshot().state).toMatchObject({ totalTaps: 1, correctRounds: 1, roundsPlayed: 1 });
  });

  it('locks input and waits for placement after item audio before showing success or playing praise', async () => {
    const { controller, pending, played } = setup();
    const landing = deferred();
    const beforeOutcome = vi.fn(async () => { await landing.promise; return true; });
    const result = controller.resolveAnswer({ ...correct, beforeOutcome });
    await finishSelection(pending);
    expect(controller.getSnapshot()).toMatchObject({ canAnswer: false, state: { phase: 'resolving-answer', feedback: null } });
    expect(played).toEqual(['item']);
    expect(beforeOutcome).toHaveBeenCalledOnce();
    landing.resolve();
    await vi.advanceTimersByTimeAsync(0);
    expect(played).toEqual(['item', 'praise']);
    pending[1].resolve();
    expect(await result).toBe('success');
  });

  it('a cancelled placement restores an answerable question without recording success or praise', async () => {
    const { controller, pending, played } = setup();
    const result = controller.resolveAnswer({ ...correct, beforeOutcome: async () => false });
    pending[0].resolve();
    expect(await result).toBe('cancelled');
    expect(controller.getSnapshot()).toMatchObject({ canAnswer: true, state: { phase: 'awaiting-answer', feedback: null, totalTaps: 0 } });
    expect(played).toEqual(['item']);
  });

  it.each(['pause', 'replay', 'exit'] as const)('invalidates placement completion after %s', async (interruption) => {
    const { controller, pending, played } = setup();
    const landing = deferred();
    const result = controller.resolveAnswer({ ...correct, beforeOutcome: async () => { await landing.promise; return true; } });
    await finishSelection(pending);
    if (interruption === 'pause') { controller.pause(); controller.resume(); }
    if (interruption === 'replay') void controller.replayPrompt(audio('replay'));
    if (interruption === 'exit') controller.dispose();
    landing.resolve();
    expect(await result).toBe('cancelled');
    expect(controller.getSnapshot().state.feedback).toBeNull();
    expect(played).not.toContain('praise');
    if (interruption === 'pause') expect(controller.getSnapshot().canAnswer).toBe(true);
    if (interruption === 'replay') {
      pending[1].resolve();
      await vi.advanceTimersByTimeAsync(0);
      expect(controller.getSnapshot().canAnswer).toBe(true);
    }
  });

  it('starts the 1000ms advance only after verdict playback finishes', async () => {
    const { controller, pending, onNextRound } = setup();
    const result = controller.resolveAnswer(correct);
    await finishSelection(pending);
    await vi.advanceTimersByTimeAsync(5000);
    expect(onNextRound).not.toHaveBeenCalled();
    pending[1].resolve();
    await result;
    await vi.advanceTimersByTimeAsync(999);
    expect(onNextRound).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(onNextRound).toHaveBeenCalledOnce();
    expect(controller.getSnapshot().state.phase).toBe('ready');
  });

  it('returns partial progress without verdict or an advance and supports uncounted taps', async () => {
    const { controller, pending, played, onNextRound } = setup();
    const result = controller.resolveAnswer({ ...correct, outcome: 'progress', countTap: false });
    pending[0].resolve();
    expect(await result).toBe('progress');
    expect(played).toEqual(['item']);
    expect(controller.getSnapshot()).toMatchObject({ canAnswer: true, state: { totalTaps: 0, roundsPlayed: 0 } });
    await vi.runAllTimersAsync();
    expect(onNextRound).not.toHaveBeenCalled();
  });

  it('retries without a terminal verdict, then exhausts max attempts', async () => {
    const { controller, pending, played } = setup({ maxAttempts: 2 });
    const retry = controller.resolveAnswer(wrong);
    pending[0].resolve();
    expect(await retry).toBe('retry');
    expect(played).toEqual(['item']);
    await vi.advanceTimersByTimeAsync(499);
    expect(controller.getSnapshot().canAnswer).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(controller.getSnapshot().canAnswer).toBe(true);
    const failure = controller.resolveAnswer(wrong);
    pending[1].resolve();
    await Promise.resolve();
    pending[2].resolve();
    expect(await failure).toBe('failure');
    expect(controller.getSnapshot().state).toMatchObject({ feedback: 'failure', wrongAttempts: 2, roundsPlayed: 1 });
  });

  it('allows unlimited attempts without advancing rounds', async () => {
    const { controller, pending } = setup({ maxAttempts: null });
    for (let i = 0; i < 4; i++) {
      const result = controller.resolveAnswer(wrong);
      pending[i].resolve();
      expect(await result).toBe('retry');
      await vi.advanceTimersByTimeAsync(500);
    }
    expect(controller.getSnapshot().state).toMatchObject({ wrongAttempts: 4, roundsPlayed: 0 });
  });

  it.each(['correct', 'wrong'] as const)('completes the terminal %s round after its verdict', async outcome => {
    const { controller, pending, onNextRound } = setup({ maxRounds: 1, maxAttempts: 1 });
    const result = controller.resolveAnswer({ ...correct, outcome });
    await finishSelection(pending);
    expect(controller.getSnapshot().state.phase).not.toBe('session-complete');
    pending[1].resolve();
    await result;
    expect(controller.getSnapshot().state.phase).toBe('session-complete');
    controller.continueAfterFeedback();
    await vi.runAllTimersAsync();
    expect(onNextRound).not.toHaveBeenCalled();
  });

  it('ignores stale prompts when an answer interrupts listening', async () => {
    const { controller, pending } = setup();
    const prompt = controller.replayPrompt(audio('prompt'));
    expect(controller.getSnapshot().replaying).toBe(true);
    const answer = controller.resolveAnswer({ ...correct, outcome: 'progress' });
    pending[0].resolve();
    await prompt;
    expect(controller.getSnapshot()).toMatchObject({ replaying: false, state: { phase: 'resolving-answer' } });
    pending[1].resolve();
    await answer;
  });

  it('recovers a cancelled selection on resume without counting it', async () => {
    const { controller, pending } = setup();
    const result = controller.resolveAnswer(correct);
    controller.pause();
    controller.pause();
    controller.resume();
    pending[0].resolve();
    expect(await result).toBe('cancelled');
    expect(controller.getSnapshot()).toMatchObject({ canAnswer: true, state: { totalTaps: 0, roundsPlayed: 0 } });
  });

  it('reschedules a retry interrupted by pause', async () => {
    const { controller, pending } = setup();
    const result = controller.resolveAnswer(wrong);
    pending[0].resolve();
    await result;
    controller.pause();
    await vi.advanceTimersByTimeAsync(1000);
    expect(controller.getSnapshot().state.paused).toBe(true);
    controller.resume();
    await vi.advanceTimersByTimeAsync(500);
    expect(controller.getSnapshot().canAnswer).toBe(true);
  });

  it('reschedules an advance interrupted by pause after the verdict', async () => {
    const { controller, pending, onNextRound } = setup();
    const result = controller.resolveAnswer(correct);
    await finishSelection(pending);
    pending[1].resolve();
    await result;
    controller.pause();
    await vi.advanceTimersByTimeAsync(2000);
    controller.resume();
    await vi.advanceTimersByTimeAsync(999);
    expect(onNextRound).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(onNextRound).toHaveBeenCalledOnce();
  });

  it('leaves manual continue available when pausing during verdict playback', async () => {
    const { controller, pending, onNextRound } = setup();
    const result = controller.resolveAnswer(correct);
    await finishSelection(pending);
    controller.pause();
    controller.resume();
    pending[1].resolve();
    expect(await result).toBe('cancelled');
    await vi.advanceTimersByTimeAsync(2000);
    expect(onNextRound).not.toHaveBeenCalled();
    controller.continueAfterFeedback();
    expect(onNextRound).toHaveBeenCalledOnce();
  });

  it.each(['correct', 'wrong'] as const)('completes a terminal %s verdict interrupted by pause on resume', async outcome => {
    const { controller, pending } = setup({ maxRounds: 1, maxAttempts: 1 });
    const result = controller.resolveAnswer({ ...correct, outcome });
    await finishSelection(pending);
    controller.pause();
    expect(controller.getSnapshot().state.phase).not.toBe('session-complete');
    controller.resume();
    expect(controller.getSnapshot().state.phase).toBe('session-complete');
    pending[1].resolve();
    expect(await result).toBe('cancelled');
  });

  it('clears a pending advance on disposal', async () => {
    const { controller, pending, onNextRound } = setup();
    const result = controller.resolveAnswer(correct);
    await finishSelection(pending);
    pending[1].resolve();
    await result;
    expect(vi.getTimerCount()).toBe(1);
    controller.dispose();
    expect(vi.getTimerCount()).toBe(0);
    await vi.runAllTimersAsync();
    expect(onNextRound).not.toHaveBeenCalled();
  });

  it('cancels timers and stale promises on disposal', async () => {
    const { controller, pending, stop, onNextRound } = setup();
    const result = controller.resolveAnswer(correct);
    controller.dispose();
    pending[0].resolve();
    expect(await result).toBe('cancelled');
    expect(await controller.resolveAnswer(correct)).toBe('cancelled');
    await vi.runAllTimersAsync();
    expect(stop).toHaveBeenCalled();
    expect(onNextRound).not.toHaveBeenCalled();
  });

  it('publishes stable snapshots and supports the Strict Mode subscription cleanup cycle', async () => {
    const { controller, pending } = setup();
    const listener = vi.fn();
    const unsubscribe = controller.subscribe(listener);
    expect(controller.getSnapshot()).toBe(controller.getSnapshot());
    const oldPrompt = controller.startPrompt(audio('old'));
    unsubscribe();
    const resubscribe = controller.subscribe(listener);
    const prompt = controller.startPrompt(audio('fresh'));
    pending[0].resolve();
    await oldPrompt;
    expect(controller.getSnapshot().state.phase).toBe('listening');
    pending[1].resolve();
    await prompt;
    expect(controller.getSnapshot().canAnswer).toBe(true);
    expect(listener).toHaveBeenCalled();
    resubscribe();
  });

  it('uses fresh callbacks after an options update and resets on play again', async () => {
    const { controller, pending, onNextRound, onPlayAgain } = setup();
    const freshNext = vi.fn();
    const freshAgain = vi.fn();
    controller.updateOptions({ onNextRound: freshNext, onPlayAgain: freshAgain });
    const result = controller.resolveAnswer(correct);
    await finishSelection(pending);
    pending[1].resolve();
    await result;
    controller.continueAfterFeedback();
    expect(freshNext).toHaveBeenCalledOnce();
    expect(onNextRound).not.toHaveBeenCalled();
    controller.playAgain();
    expect(freshAgain).toHaveBeenCalledOnce();
    expect(onPlayAgain).not.toHaveBeenCalled();
    expect(controller.getSnapshot().state).toMatchObject({ phase: 'ready', totalTaps: 0, correctRounds: 0 });
  });

  it('never starts an opening prompt over a same-tick answer', async () => {
    const { controller, pending, played } = setup();
    const answer = controller.resolveAnswer({ ...correct, outcome: 'progress' });
    await controller.startOpeningPrompt(audio('opening'));
    expect(played).toEqual(['item']);
    pending[0].resolve();
    expect(await answer).toBe('progress');
  });

  it('invalidates pending playback when entering a recoverable error', async () => {
    const { controller, pending } = setup();
    const prompt = controller.startPrompt(audio('prompt'));
    controller.fail('empty pool');
    pending[0].resolve();
    await prompt;
    expect(controller.getSnapshot().state).toMatchObject({ phase: 'recoverable-error', errorMessage: 'empty pool' });
  });
});
