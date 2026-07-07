/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { FailureSpec, GameSettings, Letter, SuccessSpec, Word } from '../../shared/types';
import { useContent } from '../../shared/contexts/ContentContext';
import { GameLobby } from '../../shared/components/GameLobby';
import { GAME_DEFINITIONS_BY_ID } from '../../shared/gameCatalog';
import { AppScreen, BackButton, ChoiceTile, IconButton, RoundCounter, TopBar } from '../../shared/ui';
import { SuccessOverlay } from '../../shared/components/SuccessOverlay';
import { FailureOverlay } from '../../shared/components/FailureOverlay';
import { SessionCompleteOverlay } from '../../shared/components/SessionCompleteOverlay';
import { TIMING, getPhraseClip } from '../../shared/contentRegistry';
import { audioManager } from '../../shared/services/audioManager';
import { fisherYatesShuffle } from '../../shared/utils';
import {
  buildEligibleCompleteLetterWords,
  buildLetterChoices,
  buildPromptSlots,
  CompleteLetterRound,
  createCompleteLetterRound,
  getActiveCompleteLetterLetters,
  getActiveMissingIndex,
} from './completeLetterLogic';

interface CompleteLetterGameProps {
  settings: GameSettings;
  onExit: () => void;
  onOpenSettings: () => void;
}

const MAX_ROUNDS = 5;
const MAX_ATTEMPTS = 3;
const CHOICE_COUNT = 4;

const slotClassName = {
  visible: 'rounded-2xl bg-white px-3 py-2 font-spline text-[clamp(1.35rem,5vw,2.7rem)] font-black leading-none text-text-main shadow-sm sm:px-4 sm:py-3',
  filled: 'rounded-2xl bg-white px-3 py-2 font-spline text-[clamp(1.35rem,5vw,2.7rem)] font-black leading-none text-text-main shadow-sm sm:px-4 sm:py-3',
  active: 'min-w-[3.25rem] rounded-2xl border-4 border-dashed border-primary/40 bg-white/80 px-3 py-2 font-spline text-[clamp(1.35rem,5vw,2.7rem)] font-black leading-none text-primary shadow-sm sm:min-w-[4rem] sm:px-4 sm:py-3',
  pending: 'min-w-[3.25rem] rounded-2xl border-4 border-dashed border-shadow/35 bg-white/65 px-3 py-2 font-spline text-[clamp(1.35rem,5vw,2.7rem)] font-black leading-none text-text-main/45 shadow-sm sm:min-w-[4rem] sm:px-4 sm:py-3',
} satisfies Record<string, string>;

function clearTimer(timerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>) {
  if (timerRef.current) {
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }
}

function clearTimers(timersRef: React.MutableRefObject<Set<ReturnType<typeof setTimeout>>>) {
  timersRef.current.forEach(clearTimeout);
  timersRef.current.clear();
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
      clips: [
        { path: `${locale}/words/${round.word.audioKey}`, fallbackText: round.word.word },
      ],
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

function getWrongAudio(locale: string, selected: Letter) {
  return {
    clips: [
      getPhraseClip(locale, 'thisIs'),
      { path: `${locale}/letters/${selected.audioKey}`, fallbackText: selected.symbol },
      getPhraseClip(locale, 'retry'),
    ],
  };
}

export function CompleteLetterGame({ settings, onExit, onOpenSettings }: CompleteLetterGameProps) {
  const { wordItems, letterItems, locale } = useContent();
  const [gameState, setGameState] = useState<'HOME' | 'PLAYING'>('HOME');
  const [targetRound, setTargetRound] = useState<CompleteLetterRound | null>(null);
  const [roundQueue, setRoundQueue] = useState<Word[]>([]);
  const [choices, setChoices] = useState<Letter[]>([]);
  const [feedback, setFeedback] = useState<Record<string, 'correct' | 'wrong' | null>>({});
  const [wrongAttemptsThisRound, setWrongAttemptsThisRound] = useState(0);
  const [filledMissingCount, setFilledMissingCount] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showFailure, setShowFailure] = useState(false);
  const [successSpec, setSuccessSpec] = useState<SuccessSpec | null>(null);
  const [failureSpec, setFailureSpec] = useState<FailureSpec | null>(null);
  const [roundsPlayed, setRoundsPlayed] = useState(0);
  const [correctRounds, setCorrectRounds] = useState(0);
  const [totalTaps, setTotalTaps] = useState(0);
  const [showSessionComplete, setShowSessionComplete] = useState(false);
  const pendingRoundEndRef = useRef(false);
  const promptTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roundEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackResetTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const sessionTokenRef = useRef(0);

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

  const lobby = GAME_DEFINITIONS_BY_ID.COMPLETE_LETTER.lobby;

  const clearTransientTimers = useCallback(() => {
    clearTimer(promptTimerRef);
    clearTimer(roundEndTimerRef);
    clearTimers(feedbackResetTimersRef);
  }, []);

  const cleanupPlayEffects = useCallback(() => {
    clearTransientTimers();
    audioManager.stop();
  }, [clearTransientTimers]);

  const resetPlayState = useCallback(() => {
    setTargetRound(null);
    setRoundQueue([]);
    setChoices([]);
    setFeedback({});
    setWrongAttemptsThisRound(0);
    setFilledMissingCount(0);
    setShowSuccess(false);
    setShowFailure(false);
    setSuccessSpec(null);
    setFailureSpec(null);
    setRoundsPlayed(0);
    setCorrectRounds(0);
    setTotalTaps(0);
    setShowSessionComplete(false);
    pendingRoundEndRef.current = false;
  }, []);

  const returnToLobby = useCallback(() => {
    sessionTokenRef.current += 1;
    cleanupPlayEffects();
    resetPlayState();
    setGameState('HOME');
  }, [cleanupPlayEffects, resetPlayState]);

  const findPlayableRound = useCallback((candidateQueue: Word[]) => {
    for (let index = 0; index < candidateQueue.length; index += 1) {
      try {
        const round = createCompleteLetterRound(
          candidateQueue[index],
          activeLetters,
          settings.completeLetterMissingCount,
        );
        const roundChoices = buildLetterChoices(round, activeLetters, 0, CHOICE_COUNT);
        if (roundChoices.length === CHOICE_COUNT) {
          return {
            round,
            choices: roundChoices,
            remainingQueue: candidateQueue.slice(index + 1),
          };
        }
      } catch {
        continue;
      }
    }
    return null;
  }, [activeLetters, settings.completeLetterMissingCount]);

  const startRound = useCallback((queueOverride?: Word[]) => {
    clearTransientTimers();
    const hasOverrideQueue = Boolean(queueOverride && queueOverride.length > 0);
    const hasStoredQueue = !hasOverrideQueue && roundQueue.length > 0;
    const currentQueue = hasOverrideQueue
      ? queueOverride!
      : hasStoredQueue
        ? roundQueue
        : fisherYatesShuffle(eligibleWords);
    const freshQueue = fisherYatesShuffle(eligibleWords);
    const playableRound = findPlayableRound(currentQueue)
      ?? (hasOverrideQueue || hasStoredQueue ? findPlayableRound(freshQueue) : null);

    if (!playableRound) {
      returnToLobby();
      return;
    }

    setTargetRound(playableRound.round);
    setRoundQueue(playableRound.remainingQueue);
    setChoices(playableRound.choices);
    setFeedback({});
    setWrongAttemptsThisRound(0);
    setFilledMissingCount(0);
    setShowSuccess(false);
    setShowFailure(false);
    pendingRoundEndRef.current = false;
  }, [clearTransientTimers, eligibleWords, findPlayableRound, returnToLobby, roundQueue]);

  useEffect(() => {
    return cleanupPlayEffects;
  }, [cleanupPlayEffects]);

  useEffect(() => {
    if (gameState !== 'PLAYING' || !targetRound || showSuccess || showFailure || showSessionComplete) return;
    const sessionToken = sessionTokenRef.current;
    clearTimer(promptTimerRef);
    promptTimerRef.current = setTimeout(() => {
      promptTimerRef.current = null;
      if (sessionTokenRef.current !== sessionToken) return;
      audioManager.play(getPromptAudio(locale, targetRound));
    }, TIMING.AUDIO_DELAY_MS);
    return () => clearTimer(promptTimerRef);
  }, [gameState, locale, showFailure, showSessionComplete, showSuccess, targetRound]);

  const playPromptAudio = useCallback(() => {
    if (!targetRound) return;
    clearTimer(promptTimerRef);
    audioManager.play(getPromptAudio(locale, targetRound));
  }, [locale, targetRound]);

  const handlePlay = () => {
    if (eligibleWords.length === 0) return;
    sessionTokenRef.current += 1;
    cleanupPlayEffects();
    const queue = fisherYatesShuffle(eligibleWords);
    setRoundQueue(queue);
    setRoundsPlayed(0);
    setCorrectRounds(0);
    setTotalTaps(0);
    setShowSessionComplete(false);
    setGameState('PLAYING');
    startRound(queue);
  };

  const finishRound = (wasCorrect: boolean) => {
    const sessionToken = sessionTokenRef.current;
    const nextRoundsPlayed = roundsPlayed + 1;
    setRoundsPlayed(nextRoundsPlayed);
    if (wasCorrect) setCorrectRounds((value) => value + 1);

    clearTimer(roundEndTimerRef);
    if (nextRoundsPlayed >= MAX_ROUNDS) {
      roundEndTimerRef.current = setTimeout(() => {
        roundEndTimerRef.current = null;
        if (sessionTokenRef.current !== sessionToken) return;
        setShowSessionComplete(true);
      }, TIMING.SUCCESS_SHOW_DELAY_MS);
      return;
    }

    roundEndTimerRef.current = setTimeout(() => {
      roundEndTimerRef.current = null;
      if (sessionTokenRef.current !== sessionToken) return;
      if (wasCorrect) {
        setShowSuccess(true);
      } else {
        setShowFailure(true);
      }
    }, TIMING.SUCCESS_SHOW_DELAY_MS);
  };

  const handleChoice = (letter: Letter) => {
    clearTimer(promptTimerRef);
    if (!targetRound || showSuccess || showFailure || showSessionComplete || pendingRoundEndRef.current) return;
    setTotalTaps((value) => value + 1);

    const activeMissingIndex = getActiveMissingIndex(targetRound, filledMissingCount);
    if (activeMissingIndex === null) return;
    const correctSymbol = targetRound.units[activeMissingIndex];

    if (letter.symbol === correctSymbol) {
      const nextFilledCount = filledMissingCount + 1;
      setFeedback((current) => ({ ...current, [letter.symbol]: 'correct' }));
      setFilledMissingCount(nextFilledCount);

      if (nextFilledCount < targetRound.missingIndexes.length) {
        setChoices(buildLetterChoices(targetRound, activeLetters, nextFilledCount, CHOICE_COUNT));
        const sessionToken = sessionTokenRef.current;
        const feedbackResetTimer = setTimeout(() => {
          feedbackResetTimersRef.current.delete(feedbackResetTimer);
          if (sessionTokenRef.current !== sessionToken) return;
          setFeedback((current) => ({ ...current, [letter.symbol]: null }));
        }, TIMING.FEEDBACK_RESET_MS);
        feedbackResetTimersRef.current.add(feedbackResetTimer);
        return;
      }

      pendingRoundEndRef.current = true;
      audioManager.stop();
      setSuccessSpec(getSuccessSpec(locale, targetRound));
      finishRound(true);
      return;
    }

    const nextWrongAttempts = wrongAttemptsThisRound + 1;
    setWrongAttemptsThisRound(nextWrongAttempts);
    setFeedback((current) => ({ ...current, [letter.symbol]: 'wrong' }));

    if (nextWrongAttempts >= MAX_ATTEMPTS) {
      pendingRoundEndRef.current = true;
      audioManager.stop();
      setFilledMissingCount(targetRound.missingIndexes.length);
      setFailureSpec(getFailureSpec(locale, targetRound));
      finishRound(false);
      return;
    }

    audioManager.play(getWrongAudio(locale, letter));
    const sessionToken = sessionTokenRef.current;
    const feedbackResetTimer = setTimeout(() => {
      feedbackResetTimersRef.current.delete(feedbackResetTimer);
      if (sessionTokenRef.current !== sessionToken) return;
      setFeedback((current) => ({ ...current, [letter.symbol]: null }));
    }, TIMING.FEEDBACK_RESET_MS);
    feedbackResetTimersRef.current.add(feedbackResetTimer);
  };

  const handleBackToLobby = () => {
    returnToLobby();
  };

  if (gameState === 'PLAYING') {
    const slots = targetRound ? buildPromptSlots(targetRound, filledMissingCount) : [];
    const emojiLabel = targetRound ? `Obrázok pre slovo ${targetRound.word.word}` : 'Obrázok pre slovo';

    return (
      <AppScreen>
        <TopBar
          left={<BackButton onClick={handleBackToLobby} />}
          center={<RoundCounter completed={roundsPlayed} total={MAX_ROUNDS} />}
          right={
            <IconButton
              onClick={playPromptAudio}
              label="Prehrať zvuk"
            >
              <Volume2 size={24} className="sm:h-7 sm:w-7" />
            </IconButton>
          }
        />

        <div className="flex shrink-0 flex-col items-center justify-center gap-4 pb-4 text-center sm:gap-5">
          <div role="img" aria-label={emojiLabel} className="text-[clamp(4.5rem,18vw,9rem)] leading-none">
            {targetRound?.word.emoji}
          </div>
          <div className="flex max-w-full flex-wrap items-center justify-center gap-2 px-2 sm:gap-3">
            {slots.map((slot) => (
              <span key={slot.index} className={slotClassName[slot.state]}>
                {slot.text}
              </span>
            ))}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 items-center justify-center">
          <div className="grid w-full max-w-2xl grid-cols-2 gap-3 px-1 sm:gap-4 sm:px-2">
            {choices.map((letter) => (
              <ChoiceTile
                key={letter.symbol}
                onClick={() => handleChoice(letter)}
                aria-label={letter.symbol}
                state={feedback[letter.symbol] ?? 'neutral'}
                shape="option"
                className="h-[clamp(8.5rem,21vh,13rem)] rounded-[22px] sm:rounded-[28px]"
              >
                <span className="font-spline text-[clamp(2.35rem,10vw,5.25rem)] font-bold leading-none">
                  {letter.symbol}
                </span>
              </ChoiceTile>
            ))}
          </div>
        </div>

        {successSpec && (
          <SuccessOverlay show={showSuccess} spec={successSpec} onComplete={() => startRound()} />
        )}
        {failureSpec && (
          <FailureOverlay show={showFailure} spec={failureSpec} onComplete={() => startRound()} />
        )}
        <SessionCompleteOverlay
          show={showSessionComplete}
          roundsCompleted={correctRounds}
          totalTaps={totalTaps}
          maxRounds={MAX_ROUNDS}
          onComplete={handleBackToLobby}
        />
      </AppScreen>
    );
  }

  return (
    <GameLobby
      title={lobby.title}
      playButtonColorClassName={lobby.playButtonColorClassName}
      subtitle={
        eligibleWords.length === 0
          ? <>Pridajte slová z aktívnych písmen alebo upravte nastavenia písmen.</>
          : undefined
      }
      onPlay={handlePlay}
      onBack={onExit}
      onOpenSettings={onOpenSettings}
      topDecorationClassName={lobby.topDecorationClassName}
      bottomDecorationClassName={lobby.bottomDecorationClassName}
    />
  );
}
