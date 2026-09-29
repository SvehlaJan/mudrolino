/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Letter, PraiseEntry, SuccessSpec, FailureSpec } from '../../shared/types';
import { GameRuntimeProps } from '../../shared/gameRuntime';
import { useContent } from '../../shared/contexts/ContentContext';
import { GameLobby } from '../../shared/components/GameLobby';
import { getSuccessOverlayAudioSpec } from '../../shared/components/successOverlayAudio';
import { getSessionCompleteAudioSpec } from '../../shared/components/sessionCompleteAudio';
import { TIMING, getItemAnnouncementAudio, getItemAudioClip, getPhraseClip, getWrongAnswerAudio } from '../../shared/contentRegistry';
import { audioManager } from '../../shared/services/audioManager';
import { setE2EState } from '../../shared/services/e2eState';
import { getUiCopy } from '../../shared/uiCopy';
import { fisherYatesShuffle } from '../../shared/utils';
import {
  AnswerGroup,
  GamePrompt,
  GameShell,
  PictureCard,
  PlayTray,
  TactilePiece,
  useGameSession,
  type GameShellCompletion,
  type GameShellFeedback,
  type GameState,
  type TactilePieceState,
} from '../../shared/game';
import {
  buildFirstLetterItems,
  buildLetterChoices,
  FirstLetterItem,
  getActiveFirstLetterLetters,
} from './firstLetterLogic';

const INSTRUCTION = 'Ktorým písmenom sa začína toto slovo?';
const ANSWER_GROUP_LABEL = 'Vyber prvé písmeno';

const FALLBACK_PRAISE: PraiseEntry = { emoji: '🌟', text: 'Výborne!', audioKey: 'vyborne' };

function pickPraise(praiseEntries: PraiseEntry[]): PraiseEntry {
  return praiseEntries[Math.floor(Math.random() * praiseEntries.length)] ?? FALLBACK_PRAISE;
}

function getPromptAudio(locale: string, item: FirstLetterItem) {
  return {
    clips: [
      { path: `${locale}/words/${item.word.audioKey}`, fallbackText: item.word.word },
      { path: `${locale}/phrases/na-ake-pismenko-sa-zacina`, fallbackText: 'Na aké písmenko sa začína?' },
    ],
  };
}

function getRelationshipLine(item: FirstLetterItem): string {
  return `${item.word.word} začína na ${item.firstLetter.symbol}. ${item.word.emoji}`;
}

function getSuccessSpec(locale: string, item: FirstLetterItem): SuccessSpec {
  return {
    echoLine: getRelationshipLine(item),
    audioSpec: {
      clips: [
        getItemAudioClip(locale, 'words', item.word.audioKey, `${item.word.word} začína na ${item.firstLetter.symbol}.`),
      ],
    },
  };
}

function getFailureSpec(locale: string, item: FirstLetterItem): FailureSpec {
  return {
    echoLine: getRelationshipLine(item),
    audioSpec: {
      clips: [
        getPhraseClip(locale, 'neverMind'),
        { path: `${locale}/words/${item.word.audioKey}`, fallbackText: `${item.word.word} začína na ${item.firstLetter.symbol}.` },
      ],
    },
  };
}

interface RoundState {
  targetItem: FirstLetterItem | null;
  choices: Letter[];
}

function buildRound(target: FirstLetterItem | undefined, activeLetters: Letter[]): RoundState {
  if (!target) return { targetItem: null, choices: [] };
  return { targetItem: target, choices: buildLetterChoices(target, activeLetters, 4) };
}

/**
 * Only the tapped answer ever gets a non-idle state — every other magnet stays 'idle' and
 * relies on AnswerGroup's own disabled cloning to look locked while input is resolving.
 */
function getAnswerPieceState(state: GameState, answerId: string): TactilePieceState | undefined {
  if (state.selectedAnswerId !== answerId) return undefined;
  if (state.phase === 'resolving-answer') return 'pressed';
  if (state.phase === 'answered-correctly') return 'settled';
  if (state.phase === 'answered-incorrectly') return 'retry';
  return undefined;
}

interface FirstLetterPlayfieldProps {
  eligibleItems: FirstLetterItem[];
  activeLetters: Letter[];
  onExit: () => void;
}

function FirstLetterPlayfield({ eligibleItems, activeLetters, onExit }: FirstLetterPlayfieldProps) {
  const { locale, praiseEntries } = useContent();
  const isEmpty = eligibleItems.length === 0 || activeLetters.length < 4;

  const [{ roundState }, setSession] = useState<{ roundState: RoundState; roundQueue: FirstLetterItem[] }>(() => {
    const pool = fisherYatesShuffle(eligibleItems);
    const [first, ...rest] = pool;
    return { roundState: buildRound(first, activeLetters), roundQueue: rest };
  });
  const { targetItem, choices } = roundState;
  const [completionPraise, setCompletionPraise] = useState<PraiseEntry>(() => pickPraise(praiseEntries));
  const [roundPraise, setRoundPraise] = useState<PraiseEntry | null>(null);

  const startNewRound = useCallback(() => {
    setSession((prev) => {
      const currentQueue = prev.roundQueue.length > 0 ? prev.roundQueue : fisherYatesShuffle(eligibleItems);
      const [target, ...rest] = currentQueue;
      return { roundState: buildRound(target, activeLetters), roundQueue: rest };
    });
  }, [eligibleItems, activeLetters]);

  const startNewSession = useCallback(() => {
    setCompletionPraise(pickPraise(praiseEntries));
    const pool = fisherYatesShuffle(eligibleItems);
    const [first, ...rest] = pool;
    setSession({ roundState: buildRound(first, activeLetters), roundQueue: rest });
  }, [eligibleItems, activeLetters, praiseEntries]);

  const session = useGameSession({
    maxRounds: 5,
    maxAttempts: 3,
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
    fail,
  } = session;

  useEffect(() => {
    if (isEmpty) fail(getUiCopy(locale, 'game.error.emptyPool'));
  }, [isEmpty, fail, locale]);

  useEffect(() => {
    setE2EState({
      gameId: 'FIRST_LETTER',
      gamePhase: state.phase,
      paused: state.paused,
      correctItemId: targetItem ? targetItem.firstLetter.symbol : null,
      answerItemIds: choices.map((letter) => letter.symbol),
      wrongAttempts: state.wrongAttempts,
      roundsPlayed: state.roundsPlayed,
      replaying,
    });
  }, [state, replaying, targetItem, choices]);

  const phaseRef = useRef(state.phase);
  useEffect(() => {
    phaseRef.current = state.phase;
  }, [state.phase]);
  // Set synchronously inside chooseAnswer before any local state update or await — see the
  // comment there for why the React-state-derived `canAnswer` cannot stand in for it.
  const answerLockRef = useRef(false);

  useEffect(() => {
    if (!targetItem || isEmpty) return;
    const timer = setTimeout(() => {
      // A round-start prompt must never invalidate an answer that started resolving first —
      // invalidate() would stop that answer's own in-flight audio and hang it forever. Only
      // fire while the round is still untouched; a manual replay or an answer already moved on.
      if (phaseRef.current !== 'ready') return;
      void startPrompt(getPromptAudio(locale, targetItem));
    }, TIMING.AUDIO_DELAY_MS);
    return () => clearTimeout(timer);
  }, [targetItem, isEmpty, locale, startPrompt]);

  useEffect(() => {
    if (state.phase !== 'session-complete' || state.paused) return;
    void audioManager.play(getSessionCompleteAudioSpec(locale, completionPraise));
    return () => audioManager.stop();
  }, [state.phase, state.paused, locale, completionPraise]);

  const handleReplay = useCallback(() => {
    if (!targetItem) return;
    void replayPrompt(getPromptAudio(locale, targetItem));
  }, [targetItem, locale, replayPrompt]);

  const retryAfterError = useCallback(() => {
    if (!isEmpty) playAgain();
  }, [isEmpty, playAgain]);

  const chooseAnswer = useCallback(async (letter: Letter) => {
    if (!targetItem || !canAnswer) return;
    // The praise entry backing this round's visible feedback is picked and committed to local
    // state before resolveAnswer is awaited, so useGameSession's own re-entrancy guard (its
    // `answeringRef`, mutated synchronously at the top of resolveAnswer) runs too late to
    // protect it: a same-tick second tap can overwrite roundPraise while the first tap's
    // verdict audio is already built from the entry it replaced, leaving the spoken praise and
    // the shown praise mismatched. `canAnswer` is React-state-derived and cannot observe that
    // second invocation in time either, so this mirrors CompleteLetterGame's reviewed ref guard.
    if (answerLockRef.current) return;
    answerLockRef.current = true;
    try {
      const answerId = letter.symbol;

      if (letter.symbol === targetItem.firstLetter.symbol) {
        const praise = pickPraise(praiseEntries);
        setRoundPraise(praise);
        await resolveAnswer({
          answerId,
          outcome: 'correct',
          selectionAudio: getItemAnnouncementAudio(locale, 'letters', letter.audioKey, letter.symbol),
          verdictAudio: getSuccessOverlayAudioSpec(locale, praise, getSuccessSpec(locale, targetItem)),
        });
        return;
      }

      const exhausted = state.maxAttempts !== null && state.wrongAttempts + 1 >= state.maxAttempts;
      await resolveAnswer({
        answerId,
        outcome: 'wrong',
        selectionAudio: getWrongAnswerAudio(locale, 'letters', letter.audioKey, letter.symbol),
        verdictAudio: exhausted ? getFailureSpec(locale, targetItem).audioSpec : undefined,
      });
    } finally {
      answerLockRef.current = false;
    }
  }, [targetItem, canAnswer, locale, praiseEntries, resolveAnswer, state.maxAttempts, state.wrongAttempts]);

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
      gameId="FIRST_LETTER"
      state={state}
      onBack={onExit}
      onRetryError={retryAfterError}
      prompt={
        <GamePrompt
          instruction={INSTRUCTION}
          visual={targetItem ? <PictureCard emoji={targetItem.word.emoji} label={targetItem.word.word} /> : null}
          replaying={replaying}
          onReplay={handleReplay}
        />
      }
      feedback={feedback}
      completion={completion}
    >
      <PlayTray label={getUiCopy(locale, 'game.playArea')}>
        <AnswerGroup label={ANSWER_GROUP_LABEL} disabled={!canAnswer}>
          {choices.map((letter) => (
            <TactilePiece
              key={letter.symbol}
              as="button"
              material="magnet"
              label={`Písmeno ${letter.symbol}`}
              data-answer-id={letter.symbol}
              state={getAnswerPieceState(state, letter.symbol)}
              onPress={() => void chooseAnswer(letter)}
            >
              <span className="font-spline text-[clamp(1.25rem,calc(var(--tile-size)*0.38),3rem)] font-bold leading-none">
                {letter.symbol}
              </span>
            </TactilePiece>
          ))}
        </AnswerGroup>
      </PlayTray>
    </GameShell>
  );
}

export function FirstLetterGame({ settings, onExit, onOpenSettings }: GameRuntimeProps) {
  const { wordItems, letterItems } = useContent();
  const [gameState, setGameState] = useState<'HOME' | 'PLAYING'>('HOME');

  const activeLetters = useMemo(
    () => getActiveFirstLetterLetters(letterItems, settings.alphabetAccents),
    [letterItems, settings.alphabetAccents],
  );
  const eligibleItems = useMemo(
    () => buildFirstLetterItems(wordItems, activeLetters),
    [wordItems, activeLetters],
  );
  const isPlayable = eligibleItems.length > 0 && activeLetters.length >= 4;

  if (gameState === 'PLAYING') {
    return (
      <FirstLetterPlayfield
        eligibleItems={eligibleItems}
        activeLetters={activeLetters}
        onExit={() => setGameState('HOME')}
      />
    );
  }

  return (
    <GameLobby
      gameId="FIRST_LETTER"
      availabilityMessage={
        isPlayable ? undefined : 'Pridajte alebo nahrajte slová, ktoré začínajú dostupnými písmenkami.'
      }
      onPlay={() => setGameState('PLAYING')}
      onBack={onExit}
      onOpenSettings={onOpenSettings}
    />
  );
}
