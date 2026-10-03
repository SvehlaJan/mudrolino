/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import { GameDescriptor, GameId, PraiseEntry } from '../types';
import { fisherYatesShuffle } from '../utils';
import { setE2EState } from '../services/e2eState';
import { useContent } from '../contexts/ContentContext';
import { getUiCopy } from '../uiCopy';
import {
  AnswerGroup,
  GamePrompt,
  GameShell,
  PlayTray,
  TactilePiece,
  useGameSession,
  useGameSessionAudio,
  type GameShellCompletion,
  type GameShellFeedback,
  type GameState,
  type TactilePieceState,
} from '../game';
import { getSuccessOverlayAudioSpec } from './successOverlayAudio';

interface FindItGameProps<T> {
  gameId: GameId;
  descriptor: GameDescriptor<T>;
  /** Called when the child taps the back button — typically sets parent gameState back to 'HOME'. */
  onExit: () => void;
}

interface RoundState<T> {
  targetItem: T | null;
  gridItems: T[];
}

const FALLBACK_PRAISE: PraiseEntry = { emoji: '🌟', text: 'Výborne!', audioKey: 'vyborne' };

function pickPraise(praiseEntries: PraiseEntry[]): PraiseEntry {
  return praiseEntries[Math.floor(Math.random() * praiseEntries.length)] ?? FALLBACK_PRAISE;
}

/**
 * Only the tapped answer ever gets a non-idle state — every other tile stays 'idle' and
 * relies on AnswerGroup's own disabled cloning to look locked while input is resolving.
 */
function getAnswerPieceState(state: GameState, answerId: string): TactilePieceState | undefined {
  if (state.selectedAnswerId !== answerId) return undefined;
  if (state.phase === 'resolving-answer') return 'pressed';
  if (state.phase === 'answered-correctly') return 'settled';
  if (state.phase === 'answered-incorrectly') return 'retry';
  return undefined;
}

function buildGrid<T>(descriptor: GameDescriptor<T>, target: T | undefined): RoundState<T> {
  if (target === undefined) return { targetItem: null, gridItems: [] };
  const pool = descriptor.getItems();
  const effectiveGridSize = Math.min(descriptor.gridSize, pool.length);
  const others = fisherYatesShuffle(
    pool.filter(item => descriptor.getItemId(item) !== descriptor.getItemId(target))
  ).slice(0, effectiveGridSize - 1);
  const gridItems = fisherYatesShuffle([...others, target]);

  if (import.meta.env.DEV) {
    const ids = gridItems.map((item) => descriptor.getItemId(item));
    if (new Set(ids).size !== ids.length) {
      console.error('FindItGame: grid items must have unique ids', ids);
    }
    if (ids.filter((id) => id === descriptor.getItemId(target)).length !== 1) {
      console.error('FindItGame: grid must contain exactly one target item', ids);
    }
  }

  return { targetItem: target, gridItems };
}

export function FindItGame<T>({ gameId, descriptor, onExit }: FindItGameProps<T>) {
  const { locale, praiseEntries } = useContent();
  const isEmpty = descriptor.getItems().length === 0;

  const [{ roundState }, setSession] = useState(() => {
    const pool = fisherYatesShuffle(descriptor.getItems());
    const [first, ...rest] = pool;
    return { roundState: buildGrid(descriptor, first), roundQueue: rest };
  });
  const { targetItem, gridItems } = roundState;
  const [completionPraise, setCompletionPraise] = useState<PraiseEntry>(() => pickPraise(praiseEntries));
  const [roundPraise, setRoundPraise] = useState<PraiseEntry | null>(null);

  const startNewRound = useCallback(() => {
    setSession((prev) => {
      const pool = descriptor.getItems();
      const currentQueue = prev.roundQueue.length > 0 ? prev.roundQueue : fisherYatesShuffle(pool);
      const [target, ...rest] = currentQueue;
      return { roundState: buildGrid(descriptor, target), roundQueue: rest };
    });
  }, [descriptor]);

  const startNewSession = useCallback(() => {
    setCompletionPraise(pickPraise(praiseEntries));
    startNewRound();
  }, [praiseEntries, startNewRound]);

  const session = useGameSession({
    maxRounds: descriptor.maxRounds,
    maxAttempts: descriptor.maxAttempts,
    onNextRound: startNewRound,
    onPlayAgain: startNewSession,
  });
  const { state, canAnswer, replaying, replayPrompt, resolveAnswer, continueAfterFeedback, playAgain, fail } = session;

  useEffect(() => {
    if (isEmpty) fail(getUiCopy(locale, 'game.error.emptyPool'));
  }, [isEmpty, fail, locale]);

  useEffect(() => {
    setE2EState({
      gameId,
      gamePhase: state.phase,
      paused: state.paused,
      correctItemId: targetItem ? descriptor.getItemId(targetItem) : null,
      gridItemIds: gridItems.map((item) => descriptor.getItemId(item)),
      wrongAttempts: state.wrongAttempts,
      roundsPlayed: state.roundsPlayed,
      replaying,
    });
  }, [gameId, state, replaying, targetItem, gridItems, descriptor]);

  useGameSessionAudio({
    session, roundKey: targetItem, enabled: !isEmpty && !!targetItem,
    getPromptAudio: () => descriptor.getPromptAudio(targetItem!), locale, completionPraise,
  });

  const handleReplay = useCallback(() => {
    if (!targetItem) return;
    const spec = descriptor.getReplayAudio ? descriptor.getReplayAudio(targetItem) : descriptor.getPromptAudio(targetItem);
    void replayPrompt(spec);
  }, [targetItem, descriptor, replayPrompt]);

  const retryAfterError = useCallback(() => {
    if (descriptor.getItems().length > 0) playAgain();
  }, [descriptor, playAgain]);

  const chooseAnswer = useCallback(async (item: T) => {
    if (!targetItem) return;
    const answerId = descriptor.getItemId(item);

    if (answerId === descriptor.getItemId(targetItem)) {
      const praise = pickPraise(praiseEntries);
      setRoundPraise(praise);
      await resolveAnswer({
        answerId,
        outcome: 'correct',
        selectionAudio: descriptor.getCorrectAudio(item),
        verdictAudio: getSuccessOverlayAudioSpec(locale, praise, descriptor.getSuccessSpec(targetItem)),
      });
      return;
    }

    const exhausted = state.maxAttempts !== null && state.wrongAttempts + 1 >= state.maxAttempts;
    await resolveAnswer({
      answerId,
      outcome: 'wrong',
      selectionAudio: descriptor.getWrongAudio(targetItem, item),
      verdictAudio: exhausted ? descriptor.getFailureSpec(targetItem).audioSpec : undefined,
    });
  }, [targetItem, descriptor, resolveAnswer, locale, praiseEntries, state.maxAttempts, state.wrongAttempts]);

  const feedback: GameShellFeedback | null = state.feedback === 'success'
    ? {
        kind: 'success',
        title: roundPraise?.text ?? getUiCopy(locale, 'game.successTitle'),
        emoji: roundPraise?.emoji,
        onContinue: continueAfterFeedback,
      }
    : state.feedback === 'failure'
    ? {
        kind: 'failure',
        title: getUiCopy(locale, 'game.failureTitle'),
        detail: getUiCopy(locale, 'game.failure.detail'),
        onContinue: continueAfterFeedback,
      }
    : state.phase === 'answered-incorrectly'
    ? { kind: 'retry', title: getUiCopy(locale, 'game.retryPrompt'), detail: getUiCopy(locale, 'game.retry.detail') }
    : null;

  const completion: GameShellCompletion = {
    praise: completionPraise,
    correctRounds: state.correctRounds,
    totalTaps: state.totalTaps,
    maxRounds: state.maxRounds,
    onPlayAgain: playAgain,
    onHome: onExit,
  };

  return (
    <GameShell
      gameId={gameId}
      state={state}
      onBack={onExit}
      onRetryError={retryAfterError}
      prompt={
        <GamePrompt
          instruction={descriptor.instruction}
          visual={targetItem ? descriptor.renderPrompt(targetItem) : null}
          replaying={replaying}
          onReplay={handleReplay}
        />
      }
      feedback={feedback}
      completion={completion}
    >
      <PlayTray label={getUiCopy(locale, 'game.playArea')}>
        <AnswerGroup label={getUiCopy(locale, 'game.answerGroup')} disabled={!canAnswer}>
          {gridItems.map((item) => {
            const id = descriptor.getItemId(item);
            return (
              <TactilePiece
                key={id}
                as="button"
                material={descriptor.material}
                visualRole="answer"
                label={descriptor.getAccessibleLabel(item)}
                data-answer-id={id}
                state={getAnswerPieceState(state, id)}
                onPress={() => void chooseAnswer(item)}
              >
                {descriptor.renderCard(item)}
              </TactilePiece>
            );
          })}
        </AnswerGroup>
      </PlayTray>
    </GameShell>
  );
}
