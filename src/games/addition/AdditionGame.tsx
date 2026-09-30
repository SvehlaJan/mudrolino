/** @license SPDX-License-Identifier: Apache-2.0 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { FailureSpec, NumberItem, PraiseEntry, SuccessSpec } from '../../shared/types';
import type { GameRuntimeProps } from '../../shared/gameRuntime';
import { useContent } from '../../shared/contexts/ContentContext';
import { GameLobby } from '../../shared/components/GameLobby';
import { getSessionCompleteAudioSpec } from '../../shared/components/sessionCompleteAudio';
import { getSuccessOverlayAudioSpec } from '../../shared/components/successOverlayAudio';
import { COUNTING_EMOJIS, getItemAnnouncementAudio, getPhraseClip, getWrongAnswerAudio, TIMING } from '../../shared/contentRegistry';
import { audioManager } from '../../shared/services/audioManager';
import { setE2EState } from '../../shared/services/e2eState';
import { additionRangeForcesNumerals } from '../../shared/settings/settingsRegistry';
import { getUiCopy } from '../../shared/uiCopy';
import { AnswerGroup, GamePrompt, GameShell, PlayTray, QuantityTray, TactilePiece, useGameSession, type GameShellCompletion, type GameShellFeedback, type GameState, type TactilePieceState } from '../../shared/game';
import { buildAnswerOptions, createAdditionProblem, pairKey } from './additionLogic';

const MAX_ROUNDS = 5;
const MAX_ATTEMPTS = 3;
const OPTION_COUNT = 4;
const INSTRUCTION = 'Koľko je spolu?';
const ANSWER_GROUP_LABEL = 'Vyber súčet';
const FALLBACK_PRAISE: PraiseEntry = { emoji: '🌟', text: 'Výborne!', audioKey: 'vyborne' };

interface AdditionRound { a: NumberItem; b: NumberItem; sum: NumberItem; options: NumberItem[]; emoji: string; }

function pickPraise(entries: PraiseEntry[]): PraiseEntry {
  return entries[Math.floor(Math.random() * entries.length)] ?? FALLBACK_PRAISE;
}

function formatAddition(locale: string, a: number, b: number, sum: number): string {
  return locale === 'cs' ? `${a} a ${b} je dohromady ${sum}` : `${a} a ${b} je dokopy ${sum}`;
}

function getAdditionAudioClip(locale: string, a: number, b: number, sum: number) {
  const fallbackText = formatAddition(locale, a, b, sum);
  const audioKey = locale === 'cs' ? `${a}-a-${b}-je-dohromady-${sum}` : `${a}-a-${b}-je-dokopy-${sum}`;
  return { path: `${locale}/addition/${audioKey}`, fallbackText };
}

function getSuccessSpec(locale: string, round: AdditionRound): SuccessSpec {
  return { echoLine: formatAddition(locale, round.a.value, round.b.value, round.sum.value), audioSpec: { clips: [getAdditionAudioClip(locale, round.a.value, round.b.value, round.sum.value)] } };
}

function getFailureSpec(locale: string, round: AdditionRound): FailureSpec {
  return { echoLine: formatAddition(locale, round.a.value, round.b.value, round.sum.value), audioSpec: { clips: [getPhraseClip(locale, 'neverMind'), getAdditionAudioClip(locale, round.a.value, round.b.value, round.sum.value)] } };
}

function getAnswerPieceState(state: GameState, answerId: string): TactilePieceState | undefined {
  if (state.selectedAnswerId !== answerId) return undefined;
  if (state.phase === 'resolving-answer') return 'pressed';
  if (state.phase === 'answered-correctly') return 'settled';
  if (state.phase === 'answered-incorrectly') return 'retry';
  return undefined;
}

function createRound(sumRange: 5 | 10 | 20 | 100, lastPairKeyRef: React.MutableRefObject<string | null>): AdditionRound {
  let problem = createAdditionProblem(sumRange);
  for (let attempt = 0; attempt < 10 && pairKey(problem.a.value, problem.b.value) === lastPairKeyRef.current; attempt += 1) problem = createAdditionProblem(sumRange);
  lastPairKeyRef.current = pairKey(problem.a.value, problem.b.value);
  return { ...problem, options: buildAnswerOptions(problem.sum, sumRange, OPTION_COUNT), emoji: COUNTING_EMOJIS[Math.floor(Math.random() * COUNTING_EMOJIS.length)] };
}

interface AdditionPlayfieldProps { sumRange: 5 | 10 | 20 | 100; representation: 'objects' | 'numerals'; onExit(): void; }

function AdditionPlayfield({ sumRange, representation, onExit }: AdditionPlayfieldProps) {
  const { locale, praiseEntries } = useContent();
  const effectiveRepresentation = additionRangeForcesNumerals(sumRange) ? 'numerals' : representation;
  const lastPairKeyRef = useRef<string | null>(null);
  const [round, setRound] = useState<AdditionRound>(() => createRound(sumRange, lastPairKeyRef));
  const [roundPraise, setRoundPraise] = useState<PraiseEntry | null>(null);
  const [completionPraise, setCompletionPraise] = useState(() => pickPraise(praiseEntries));
  const startNewRound = useCallback(() => { setRound(createRound(sumRange, lastPairKeyRef)); setRoundPraise(null); }, [sumRange]);
  const startNewSession = useCallback(() => { lastPairKeyRef.current = null; setCompletionPraise(pickPraise(praiseEntries)); startNewRound(); }, [praiseEntries, startNewRound]);
  const { state, canAnswer, replaying, startPrompt, replayPrompt, resolveAnswer, continueAfterFeedback, playAgain } = useGameSession({ maxRounds: MAX_ROUNDS, maxAttempts: MAX_ATTEMPTS, onNextRound: startNewRound, onPlayAgain: startNewSession });

  const phaseRef = useRef(state.phase);
  useEffect(() => { phaseRef.current = state.phase; }, [state.phase]);
  useEffect(() => {
    const timer = setTimeout(() => { if (phaseRef.current === 'ready') void startPrompt({ clips: [getPhraseClip(locale, 'howManyTogether')] }); }, TIMING.AUDIO_DELAY_MS);
    return () => clearTimeout(timer);
  }, [locale, round, startPrompt]);
  useEffect(() => {
    if (state.phase !== 'session-complete' || state.paused) return;
    void audioManager.play(getSessionCompleteAudioSpec(locale, completionPraise));
    return () => audioManager.stop();
  }, [completionPraise, locale, state.paused, state.phase]);
  useEffect(() => {
    setE2EState({ gameId: 'ADDITION', phase: state.phase, gamePhase: state.phase, paused: state.paused, overlay: state.phase === 'session-complete' ? 'session-complete' : state.feedback === 'success' ? 'success' : state.feedback === 'failure' ? 'failure' : null, correctSum: round.sum.value, optionValues: round.options.map(option => option.value), roundsPlayed: state.roundsPlayed, totalTaps: state.totalTaps });
  }, [round, state]);

  const answerLockRef = useRef(false);
  const chooseAnswer = useCallback(async (option: NumberItem) => {
    if (!canAnswer || answerLockRef.current) return;
    answerLockRef.current = true;
    try {
      const answerId = String(option.value);
      if (option.value === round.sum.value) {
        const praise = pickPraise(praiseEntries);
        setRoundPraise(praise);
        await resolveAnswer({ answerId, outcome: 'correct', selectionAudio: getItemAnnouncementAudio(locale, 'numbers', option.audioKey, String(option.value)), verdictAudio: getSuccessOverlayAudioSpec(locale, praise, getSuccessSpec(locale, round)) });
        return;
      }
      const exhausted = state.maxAttempts !== null && state.wrongAttempts + 1 >= state.maxAttempts;
      await resolveAnswer({ answerId, outcome: 'wrong', selectionAudio: getWrongAnswerAudio(locale, 'numbers', option.audioKey, String(option.value)), verdictAudio: exhausted ? getFailureSpec(locale, round).audioSpec : undefined });
    } finally { answerLockRef.current = false; }
  }, [canAnswer, locale, praiseEntries, resolveAnswer, round, state.maxAttempts, state.wrongAttempts]);
  const handleReplay = useCallback(() => { void replayPrompt({ clips: [getPhraseClip(locale, 'howManyTogether')] }); }, [locale, replayPrompt]);
  const feedback: GameShellFeedback | null = state.feedback === 'success'
    ? { kind: 'success', title: roundPraise?.text ?? getUiCopy(locale, 'game.successTitle'), detail: getSuccessSpec(locale, round).echoLine, emoji: roundPraise?.emoji, onContinue: continueAfterFeedback }
    : state.feedback === 'failure'
    ? { kind: 'failure', title: getUiCopy(locale, 'game.failureTitle'), detail: getFailureSpec(locale, round).echoLine, onContinue: continueAfterFeedback }
    : state.phase === 'answered-incorrectly' || (state.phase === 'awaiting-answer' && state.wrongAttempts > 0)
    ? { kind: 'retry', title: getUiCopy(locale, 'game.retryPrompt'), detail: getUiCopy(locale, 'game.retry.detail') }
    : null;
  const completion: GameShellCompletion = { praise: completionPraise, correctRounds: state.correctRounds, totalTaps: state.totalTaps, maxRounds: state.maxRounds, onPlayAgain: playAgain, onHome: onExit };
  const equationLabel = `${round.a.value} plus ${round.b.value} sa rovná koľko?`;

  return (
    <GameShell gameId="ADDITION" state={state} onBack={onExit} prompt={<GamePrompt instruction={INSTRUCTION} replaying={replaying} onReplay={handleReplay} />} feedback={feedback} completion={completion}>
      <div className="flex min-h-0 flex-1 flex-col gap-2 [@media(max-height:480px)]:gap-1">
        <section data-testid="addition-equation" aria-label={equationLabel} className="flex h-[min(29vh,168px)] min-h-[92px] shrink-0 items-stretch justify-center gap-2 rounded-[28px] border border-shadow/15 bg-bg-light/35 p-2 [@media(max-height:480px)]:min-h-[76px] [@media(max-height:480px)]:p-1">
          <QuantityTray count={round.a.value} emoji={round.emoji} mode={effectiveRepresentation} label={`Prvý sčítanec: ${round.a.value} predmetov`} className="min-w-0 flex-1 rounded-2xl bg-white/60" />
          <span data-testid="addition-plus" aria-hidden="true" className="grid shrink-0 place-items-center font-spline text-3xl font-black text-text-main/60 sm:text-5xl">+</span>
          <QuantityTray count={round.b.value} emoji={round.emoji} mode={effectiveRepresentation} label={`Druhý sčítanec: ${round.b.value} predmetov`} className="min-w-0 flex-1 rounded-2xl bg-white/60" />
        </section>
        <PlayTray label="Odpovede" density="compact" sizing="content">
          <AnswerGroup label={ANSWER_GROUP_LABEL} disabled={!canAnswer} orientation="horizontal" choiceLayout="tiles">
            {round.options.map(option => {
              const answerId = String(option.value);
              return <TactilePiece key={answerId} as="button" material="wood" label={answerId} data-answer-id={answerId} state={getAnswerPieceState(state, answerId)} onPress={() => void chooseAnswer(option)}><span className="font-spline text-[clamp(1.5rem,calc(var(--tile-size)*0.55),4rem)] leading-none">{option.value}</span></TactilePiece>;
            })}
          </AnswerGroup>
        </PlayTray>
      </div>
    </GameShell>
  );
}

export function AdditionGame({ settings, onExit, onOpenSettings }: GameRuntimeProps) {
  const [playing, setPlaying] = useState(false);
  if (!playing) return <GameLobby gameId="ADDITION" onPlay={() => setPlaying(true)} onBack={onExit} onOpenSettings={onOpenSettings} />;
  return <AdditionPlayfield sumRange={settings.additionSumRange} representation={settings.additionRepresentation} onExit={() => setPlaying(false)} />;
}
