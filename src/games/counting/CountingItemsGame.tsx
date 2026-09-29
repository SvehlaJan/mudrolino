/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FailureSpec, NumberItem, PraiseEntry, SuccessSpec } from '../../shared/types';
import type { GameRuntimeProps } from '../../shared/gameRuntime';
import { useContent } from '../../shared/contexts/ContentContext';
import { GameLobby } from '../../shared/components/GameLobby';
import { getSessionCompleteAudioSpec } from '../../shared/components/sessionCompleteAudio';
import { getSuccessOverlayAudioSpec } from '../../shared/components/successOverlayAudio';
import { COUNTING_EMOJIS, getItemAnnouncementAudio, getPhraseClip, getWrongAnswerAudio, TIMING } from '../../shared/contentRegistry';
import { audioManager } from '../../shared/services/audioManager';
import { setE2EState } from '../../shared/services/e2eState';
import { getUiCopy } from '../../shared/uiCopy';
import { fisherYatesShuffle } from '../../shared/utils';
import {
  AnswerGroup,
  GamePrompt,
  GameShell,
  PlayTray,
  QuantityTray,
  TactilePiece,
  useGameSession,
  type GameShellCompletion,
  type GameShellFeedback,
  type GameState,
  type TactilePieceState,
} from '../../shared/game';
import { generateGridItems } from './countingGridLogic';
import { playPopSound } from './countingSfx';

const INSTRUCTION = 'Spočítaj predmety.';
const ANSWER_GROUP_LABEL = 'Vyber počet';
const FALLBACK_PRAISE: PraiseEntry = { emoji: '🌟', text: 'Výborne!', audioKey: 'vyborne' };

interface CountingRound {
  target: NumberItem | null;
  emoji: string;
  options: NumberItem[];
}

function pickPraise(entries: PraiseEntry[]): PraiseEntry {
  return entries[Math.floor(Math.random() * entries.length)] ?? FALLBACK_PRAISE;
}

function getAnswerPieceState(state: GameState, answerId: string): TactilePieceState | undefined {
  if (state.selectedAnswerId !== answerId) return undefined;
  if (state.phase === 'resolving-answer') return 'pressed';
  if (state.phase === 'answered-correctly') return 'settled';
  if (state.phase === 'answered-incorrectly') return 'retry';
  return undefined;
}

function createRound(target: NumberItem | undefined, allNumbers: NumberItem[]): CountingRound {
  if (!target) return { target: null, emoji: '⭐', options: [] };
  const emoji = generateGridItems(1, COUNTING_EMOJIS)[0]?.emoji ?? '⭐';
  const distractors = fisherYatesShuffle(allNumbers.filter(item => item.value !== target.value)).slice(0, 3);
  return { target, emoji, options: fisherYatesShuffle([...distractors, target]) };
}

interface CountingPlayfieldProps {
  availableItems: NumberItem[];
  allNumbers: NumberItem[];
  onExit(): void;
}

function CountingPlayfield({ availableItems, allNumbers, onExit }: CountingPlayfieldProps) {
  const { locale, praiseEntries } = useContent();
  const isEmpty = availableItems.length === 0 || allNumbers.length < 4;
  const [{ round }, setRoundSession] = useState<{ round: CountingRound; queue: NumberItem[] }>(() => {
    const pool = fisherYatesShuffle(availableItems);
    const [target, ...rest] = pool;
    return { round: createRound(target, allNumbers), queue: rest };
  });
  const [completionPraise, setCompletionPraise] = useState(() => pickPraise(praiseEntries));
  const [roundPraise, setRoundPraise] = useState<PraiseEntry | null>(null);
  const { target, emoji, options } = round;

  const startNewRound = useCallback(() => {
    setRoundSession((previous) => {
      const pool = previous.queue.length > 0 ? previous.queue : fisherYatesShuffle(availableItems);
      const [nextTarget, ...rest] = pool;
      return { round: createRound(nextTarget, allNumbers), queue: rest };
    });
  }, [availableItems, allNumbers]);

  const startNewSession = useCallback(() => {
    setCompletionPraise(pickPraise(praiseEntries));
    const pool = fisherYatesShuffle(availableItems);
    const [nextTarget, ...rest] = pool;
    setRoundSession({ round: createRound(nextTarget, allNumbers), queue: rest });
  }, [allNumbers, availableItems, praiseEntries]);

  const session = useGameSession({ maxRounds: 5, maxAttempts: 3, onNextRound: startNewRound, onPlayAgain: startNewSession });
  const { state, canAnswer, replaying, startPrompt, replayPrompt, resolveAnswer, continueAfterFeedback, playAgain, fail } = session;

  useEffect(() => {
    if (isEmpty) fail(getUiCopy(locale, 'game.error.emptyPool'));
  }, [fail, isEmpty, locale]);

  useEffect(() => {
    setE2EState({
      gameId: 'COUNTING_ITEMS',
      phase: state.phase,
      gamePhase: state.phase,
      paused: state.paused,
      correctItemId: target ? String(target.value) : null,
      optionValues: options.map(option => option.value),
      wrongAttempts: state.wrongAttempts,
      roundsPlayed: state.roundsPlayed,
      replaying,
      overlay: state.phase === 'session-complete' ? 'session-complete' : state.feedback === 'success' ? 'success' : state.feedback === 'failure' ? 'failure' : null,
    });
  }, [options, replaying, state, target]);

  const phaseRef = useRef(state.phase);
  useEffect(() => { phaseRef.current = state.phase; }, [state.phase]);
  useEffect(() => {
    if (!target || isEmpty) return;
    const timer = setTimeout(() => {
      if (phaseRef.current === 'ready') void startPrompt({ clips: [getPhraseClip(locale, 'countItems')] });
    }, TIMING.AUDIO_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isEmpty, locale, startPrompt, target]);
  useEffect(() => {
    if (state.phase !== 'session-complete' || state.paused) return;
    void audioManager.play(getSessionCompleteAudioSpec(locale, completionPraise));
    return () => audioManager.stop();
  }, [completionPraise, locale, state.paused, state.phase]);

  const handleReplay = useCallback(() => {
    if (target) void replayPrompt({ clips: [getPhraseClip(locale, 'countItems')] });
  }, [locale, replayPrompt, target]);

  const answerLockRef = useRef(false);
  const chooseAnswer = useCallback(async (item: NumberItem) => {
    if (!target || !canAnswer || answerLockRef.current) return;
    answerLockRef.current = true;
    try {
      const answerId = String(item.value);
      if (item.value === target.value) {
        const praise = pickPraise(praiseEntries);
        setRoundPraise(praise);
        const successSpec: SuccessSpec = { echoLine: `Správne, je ich ${target.value} ⭐` };
        await resolveAnswer({ answerId, outcome: 'correct', selectionAudio: getItemAnnouncementAudio(locale, 'numbers', item.audioKey, String(item.value)), verdictAudio: getSuccessOverlayAudioSpec(locale, praise, successSpec) });
        return;
      }
      const exhausted = state.maxAttempts !== null && state.wrongAttempts + 1 >= state.maxAttempts;
      const failureSpec: FailureSpec = {
        echoLine: `${target.value} ⭐`,
        audioSpec: { clips: [getPhraseClip(locale, 'neverMind'), getPhraseClip(locale, 'itIs'), { path: `${locale}/numbers/${target.audioKey}`, fallbackText: String(target.value) }] },
      };
      await resolveAnswer({ answerId, outcome: 'wrong', selectionAudio: getWrongAnswerAudio(locale, 'numbers', item.audioKey, String(item.value)), verdictAudio: exhausted ? failureSpec.audioSpec : undefined });
    } finally {
      answerLockRef.current = false;
    }
  }, [canAnswer, locale, praiseEntries, resolveAnswer, state.maxAttempts, state.wrongAttempts, target]);

  const feedback: GameShellFeedback | null = state.feedback === 'success'
    ? {
        kind: 'success',
        title: roundPraise?.text ?? getUiCopy(locale, 'game.successTitle'),
        detail: target ? `Správne, je ich ${target.value} ⭐` : undefined,
        emoji: roundPraise?.emoji,
        onContinue: continueAfterFeedback,
      }
    : state.feedback === 'failure'
    ? {
        kind: 'failure',
        title: getUiCopy(locale, 'game.failureTitle'),
        detail: target ? `${target.value} ⭐` : getUiCopy(locale, 'game.failure.detail'),
        onContinue: continueAfterFeedback,
      }
    : state.phase === 'answered-incorrectly' || (state.phase === 'awaiting-answer' && state.wrongAttempts > 0)
    ? { kind: 'retry', title: getUiCopy(locale, 'game.retryPrompt'), detail: getUiCopy(locale, 'game.retry.detail') }
    : null;
  const completion: GameShellCompletion = { praise: completionPraise, correctRounds: state.correctRounds, totalTaps: state.totalTaps, maxRounds: state.maxRounds, onPlayAgain: playAgain, onHome: onExit };

  return (
    <GameShell gameId="COUNTING_ITEMS" state={state} onBack={onExit} onRetryError={() => { if (!isEmpty) playAgain(); }} prompt={<GamePrompt instruction={INSTRUCTION} replaying={replaying} onReplay={handleReplay} />} feedback={feedback} completion={completion}>
      <div className="flex min-h-0 flex-1 flex-col gap-2 [@media(max-height:480px)]:gap-1">
        <QuantityTray count={target?.value ?? 0} emoji={emoji} mode="objects" label="Predmety na spočítanie" interactiveTokens onTokenPress={() => playPopSound()} className="h-[min(30vh,156px)] min-h-[108px] shrink-0 rounded-[28px] border border-dashed border-shadow/25 bg-white/50 p-1" />
        <PlayTray label={getUiCopy(locale, 'game.playArea')} density="compact" className="min-h-[72px] [@media(max-height:480px)]:min-h-[60px]">
          <AnswerGroup label={ANSWER_GROUP_LABEL} disabled={!canAnswer} orientation="horizontal">
            {options.map((item) => (
              <TactilePiece key={item.value} as="button" material="wood" label={String(item.value)} data-answer-id={String(item.value)} state={getAnswerPieceState(state, String(item.value))} onPress={() => void chooseAnswer(item)}>
                <span className="font-spline text-[clamp(1.5rem,calc(var(--tile-size)*0.55),4rem)] leading-none">{item.value}</span>
              </TactilePiece>
            ))}
          </AnswerGroup>
        </PlayTray>
      </div>
    </GameShell>
  );
}

export function CountingItemsGame({ settings, onExit, onOpenSettings }: GameRuntimeProps) {
  const { numberItems } = useContent();
  const [playing, setPlaying] = useState(false);
  const availableItems = useMemo(() => numberItems.filter(item => item.value >= settings.countingRange.start && item.value <= settings.countingRange.end), [numberItems, settings.countingRange]);
  const allNumbers = useMemo(() => numberItems.filter(item => item.value <= Math.max(settings.countingRange.end, 10)), [numberItems, settings.countingRange.end]);
  if (playing) return <CountingPlayfield availableItems={availableItems} allNumbers={allNumbers} onExit={() => setPlaying(false)} />;
  return <GameLobby gameId="COUNTING_ITEMS" onPlay={() => setPlaying(true)} onBack={onExit} onOpenSettings={onOpenSettings} />;
}
