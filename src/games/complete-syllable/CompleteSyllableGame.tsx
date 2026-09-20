/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FailureSpec, PraiseEntry, SuccessSpec, Syllable, Word } from '../../shared/types';
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
  InsetSlot,
  PictureCard,
  PlayTray,
  TactilePiece,
  WordRail,
  useGameSession,
  type GameShellCompletion,
  type GameShellFeedback,
  type GameState,
  type TactilePieceState,
} from '../../shared/game';
import {
  buildEligibleCompleteSyllableWords,
  buildPromptSlots,
  buildSyllableChoices,
  CompleteSyllableRound,
  CompleteSyllableSlot,
  createCompleteSyllableRound,
} from './completeSyllableLogic';

const INSTRUCTION = 'Doplň chýbajúcu slabiku';
const ANSWER_GROUP_LABEL = 'Vyber chýbajúcu slabiku';
const CHOICE_COUNT = 4;

const FALLBACK_PRAISE: PraiseEntry = { emoji: '🌟', text: 'Výborne!', audioKey: 'vyborne' };

function pickPraise(praiseEntries: PraiseEntry[]): PraiseEntry {
  return praiseEntries[Math.floor(Math.random() * praiseEntries.length)] ?? FALLBACK_PRAISE;
}

function getPromptAudio(locale: string, round: CompleteSyllableRound) {
  return {
    clips: [
      { path: `${locale}/words/${round.word.audioKey}`, fallbackText: round.word.word },
    ],
  };
}

function getCompletedLine(round: CompleteSyllableRound): string {
  return `${round.word.syllables} ${round.word.emoji}`;
}

function getSuccessSpec(locale: string, round: CompleteSyllableRound): SuccessSpec {
  return {
    echoLine: getCompletedLine(round),
    audioSpec: {
      clips: [getItemAudioClip(locale, 'words', round.word.audioKey, round.word.word)],
    },
  };
}

function getFailureSpec(locale: string, round: CompleteSyllableRound): FailureSpec {
  return {
    echoLine: getCompletedLine(round),
    audioSpec: {
      clips: [
        getPhraseClip(locale, 'neverMind'),
        { path: `${locale}/words/${round.word.audioKey}`, fallbackText: round.word.word },
      ],
    },
  };
}

interface RoundState {
  round: CompleteSyllableRound | null;
  choices: Syllable[];
}

const EMPTY_ROUND_STATE: RoundState = { round: null, choices: [] };

interface PlayableRound {
  round: CompleteSyllableRound;
  choices: Syllable[];
  remainingQueue: Word[];
}

function findPlayableRound(candidateQueue: Word[], syllableItems: Syllable[]): PlayableRound | null {
  for (let index = 0; index < candidateQueue.length; index += 1) {
    try {
      const round = createCompleteSyllableRound(candidateQueue[index]);
      const choices = buildSyllableChoices(round, syllableItems, CHOICE_COUNT);
      if (choices.length === CHOICE_COUNT) {
        return { round, choices, remainingQueue: candidateQueue.slice(index + 1) };
      }
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * Falls back to a freshly shuffled full pool when the candidate queue (a leftover fragment from
 * a previous shuffle, or a queue made stale by a live content change) has no playable word left —
 * preserves the pre-migration bespoke component's queue-exhaustion fallback.
 */
function pickPlayableRound(
  candidateQueue: Word[],
  eligibleWords: Word[],
  syllableItems: Syllable[],
): PlayableRound | null {
  return findPlayableRound(candidateQueue, syllableItems)
    ?? findPlayableRound(fisherYatesShuffle(eligibleWords), syllableItems);
}

function buildRoundState(picked: PlayableRound | null): RoundState {
  if (!picked) return EMPTY_ROUND_STATE;
  return { round: picked.round, choices: picked.choices };
}

/**
 * Only the tapped answer ever gets a non-idle state — every other piece stays 'idle' and relies
 * on AnswerGroup's own disabled cloning to look locked while input is resolving.
 */
function getAnswerPieceState(state: GameState, answerId: string): TactilePieceState | undefined {
  if (state.selectedAnswerId !== answerId) return undefined;
  if (state.phase === 'resolving-answer') return 'pressed';
  if (state.phase === 'answered-correctly') return 'settled';
  if (state.phase === 'answered-incorrectly') return 'retry';
  return undefined;
}

function getInsetLabel(slot: CompleteSyllableSlot): string {
  if (slot.isMissing && slot.text === '__') return 'Chýbajúca slabika';
  return `Slabika ${slot.text}`;
}

interface CompleteSyllablePlayfieldProps {
  eligibleWords: Word[];
  syllableItems: Syllable[];
  onExit: () => void;
}

function CompleteSyllablePlayfield({ eligibleWords, syllableItems, onExit }: CompleteSyllablePlayfieldProps) {
  const { locale, praiseEntries } = useContent();
  const isEmpty = eligibleWords.length === 0;

  const [{ roundState }, setSession] = useState<{ roundState: RoundState; roundQueue: Word[] }>(() => {
    const pool = fisherYatesShuffle(eligibleWords);
    const playable = findPlayableRound(pool, syllableItems);
    return { roundState: buildRoundState(playable), roundQueue: playable?.remainingQueue ?? [] };
  });
  const { round: targetRound, choices } = roundState;
  const [completionPraise, setCompletionPraise] = useState<PraiseEntry>(() => pickPraise(praiseEntries));
  const [roundPraise, setRoundPraise] = useState<PraiseEntry | null>(null);

  const startNewRound = useCallback(() => {
    setSession((prev) => {
      const currentQueue = prev.roundQueue.length > 0 ? prev.roundQueue : fisherYatesShuffle(eligibleWords);
      const playable = pickPlayableRound(currentQueue, eligibleWords, syllableItems);
      return { roundState: buildRoundState(playable), roundQueue: playable?.remainingQueue ?? [] };
    });
  }, [eligibleWords, syllableItems]);

  const startNewSession = useCallback(() => {
    setCompletionPraise(pickPraise(praiseEntries));
    const pool = fisherYatesShuffle(eligibleWords);
    const playable = pickPlayableRound(pool, eligibleWords, syllableItems);
    setSession({ roundState: buildRoundState(playable), roundQueue: playable?.remainingQueue ?? [] });
  }, [eligibleWords, syllableItems, praiseEntries]);

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
    pause,
    resume,
    fail,
  } = session;

  useEffect(() => {
    if (isEmpty) fail(getUiCopy(locale, 'game.error.emptyPool'));
  }, [isEmpty, fail, locale]);

  useEffect(() => {
    setE2EState({
      gameId: 'COMPLETE_SYLLABLE',
      gamePhase: state.phase,
      paused: state.paused,
      correctItemId: targetRound ? targetRound.correctSyllable : null,
      answerItemIds: choices.map((syllable) => syllable.symbol),
      wrongAttempts: state.wrongAttempts,
      roundsPlayed: state.roundsPlayed,
      replaying,
    });
  }, [state, replaying, targetRound, choices]);

  const phaseRef = useRef(state.phase);
  useEffect(() => {
    phaseRef.current = state.phase;
  }, [state.phase]);

  useEffect(() => {
    if (!targetRound || isEmpty) return;
    const timer = setTimeout(() => {
      // A round-start prompt must never invalidate an answer that started resolving first —
      // invalidate() would stop that answer's own in-flight audio and hang it forever. Only
      // fire while the round is still untouched; a manual replay or an answer already moved on.
      if (phaseRef.current !== 'ready') return;
      void startPrompt(getPromptAudio(locale, targetRound));
    }, TIMING.AUDIO_DELAY_MS);
    return () => clearTimeout(timer);
  }, [targetRound, isEmpty, locale, startPrompt]);

  useEffect(() => {
    if (state.phase !== 'session-complete' || state.paused) return;
    void audioManager.play(getSessionCompleteAudioSpec(locale, completionPraise));
    return () => audioManager.stop();
  }, [state.phase, state.paused, locale, completionPraise]);

  const handleReplay = useCallback(() => {
    if (!targetRound) return;
    void replayPrompt(getPromptAudio(locale, targetRound));
  }, [targetRound, locale, replayPrompt]);

  const retryAfterError = useCallback(() => {
    if (!isEmpty) playAgain();
  }, [isEmpty, playAgain]);

  const chooseAnswer = useCallback(async (syllable: Syllable) => {
    if (!targetRound) return;
    const answerId = syllable.symbol;

    if (syllable.symbol === targetRound.correctSyllable) {
      const praise = pickPraise(praiseEntries);
      setRoundPraise(praise);
      await resolveAnswer({
        answerId,
        outcome: 'correct',
        selectionAudio: getItemAnnouncementAudio(locale, 'syllables', syllable.audioKey, syllable.symbol),
        verdictAudio: getSuccessOverlayAudioSpec(locale, praise, getSuccessSpec(locale, targetRound)),
      });
      return;
    }

    const exhausted = state.maxAttempts !== null && state.wrongAttempts + 1 >= state.maxAttempts;
    await resolveAnswer({
      answerId,
      outcome: 'wrong',
      selectionAudio: getWrongAnswerAudio(locale, 'syllables', syllable.audioKey, syllable.symbol),
      verdictAudio: exhausted ? getFailureSpec(locale, targetRound).audioSpec : undefined,
    });
  }, [targetRound, locale, praiseEntries, resolveAnswer, state.maxAttempts, state.wrongAttempts]);

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

  // `state.feedback` flips to 'success'/'failure' synchronously the moment resolveAnswer
  // dispatches the terminal event — before its verdict audio plays — so deriving the reveal
  // straight from it fills the slot exactly on time without any extra local tracking.
  const revealed = state.feedback !== null;
  const slots = targetRound ? buildPromptSlots(targetRound, revealed) : [];

  return (
    <GameShell
      gameId="COMPLETE_SYLLABLE"
      state={state}
      onBack={onExit}
      onRetryError={retryAfterError}
      onPause={pause}
      onResume={resume}
      prompt={
        <GamePrompt
          instruction={INSTRUCTION}
          visual={
            targetRound ? (
              <div className="flex w-full flex-col items-center gap-3 [@media(max-height:480px)]:gap-0 [@media(max-width:380px)]:gap-1">
                <PictureCard emoji={targetRound.word.emoji} label={targetRound.word.word} />
                <WordRail label={`Slovo ${targetRound.word.word}`}>
                  {slots.map((slot, index) => (
                    <React.Fragment key={`${slot.text}-${index}`}>
                      {index > 0 && (
                        <li
                          aria-hidden="true"
                          className="px-0.5 font-spline text-[clamp(1.25rem,4vw,2rem)] font-black leading-none text-text-main/40 sm:px-1"
                        >
                          -
                        </li>
                      )}
                      <InsetSlot
                        label={getInsetLabel(slot)}
                        state={slot.isMissing ? (revealed ? 'filled' : 'active') : 'fixed'}
                      >
                        {slot.isMissing && !revealed ? null : slot.text}
                      </InsetSlot>
                    </React.Fragment>
                  ))}
                </WordRail>
              </div>
            ) : null
          }
          replaying={replaying}
          onReplay={handleReplay}
        />
      }
      feedback={feedback}
      completion={completion}
    >
      <PlayTray label={getUiCopy(locale, 'game.playArea')}>
        <AnswerGroup label={ANSWER_GROUP_LABEL} disabled={!canAnswer}>
          {choices.map((syllable) => (
            <TactilePiece
              key={syllable.symbol}
              as="button"
              material="felt"
              label={`Slabika ${syllable.symbol}`}
              data-answer-id={syllable.symbol}
              state={getAnswerPieceState(state, syllable.symbol)}
              onPress={() => void chooseAnswer(syllable)}
            >
              <span className="font-spline text-[clamp(2.25rem,7vw,5rem)] font-bold leading-none">
                {syllable.symbol}
              </span>
            </TactilePiece>
          ))}
        </AnswerGroup>
      </PlayTray>
    </GameShell>
  );
}

export function CompleteSyllableGame({ onExit, onOpenSettings }: GameRuntimeProps) {
  const { wordItems, syllableItems } = useContent();
  const [gameState, setGameState] = useState<'HOME' | 'PLAYING'>('HOME');

  const eligibleWords = useMemo(
    () => buildEligibleCompleteSyllableWords(wordItems, syllableItems, CHOICE_COUNT),
    [wordItems, syllableItems],
  );
  const isPlayable = eligibleWords.length > 0;

  if (gameState === 'PLAYING') {
    return (
      <CompleteSyllablePlayfield
        eligibleWords={eligibleWords}
        syllableItems={syllableItems}
        onExit={() => setGameState('HOME')}
      />
    );
  }

  return (
    <GameLobby
      gameId="COMPLETE_SYLLABLE"
      availabilityMessage={
        isPlayable ? undefined : 'Pridajte slová s dvomi až štyrmi slabikami.'
      }
      onPlay={() => setGameState('PLAYING')}
      onBack={onExit}
      onOpenSettings={onOpenSettings}
    />
  );
}
