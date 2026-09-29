/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CompleteLetterMissingCount, FailureSpec, Letter, PraiseEntry, SuccessSpec, Word } from '../../shared/types';
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
  buildEligibleCompleteLetterWords,
  buildLetterChoices,
  buildPromptSlots,
  CompleteLetterRound,
  CompleteLetterSlot,
  createCompleteLetterRound,
  getActiveCompleteLetterLetters,
  getActiveMissingIndex,
} from './completeLetterLogic';

const INSTRUCTION = 'Doplň chýbajúce písmeno';
const ANSWER_GROUP_LABEL = 'Vyber chýbajúce písmeno';
const CHOICE_COUNT = 4;

const FALLBACK_PRAISE: PraiseEntry = { emoji: '🌟', text: 'Výborne!', audioKey: 'vyborne' };

function pickPraise(praiseEntries: PraiseEntry[]): PraiseEntry {
  return praiseEntries[Math.floor(Math.random() * praiseEntries.length)] ?? FALLBACK_PRAISE;
}

function getPromptAudio(locale: string, round: CompleteLetterRound) {
  return {
    clips: [
      { path: `${locale}/words/${round.word.audioKey}`, fallbackText: round.word.word },
    ],
  };
}

function getCompletedLine(round: CompleteLetterRound): string {
  return `${round.word.word} ${round.word.emoji}`;
}

function getSuccessSpec(locale: string, round: CompleteLetterRound): SuccessSpec {
  return {
    echoLine: getCompletedLine(round),
    audioSpec: {
      clips: [getItemAudioClip(locale, 'words', round.word.audioKey, round.word.word)],
    },
  };
}

function getFailureSpec(locale: string, round: CompleteLetterRound): FailureSpec {
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
  round: CompleteLetterRound | null;
  choices: Letter[];
  filledCount: number;
}

const EMPTY_ROUND_STATE: RoundState = { round: null, choices: [], filledCount: 0 };

interface PlayableRound {
  round: CompleteLetterRound;
  choices: Letter[];
  remainingQueue: Word[];
}

function findPlayableRound(
  candidateQueue: Word[],
  activeLetters: Letter[],
  missingCountMode: CompleteLetterMissingCount,
): PlayableRound | null {
  for (let index = 0; index < candidateQueue.length; index += 1) {
    try {
      const round = createCompleteLetterRound(candidateQueue[index], activeLetters, missingCountMode);
      const choices = buildLetterChoices(round, activeLetters, 0, CHOICE_COUNT);
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
 * a previous shuffle, or a queue made stale by a live settings change) has no playable word left
 * — preserves the pre-migration bespoke component's queue-exhaustion fallback.
 */
function pickPlayableRound(
  candidateQueue: Word[],
  eligibleWords: Word[],
  activeLetters: Letter[],
  missingCountMode: CompleteLetterMissingCount,
): PlayableRound | null {
  return findPlayableRound(candidateQueue, activeLetters, missingCountMode)
    ?? findPlayableRound(fisherYatesShuffle(eligibleWords), activeLetters, missingCountMode);
}

function buildRoundState(picked: PlayableRound | null): RoundState {
  if (!picked) return EMPTY_ROUND_STATE;
  return { round: picked.round, choices: picked.choices, filledCount: 0 };
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

function getInsetLabel(slot: CompleteLetterSlot): string {
  if (slot.state === 'active') return `Chýbajúce písmeno ${slot.index + 1}, aktívne`;
  if (slot.state === 'pending') return `Chýbajúce písmeno ${slot.index + 1}, čaká`;
  return `Písmeno ${slot.text}`;
}

interface CompleteLetterPlayfieldProps {
  eligibleWords: Word[];
  activeLetters: Letter[];
  missingCountMode: CompleteLetterMissingCount;
  onExit: () => void;
}

function CompleteLetterPlayfield({ eligibleWords, activeLetters, missingCountMode, onExit }: CompleteLetterPlayfieldProps) {
  const { locale, praiseEntries } = useContent();
  const isEmpty = eligibleWords.length === 0 || activeLetters.length < CHOICE_COUNT;

  const [{ roundState }, setSession] = useState<{ roundState: RoundState; roundQueue: Word[] }>(() => {
    const pool = fisherYatesShuffle(eligibleWords);
    const playable = findPlayableRound(pool, activeLetters, missingCountMode);
    return { roundState: buildRoundState(playable), roundQueue: playable?.remainingQueue ?? [] };
  });
  const { round: targetRound, choices, filledCount } = roundState;
  const [completionPraise, setCompletionPraise] = useState<PraiseEntry>(() => pickPraise(praiseEntries));
  const [roundPraise, setRoundPraise] = useState<PraiseEntry | null>(null);

  const activeMissingIndex = targetRound ? getActiveMissingIndex(targetRound, filledCount) : null;
  const correctSymbol = targetRound && activeMissingIndex !== null ? targetRound.units[activeMissingIndex] : null;

  const settleBlank = useCallback((nextFilledCount: number, nextChoices?: Letter[]) => {
    setSession((prev) => ({
      ...prev,
      roundState: {
        ...prev.roundState,
        filledCount: nextFilledCount,
        choices: nextChoices ?? prev.roundState.choices,
      },
    }));
  }, []);

  const startNewRound = useCallback(() => {
    setSession((prev) => {
      const currentQueue = prev.roundQueue.length > 0 ? prev.roundQueue : fisherYatesShuffle(eligibleWords);
      const playable = pickPlayableRound(currentQueue, eligibleWords, activeLetters, missingCountMode);
      return { roundState: buildRoundState(playable), roundQueue: playable?.remainingQueue ?? [] };
    });
  }, [eligibleWords, activeLetters, missingCountMode]);

  const startNewSession = useCallback(() => {
    setCompletionPraise(pickPraise(praiseEntries));
    const pool = fisherYatesShuffle(eligibleWords);
    const playable = pickPlayableRound(pool, eligibleWords, activeLetters, missingCountMode);
    setSession({ roundState: buildRoundState(playable), roundQueue: playable?.remainingQueue ?? [] });
  }, [eligibleWords, activeLetters, missingCountMode, praiseEntries]);

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
      gameId: 'COMPLETE_LETTER',
      gamePhase: state.phase,
      paused: state.paused,
      correctItemId: correctSymbol,
      answerItemIds: choices.map((letter) => letter.symbol),
      wrongAttempts: state.wrongAttempts,
      roundsPlayed: state.roundsPlayed,
      replaying,
      filledMissingCount: filledCount,
      missingCount: targetRound ? targetRound.missingIndexes.length : 0,
    });
  }, [state, replaying, correctSymbol, choices, filledCount, targetRound]);

  const phaseRef = useRef(state.phase);
  useEffect(() => {
    phaseRef.current = state.phase;
  }, [state.phase]);
  // Set synchronously at the very top of chooseAnswer, before any local state update or await —
  // see the comment there for why this can't be the React-state-derived `canAnswer` instead.
  const answerLockRef = useRef(false);

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

  const chooseAnswer = useCallback(async (letter: Letter) => {
    if (!targetRound || correctSymbol === null || !canAnswer) return;
    // Unlike a single-shot choice, this round settles local state (filledCount/choices) before
    // calling resolveAnswer, so useGameSession's own re-entrancy guard (its `answeringRef`,
    // mutated synchronously at the top of resolveAnswer) runs too late to protect that local
    // update from a same-tick double-invocation. Mirror that same ref-before-any-await pattern
    // here, locally, so a fast double-tap is rejected before settleBlank ever runs.
    if (answerLockRef.current) return;
    answerLockRef.current = true;
    try {
      const answerId = letter.symbol;

      if (letter.symbol === correctSymbol) {
        const nextFilledCount = filledCount + 1;
        const isFinalBlank = nextFilledCount >= targetRound.missingIndexes.length;

        if (!isFinalBlank) {
          // activeLetters reflects live settings; a mid-round settings change (rare) could shift
          // distractors for the next blank — the correct answer itself is unaffected.
          const nextChoices = buildLetterChoices(targetRound, activeLetters, nextFilledCount, CHOICE_COUNT);
          settleBlank(nextFilledCount, nextChoices);
          await resolveAnswer({
            answerId,
            outcome: 'progress',
            selectionAudio: getItemAnnouncementAudio(locale, 'letters', letter.audioKey, letter.symbol),
          });
          return;
        }

        const praise = pickPraise(praiseEntries);
        setRoundPraise(praise);
        settleBlank(nextFilledCount);
        await resolveAnswer({
          answerId,
          outcome: 'correct',
          selectionAudio: getItemAnnouncementAudio(locale, 'letters', letter.audioKey, letter.symbol),
          verdictAudio: getSuccessOverlayAudioSpec(locale, praise, getSuccessSpec(locale, targetRound)),
        });
        return;
      }

      const exhausted = state.maxAttempts !== null && state.wrongAttempts + 1 >= state.maxAttempts;
      // Reveal every remaining missing unit before the failure explanation plays.
      if (exhausted) settleBlank(targetRound.missingIndexes.length);
      await resolveAnswer({
        answerId,
        outcome: 'wrong',
        selectionAudio: getWrongAnswerAudio(locale, 'letters', letter.audioKey, letter.symbol),
        verdictAudio: exhausted ? getFailureSpec(locale, targetRound).audioSpec : undefined,
      });
    } finally {
      answerLockRef.current = false;
    }
  }, [targetRound, correctSymbol, canAnswer, filledCount, activeLetters, locale, praiseEntries, resolveAnswer, settleBlank, state.maxAttempts, state.wrongAttempts]);

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

  const slots = targetRound ? buildPromptSlots(targetRound, filledCount) : [];

  return (
    <GameShell
      gameId="COMPLETE_LETTER"
      state={state}
      onBack={onExit}
      onRetryError={retryAfterError}
      prompt={
        <GamePrompt
          instruction={INSTRUCTION}
          visual={
            targetRound ? (
              // A very short landscape strip or narrow phone leaves little room for this
              // picture+rail combo alongside the answer tray below it — PictureCard/WordRail/
              // InsetSlot each compact themselves enough at those two breakpoints that both stay
              // visible and the tray still gets its needed 48px; see their own comments.
              <div className="flex w-full flex-col items-center gap-3 [@media(max-height:480px)]:gap-0 [@media(max-width:380px)]:gap-1">
                <PictureCard emoji={targetRound.word.emoji} label={targetRound.word.word} />
                <WordRail label={`Slovo ${targetRound.word.word}`}>
                  {slots.map((slot) => (
                    <InsetSlot
                      key={slot.index}
                      label={getInsetLabel(slot)}
                      state={slot.state === 'visible' ? 'fixed' : slot.state}
                    >
                      {slot.state === 'active' || slot.state === 'pending' ? null : slot.text}
                    </InsetSlot>
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

export function CompleteLetterGame({ settings, onExit, onOpenSettings }: GameRuntimeProps) {
  const { wordItems, letterItems } = useContent();
  const [gameState, setGameState] = useState<'HOME' | 'PLAYING'>('HOME');

  const activeLetters = useMemo(
    () => getActiveCompleteLetterLetters(letterItems, settings.alphabetAccents),
    [letterItems, settings.alphabetAccents],
  );

  const eligibleWords = useMemo(
    () => buildEligibleCompleteLetterWords(
      wordItems,
      letterItems,
      settings.alphabetAccents,
      settings.completeLetterMissingCount,
      CHOICE_COUNT,
    ),
    [letterItems, settings.alphabetAccents, settings.completeLetterMissingCount, wordItems],
  );
  const isPlayable = eligibleWords.length > 0 && activeLetters.length >= CHOICE_COUNT;

  if (gameState === 'PLAYING') {
    return (
      <CompleteLetterPlayfield
        eligibleWords={eligibleWords}
        activeLetters={activeLetters}
        missingCountMode={settings.completeLetterMissingCount}
        onExit={() => setGameState('HOME')}
      />
    );
  }

  return (
    <GameLobby
      gameId="COMPLETE_LETTER"
      availabilityMessage={
        isPlayable ? undefined : 'Pridajte slová z aktívnych písmen alebo upravte nastavenia písmen.'
      }
      onPlay={() => setGameState('PLAYING')}
      onBack={onExit}
      onOpenSettings={onOpenSettings}
    />
  );
}
