/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AudioClip, NumberItem, PraiseEntry, SuccessSpec } from '../../shared/types';
import type { GameRuntimeProps } from '../../shared/gameRuntime';
import { useContent } from '../../shared/contexts/ContentContext';
import { GameLobby } from '../../shared/components/GameLobby';
import { getSuccessOverlayAudioSpec } from '../../shared/components/successOverlayAudio';
import { getSessionCompleteAudioSpec } from '../../shared/components/sessionCompleteAudio';
import { TIMING, COUNTING_EMOJIS, getItemAnnouncementAudio, getPhraseClip, getWrongAnswerAudio } from '../../shared/contentRegistry';
import { audioManager } from '../../shared/services/audioManager';
import { setE2EState } from '../../shared/services/e2eState';
import { getUiCopy } from '../../shared/uiCopy';
import {
  BalancePlayfield,
  GamePrompt,
  GameShell,
  QuantityTray,
  useGameSession,
  type GameShellCompletion,
  type GameShellFeedback,
  type GameState,
} from '../../shared/game';
import {
  createComparisonRound,
  formatComparison,
  pairKey,
  type ComparisonRound,
  type ComparisonSide,
} from './compareLogic';

const MAX_ROUNDS = 5;
const RETRY_TITLE = 'Skús druhú skupinu.';
const FALLBACK_PRAISE: PraiseEntry = { emoji: '🌟', text: 'Výborne!', audioKey: 'vyborne' };

interface RoundState extends ComparisonRound {
  emoji: string;
}

function pickPraise(praiseEntries: PraiseEntry[]): PraiseEntry {
  return praiseEntries[Math.floor(Math.random() * praiseEntries.length)] ?? FALLBACK_PRAISE;
}

function getComparisonAudioClip(locale: string, larger: number, smaller: number): AudioClip {
  const fallbackText = formatComparison(locale, larger, smaller);
  const audioKey = locale === 'cs'
    ? `${larger}-je-vice-nez-${smaller}`
    : `${larger}-je-viac-ako-${smaller}`;
  return { path: `${locale}/compare/${audioKey}`, fallbackText };
}

function getPieceState(state: GameState, side: ComparisonSide) {
  if (state.selectedAnswerId !== side) return undefined;
  if (state.phase === 'resolving-answer') return 'pressed' as const;
  if (state.phase === 'answered-correctly') return 'settled' as const;
  if (state.phase === 'answered-incorrectly') return 'retry' as const;
  return undefined;
}

interface ComparePlayfieldProps {
  availableItems: NumberItem[];
  mode: 'objects' | 'numerals';
  onExit(): void;
}

function ComparePlayfield({ availableItems, mode, onExit }: ComparePlayfieldProps) {
  const { locale, praiseEntries } = useContent();
  const isEmpty = availableItems.length < 2;
  const lastPairKeyRef = useRef<string | null>(null);
  const [round, setRound] = useState<RoundState | null>(() => {
    if (availableItems.length < 2) return null;
    const comparison = createComparisonRound(availableItems);
    return { ...comparison, emoji: COUNTING_EMOJIS[Math.floor(Math.random() * COUNTING_EMOJIS.length)] };
  });
  const [roundPraise, setRoundPraise] = useState<PraiseEntry | null>(null);
  const [wrongSide, setWrongSide] = useState<ComparisonSide | null>(null);
  const [completionPraise, setCompletionPraise] = useState<PraiseEntry>(() => pickPraise(praiseEntries));

  useEffect(() => {
    if (round) lastPairKeyRef.current = pairKey(round.left.value, round.right.value);
  }, [round]);

  const startNewRound = useCallback(() => {
    if (availableItems.length < 2) return;
    let comparison = createComparisonRound(availableItems);
    for (let attempt = 0; attempt < 9 && pairKey(comparison.left.value, comparison.right.value) === lastPairKeyRef.current; attempt += 1) {
      comparison = createComparisonRound(availableItems);
    }
    lastPairKeyRef.current = pairKey(comparison.left.value, comparison.right.value);
    setRound({ ...comparison, emoji: COUNTING_EMOJIS[Math.floor(Math.random() * COUNTING_EMOJIS.length)] });
    setRoundPraise(null);
    setWrongSide(null);
  }, [availableItems]);

  const startNewSession = useCallback(() => {
    lastPairKeyRef.current = null;
    setCompletionPraise(pickPraise(praiseEntries));
    startNewRound();
  }, [praiseEntries, startNewRound]);

  const session = useGameSession({
    maxRounds: MAX_ROUNDS,
    maxAttempts: null,
    onNextRound: startNewRound,
    onPlayAgain: startNewSession,
  });
  const {
    state,
    canAnswer,
    replaying,
    startPrompt,
    replayPrompt,
    resolveAnswer,
    continueAfterFeedback,
    playAgain,
    pause,
    resume,
    fail,
  } = session;

  useEffect(() => {
    if (isEmpty) fail(getUiCopy(locale, 'game.error.emptyPool'));
  }, [fail, isEmpty, locale]);

  const phaseRef = useRef(state.phase);
  useEffect(() => {
    phaseRef.current = state.phase;
  }, [state.phase]);

  useEffect(() => {
    if (!round || isEmpty) return;
    const timer = setTimeout(() => {
      if (phaseRef.current === 'ready') void startPrompt({ clips: [getPhraseClip(locale, 'whereIsMore')] });
    }, TIMING.AUDIO_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isEmpty, locale, round, startPrompt]);

  useEffect(() => {
    if (state.phase !== 'session-complete' || state.paused) return;
    void audioManager.play(getSessionCompleteAudioSpec(locale, completionPraise));
    return () => audioManager.stop();
  }, [completionPraise, locale, state.paused, state.phase]);

  useEffect(() => {
    setE2EState({
      gameId: 'COMPARE_QUANTITIES',
      gamePhase: state.phase,
      phase: state.phase,
      paused: state.paused,
      correctSide: round?.correctSide ?? null,
      wrongSide,
      overlay: state.phase === 'session-complete' ? 'session-complete' : state.feedback === 'success' ? 'success' : null,
      roundsPlayed: state.roundsPlayed,
    });
  }, [round, state, wrongSide]);

  const chooseSide = useCallback(async (side: ComparisonSide) => {
    if (!round || !canAnswer) return;
    const item = round[side];
    if (side === round.correctSide) {
      const praise = pickPraise(praiseEntries);
      setRoundPraise(praise);
      const other = round[side === 'left' ? 'right' : 'left'];
      const successSpec: SuccessSpec = {
        echoLine: formatComparison(locale, item.value, other.value),
        audioSpec: { clips: [getComparisonAudioClip(locale, item.value, other.value)] },
      };
      await resolveAnswer({
        answerId: side,
        outcome: 'correct',
        selectionAudio: getItemAnnouncementAudio(locale, 'numbers', item.audioKey, String(item.value)),
        verdictAudio: getSuccessOverlayAudioSpec(locale, praise, successSpec),
      });
      return;
    }

    setWrongSide(side);
    await resolveAnswer({
      answerId: side,
      outcome: 'wrong',
      selectionAudio: getWrongAnswerAudio(locale, 'numbers', item.audioKey, String(item.value)),
    });
  }, [canAnswer, locale, praiseEntries, resolveAnswer, round]);

  const handleReplay = useCallback(() => {
    void replayPrompt({ clips: [getPhraseClip(locale, 'whereIsMore')] });
  }, [locale, replayPrompt]);

  const retryAfterError = useCallback(() => {
    if (!isEmpty) playAgain();
  }, [isEmpty, playAgain]);

  const feedback: GameShellFeedback | null = state.feedback === 'success'
    ? {
        kind: 'success',
        title: roundPraise?.text ?? getUiCopy(locale, 'game.successTitle'),
        emoji: roundPraise?.emoji,
        detail: round
          ? formatComparison(
              locale,
              round[round.correctSide].value,
              round[round.correctSide === 'left' ? 'right' : 'left'].value,
            )
          : undefined,
        onContinue: continueAfterFeedback,
      }
    : state.phase === 'answered-incorrectly' || (state.phase === 'awaiting-answer' && wrongSide !== null)
    ? { kind: 'retry', title: RETRY_TITLE }
    : null;

  const completion: GameShellCompletion = {
    praise: completionPraise,
    correctRounds: state.correctRounds,
    totalTaps: state.totalTaps,
    maxRounds: state.maxRounds,
    onPlayAgain: playAgain,
    onHome: onExit,
  };

  const leftLabel = round ? `Skupina so ${round.left.value} predmetmi` : 'Ľavá skupina';
  const rightLabel = round ? `Skupina so ${round.right.value} predmetmi` : 'Pravá skupina';

  return (
    <GameShell
      gameId="COMPARE_QUANTITIES"
      state={state}
      onBack={onExit}
      onRetryError={retryAfterError}
      onPause={pause}
      onResume={resume}
      prompt={<GamePrompt instruction={getUiCopy(locale, 'game.compare.instruction')} replaying={replaying} onReplay={handleReplay} />}
      feedback={feedback}
      completion={completion}
    >
      {round && (
        <BalancePlayfield
          leftLabel={leftLabel}
          rightLabel={rightLabel}
          onChoose={side => void chooseSide(side)}
          disabled={!canAnswer}
          leftState={getPieceState(state, 'left')}
          rightState={getPieceState(state, 'right')}
          left={<QuantityTray count={round.left.value} emoji={round.emoji} mode={mode} label={leftLabel} className="h-full min-h-0 w-full" />}
          right={<QuantityTray count={round.right.value} emoji={round.emoji} mode={mode} label={rightLabel} className="h-full min-h-0 w-full" />}
        />
      )}
    </GameShell>
  );
}

export function CompareQuantitiesGame({ settings, onExit, onOpenSettings }: GameRuntimeProps) {
  const { numberItems } = useContent();
  const [gameState, setGameState] = useState<'HOME' | 'PLAYING'>('HOME');
  const availableItems = useMemo(() => {
    const inSelectedRange = numberItems.filter(item => item.value >= settings.compareRange.start && item.value <= settings.compareRange.end);
    return inSelectedRange.length >= 2 ? inSelectedRange : numberItems.filter(item => item.value >= 1 && item.value <= 5);
  }, [numberItems, settings.compareRange.end, settings.compareRange.start]);

  if (gameState === 'HOME') {
    return <GameLobby gameId="COMPARE_QUANTITIES" onPlay={() => setGameState('PLAYING')} onBack={onExit} onOpenSettings={onOpenSettings} />;
  }

  return <ComparePlayfield availableItems={availableItems} mode={settings.compareMode} onExit={() => setGameState('HOME')} />;
}
