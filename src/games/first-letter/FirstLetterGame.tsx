/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { GameSettings, Letter, SuccessSpec, FailureSpec } from '../../shared/types';
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
  buildFirstLetterItems,
  buildLetterChoices,
  FirstLetterItem,
  getActiveFirstLetterLetters,
} from './firstLetterLogic';

interface FirstLetterGameProps {
  settings: GameSettings;
  onExit: () => void;
  onOpenSettings: () => void;
}

const MAX_ROUNDS = 5;
const MAX_ATTEMPTS = 3;

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
        { path: `${locale}/words/${item.word.audioKey}`, fallbackText: `${item.word.word} začína na ${item.firstLetter.symbol}.` },
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

function getWrongAudio(locale: string, selected: Letter) {
  return {
    clips: [
      getPhraseClip(locale, 'thisIs'),
      { path: `${locale}/letters/${selected.audioKey}`, fallbackText: selected.symbol },
      getPhraseClip(locale, 'retry'),
    ],
  };
}

export function FirstLetterGame({ settings, onExit, onOpenSettings }: FirstLetterGameProps) {
  const { wordItems, letterItems, locale } = useContent();
  const [gameState, setGameState] = useState<'HOME' | 'PLAYING'>('HOME');
  const [targetItem, setTargetItem] = useState<FirstLetterItem | null>(null);
  const [roundQueue, setRoundQueue] = useState<FirstLetterItem[]>([]);
  const [choices, setChoices] = useState<Letter[]>([]);
  const [feedback, setFeedback] = useState<Record<string, 'correct' | 'wrong' | null>>({});
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

  const activeLetters = useMemo(
    () => getActiveFirstLetterLetters(letterItems, settings.alphabetAccents),
    [letterItems, settings.alphabetAccents],
  );
  const eligibleItems = useMemo(
    () => buildFirstLetterItems(wordItems, activeLetters),
    [wordItems, activeLetters],
  );
  const lobby = GAME_DEFINITIONS_BY_ID.FIRST_LETTER.lobby;

  const startRound = useCallback((queueOverride?: FirstLetterItem[]) => {
    const currentQueue = queueOverride && queueOverride.length > 0
      ? queueOverride
      : roundQueue.length > 0
        ? roundQueue
        : fisherYatesShuffle(eligibleItems);
    const [nextTarget, ...rest] = currentQueue;
    if (!nextTarget) return;

    setTargetItem(nextTarget);
    setRoundQueue(rest);
    setChoices(buildLetterChoices(nextTarget, activeLetters, 4));
    setFeedback({});
    setWrongAttemptsThisRound(0);
    setShowSuccess(false);
    setShowFailure(false);
    pendingRoundEndRef.current = false;
  }, [activeLetters, eligibleItems, roundQueue]);

  useEffect(() => {
    return () => audioManager.stop();
  }, []);

  useEffect(() => {
    if (gameState !== 'PLAYING' || !targetItem || showSuccess || showFailure || showSessionComplete) return;
    const timer = setTimeout(() => {
      audioManager.play(getPromptAudio(locale, targetItem));
    }, TIMING.AUDIO_DELAY_MS);
    return () => clearTimeout(timer);
  }, [gameState, targetItem, locale, showFailure, showSessionComplete, showSuccess]);

  const handlePlay = () => {
    if (eligibleItems.length === 0 || activeLetters.length < 4) return;
    const queue = fisherYatesShuffle(eligibleItems);
    setRoundQueue(queue);
    setRoundsPlayed(0);
    setCorrectRounds(0);
    setTotalTaps(0);
    setShowSessionComplete(false);
    setGameState('PLAYING');
    startRound(queue);
  };

  const finishRound = (wasCorrect: boolean) => {
    const nextRoundsPlayed = roundsPlayed + 1;
    setRoundsPlayed(nextRoundsPlayed);
    if (wasCorrect) setCorrectRounds((value) => value + 1);

    if (nextRoundsPlayed >= MAX_ROUNDS) {
      setTimeout(() => setShowSessionComplete(true), TIMING.SUCCESS_SHOW_DELAY_MS);
      return;
    }

    setTimeout(() => {
      if (wasCorrect) {
        setShowSuccess(true);
      } else {
        setShowFailure(true);
      }
    }, TIMING.SUCCESS_SHOW_DELAY_MS);
  };

  const handleChoice = (letter: Letter) => {
    if (!targetItem || showSuccess || showFailure || showSessionComplete || pendingRoundEndRef.current) return;
    setTotalTaps((value) => value + 1);

    if (letter.symbol === targetItem.firstLetter.symbol) {
      pendingRoundEndRef.current = true;
      setFeedback((current) => ({ ...current, [letter.symbol]: 'correct' }));
      setSuccessSpec(getSuccessSpec(locale, targetItem));
      finishRound(true);
      return;
    }

    const nextWrongAttempts = wrongAttemptsThisRound + 1;
    setWrongAttemptsThisRound(nextWrongAttempts);
    setFeedback((current) => ({ ...current, [letter.symbol]: 'wrong' }));

    if (nextWrongAttempts >= MAX_ATTEMPTS) {
      pendingRoundEndRef.current = true;
      setFailureSpec(getFailureSpec(locale, targetItem));
      finishRound(false);
      return;
    }

    audioManager.play(getWrongAudio(locale, letter));
    setTimeout(() => {
      setFeedback((current) => ({ ...current, [letter.symbol]: null }));
    }, TIMING.FEEDBACK_RESET_MS);
  };

  if (gameState === 'PLAYING') {
    return (
      <AppScreen>
        <TopBar
          left={<BackButton onClick={() => setGameState('HOME')} />}
          center={<RoundCounter completed={roundsPlayed} total={MAX_ROUNDS} />}
          right={
            <IconButton
              onClick={() => targetItem && audioManager.play(getPromptAudio(locale, targetItem))}
              label="Prehrať zvuk"
            >
              <Volume2 size={24} className="sm:h-7 sm:w-7" />
            </IconButton>
          }
        />

        <div className="flex shrink-0 flex-col items-center justify-center pb-4 text-center">
          <div role="img" aria-label="Hľadané slovo" className="text-[clamp(6rem,24vw,12rem)] leading-none">
            {targetItem?.word.emoji}
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
                className="aspect-square"
              >
                <span className="font-spline text-[clamp(2.75rem,12vw,6rem)] font-bold leading-none">
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
          onComplete={() => setGameState('HOME')}
        />
      </AppScreen>
    );
  }

  return (
    <GameLobby
      title={lobby.title}
      playButtonColorClassName={lobby.playButtonColorClassName}
      subtitle={
        eligibleItems.length === 0 || activeLetters.length < 4
          ? <>Pridajte alebo nahrajte slová, ktoré začínajú dostupnými písmenkami.</>
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
