/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { FailureSpec, NumberItem, SuccessSpec } from '../../shared/types';
import { useContent } from '../../shared/contexts/ContentContext';
import { GameLobby } from '../../shared/components/GameLobby';
import { GAME_DEFINITIONS_BY_ID } from '../../shared/gameCatalog';
import { AppScreen, BackButton, ChoiceTile, IconButton, RoundCounter, TopBar } from '../../shared/ui';
import { QuantityCluster } from '../../shared/components/QuantityCluster';
import { SuccessOverlay } from '../../shared/components/SuccessOverlay';
import { FailureOverlay } from '../../shared/components/FailureOverlay';
import { SessionCompleteOverlay } from '../../shared/components/SessionCompleteOverlay';
import { TIMING, COUNTING_EMOJIS, getItemAnnouncementAudio, getPhraseClip, getWrongAnswerAudio } from '../../shared/contentRegistry';
import { generateCompareGridSlots, CompareGridSlot } from '../../shared/scatterGridLogic';
import { audioManager } from '../../shared/services/audioManager';
import { setE2EState } from '../../shared/services/e2eState';
import { buildAnswerOptions, createAdditionProblem, pairKey } from './additionLogic';

interface AdditionGameProps {
  onExit: () => void;
  onOpenSettings: () => void;
  sumRange: 5 | 10 | 20 | 100;
  representation: 'objects' | 'numerals';
}

interface AdditionRound {
  a: NumberItem;
  b: NumberItem;
  sum: NumberItem;
  options: NumberItem[];
  emoji: string;
  aSlots: CompareGridSlot[];
  bSlots: CompareGridSlot[];
}

const MAX_ROUNDS = 5;
const MAX_ATTEMPTS = 3;
const OPTION_COUNT = 4;

function clearTimer(timerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>) {
  if (timerRef.current) {
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }
}

function formatAddition(locale: string, a: number, b: number, sum: number): string {
  if (locale === 'cs') {
    return `${a} a ${b} je dohromady ${sum}`;
  }
  return `${a} a ${b} je dokopy ${sum}`;
}

function getAdditionAudioClip(locale: string, a: number, b: number, sum: number) {
  const fallbackText = formatAddition(locale, a, b, sum);
  const audioKey = locale === 'cs' ? `${a}-a-${b}-je-dohromady-${sum}` : `${a}-a-${b}-je-dokopy-${sum}`;
  return { path: `${locale}/addition/${audioKey}`, fallbackText };
}

function getSuccessSpec(locale: string, round: AdditionRound): SuccessSpec {
  return {
    echoLine: formatAddition(locale, round.a.value, round.b.value, round.sum.value),
    audioSpec: { clips: [getAdditionAudioClip(locale, round.a.value, round.b.value, round.sum.value)] },
  };
}

function getFailureSpec(locale: string, round: AdditionRound): FailureSpec {
  return {
    echoLine: formatAddition(locale, round.a.value, round.b.value, round.sum.value),
    audioSpec: {
      clips: [
        getPhraseClip(locale, 'neverMind'),
        getAdditionAudioClip(locale, round.a.value, round.b.value, round.sum.value),
      ],
    },
  };
}

export function AdditionGame({ onExit, onOpenSettings, sumRange, representation }: AdditionGameProps) {
  const { locale } = useContent();
  const [gameState, setGameState] = useState<'HOME' | 'PLAYING'>('HOME');
  const lobby = GAME_DEFINITIONS_BY_ID.ADDITION.lobby;

  const [round, setRound] = useState<AdditionRound | null>(null);
  const [feedback, setFeedback] = useState<Record<number, 'correct' | 'wrong' | null>>({});
  const [wrongAttemptsThisRound, setWrongAttemptsThisRound] = useState(0);
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
  const lastPairKeyRef = useRef<string | null>(null);

  const clearTransientTimers = useCallback(() => {
    clearTimer(promptTimerRef);
    clearTimer(roundEndTimerRef);
    feedbackResetTimersRef.current.forEach(clearTimeout);
    feedbackResetTimersRef.current.clear();
  }, []);

  const cleanupPlayEffects = useCallback(() => {
    clearTransientTimers();
    audioManager.stop();
  }, [clearTransientTimers]);

  const resetPlayState = useCallback(() => {
    setRound(null);
    setFeedback({});
    setWrongAttemptsThisRound(0);
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

  const startRound = useCallback(() => {
    clearTransientTimers();

    let problem = createAdditionProblem(sumRange);
    let attempts = 0;
    while (lastPairKeyRef.current === pairKey(problem.a.value, problem.b.value) && attempts < 10) {
      problem = createAdditionProblem(sumRange);
      attempts += 1;
    }
    lastPairKeyRef.current = pairKey(problem.a.value, problem.b.value);

    const options = buildAnswerOptions(problem.sum, sumRange, OPTION_COUNT);
    const emoji = COUNTING_EMOJIS[Math.floor(Math.random() * COUNTING_EMOJIS.length)];

    setRound({
      a: problem.a,
      b: problem.b,
      sum: problem.sum,
      options,
      emoji,
      aSlots: generateCompareGridSlots(problem.a.value, emoji),
      bSlots: generateCompareGridSlots(problem.b.value, emoji),
    });
    setFeedback({});
    setWrongAttemptsThisRound(0);
    setShowSuccess(false);
    setShowFailure(false);
    pendingRoundEndRef.current = false;
  }, [clearTransientTimers, sumRange]);

  useEffect(() => cleanupPlayEffects, [cleanupPlayEffects]);

  useEffect(() => {
    if (gameState !== 'PLAYING' || !round || showSuccess || showFailure || showSessionComplete) return;
    const sessionToken = sessionTokenRef.current;
    clearTimer(promptTimerRef);
    promptTimerRef.current = setTimeout(() => {
      promptTimerRef.current = null;
      if (sessionTokenRef.current !== sessionToken) return;
      audioManager.play({ clips: [getPhraseClip(locale, 'howManyTogether')] });
    }, TIMING.AUDIO_DELAY_MS);
    return () => clearTimer(promptTimerRef);
  }, [gameState, locale, round, showFailure, showSessionComplete, showSuccess]);

  useEffect(() => {
    const overlay = showSessionComplete ? 'session-complete' : showSuccess ? 'success' : showFailure ? 'failure' : null;
    setE2EState({
      overlay,
      correctSum: round?.sum.value ?? null,
      optionValues: round?.options.map((o) => o.value) ?? [],
    });
  }, [round, showFailure, showSessionComplete, showSuccess]);

  const playPromptAudio = useCallback(() => {
    clearTimer(promptTimerRef);
    audioManager.play({ clips: [getPhraseClip(locale, 'howManyTogether')] });
  }, [locale]);

  const handlePlay = () => {
    sessionTokenRef.current += 1;
    cleanupPlayEffects();
    resetPlayState();
    setGameState('PLAYING');
    startRound();
  };

  const handleBackToLobby = () => {
    returnToLobby();
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

  const handleChoice = (option: NumberItem, index: number) => {
    clearTimer(promptTimerRef);
    if (!round || showSuccess || showFailure || showSessionComplete || pendingRoundEndRef.current) return;
    setTotalTaps((value) => value + 1);

    if (option.value === round.sum.value) {
      pendingRoundEndRef.current = true;
      audioManager.play(getItemAnnouncementAudio(locale, 'numbers', option.audioKey, String(option.value)));
      setFeedback((current) => ({ ...current, [index]: 'correct' }));
      setSuccessSpec(getSuccessSpec(locale, round));
      finishRound(true);
      return;
    }

    const nextWrongAttempts = wrongAttemptsThisRound + 1;
    setWrongAttemptsThisRound(nextWrongAttempts);
    setFeedback((current) => ({ ...current, [index]: 'wrong' }));

    if (nextWrongAttempts >= MAX_ATTEMPTS) {
      pendingRoundEndRef.current = true;
      audioManager.stop();
      setFailureSpec(getFailureSpec(locale, round));
      finishRound(false);
      return;
    }

    audioManager.play(getWrongAnswerAudio(locale, 'numbers', option.audioKey, String(option.value)));
    const sessionToken = sessionTokenRef.current;
    const feedbackResetTimer = setTimeout(() => {
      feedbackResetTimersRef.current.delete(feedbackResetTimer);
      if (sessionTokenRef.current !== sessionToken) return;
      setFeedback((current) => ({ ...current, [index]: null }));
    }, TIMING.FEEDBACK_RESET_MS);
    feedbackResetTimersRef.current.add(feedbackResetTimer);
  };

  if (gameState === 'HOME') {
    return (
      <GameLobby
        title={lobby.title}
        playButtonColorClassName={lobby.playButtonColorClassName}
        subtitle={<>Súčet do {sumRange}</>}
        onPlay={handlePlay}
        onBack={onExit}
        onOpenSettings={onOpenSettings}
        topDecorationClassName={lobby.topDecorationClassName}
        bottomDecorationClassName={lobby.bottomDecorationClassName}
      />
    );
  }

  const numeralClassName = 'font-spline text-[clamp(2.5rem,9vw,5rem)] font-black leading-none';

  return (
    <AppScreen contentClassName="gap-3 sm:gap-4 md:gap-5">
      <TopBar
        left={<BackButton onClick={handleBackToLobby} />}
        center={<RoundCounter completed={roundsPlayed} total={MAX_ROUNDS} />}
        right={(
          <IconButton label="Prehrať zvuk" onClick={playPromptAudio}>
            <Volume2 size={24} className="sm:w-7 sm:h-7" />
          </IconButton>
        )}
      />

      {round && (
        <div className="flex flex-1 min-h-0 items-center justify-center gap-6 px-2 sm:gap-10 md:gap-14">
          <div className="grid h-full max-h-[220px] w-full flex-1 min-w-0 max-w-[9.5rem] grid-cols-1 rounded-[24px] bg-white/50 sm:max-h-[280px] sm:max-w-[12rem] sm:rounded-[32px]">
            <QuantityCluster mode={representation} value={round.a.value} slots={round.aSlots} numeralClassName={numeralClassName} />
          </div>
          <span className="shrink-0 font-spline text-4xl font-black text-text-main/60 sm:text-6xl" aria-hidden="true">+</span>
          <div className="grid h-full max-h-[220px] w-full flex-1 min-w-0 max-w-[9.5rem] grid-cols-1 rounded-[24px] bg-white/50 sm:max-h-[280px] sm:max-w-[12rem] sm:rounded-[32px]">
            <QuantityCluster mode={representation} value={round.b.value} slots={round.bSlots} numeralClassName={numeralClassName} />
          </div>
        </div>
      )}

      <div className="grid shrink-0 grid-cols-4 auto-rows-fr gap-3 pb-1 sm:gap-4 sm:pb-2">
        {round?.options.map((option, i) => (
          <ChoiceTile
            key={i}
            onClick={() => handleChoice(option, i)}
            state={feedback[i] ?? 'neutral'}
            className="w-full !aspect-[4/5] text-4xl font-spline sm:!aspect-square sm:text-6xl md:text-7xl"
          >
            {option.value}
          </ChoiceTile>
        ))}
      </div>

      {successSpec && (
        <SuccessOverlay show={showSuccess} spec={successSpec} onComplete={startRound} />
      )}
      {failureSpec && (
        <FailureOverlay show={showFailure} spec={failureSpec} onComplete={startRound} />
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
