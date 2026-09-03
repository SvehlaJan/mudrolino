/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { audioManager } from '../../shared/services/audioManager';
import { TIMING, COUNTING_EMOJIS, getItemAnnouncementAudio, getPhraseClip, getWrongAnswerAudio } from '../../shared/contentRegistry';
import { useContent } from '../../shared/contexts/ContentContext';
import { fisherYatesShuffle } from '../../shared/utils';
import { NumberItem } from '../../shared/types';
import { AppScreen, BackButton, ChoiceTile, IconButton, RoundCounter, TopBar } from '../../shared/ui';
import { SuccessOverlay } from '../../shared/components/SuccessOverlay';
import { SessionCompleteOverlay } from '../../shared/components/SessionCompleteOverlay';
import { GameLobby } from '../../shared/components/GameLobby';
import { GAME_DEFINITIONS_BY_ID } from '../../shared/gameCatalog';
import { setE2EState } from '../../shared/services/e2eState';

interface CompareQuantitiesGameProps {
  onExit: () => void;
  onOpenSettings: () => void;
  range: { start: number; end: number };
  mode: 'objects' | 'numerals';
}

type Side = 'left' | 'right';

interface RoundState {
  left: NumberItem;
  right: NumberItem;
  correctSide: Side;
  emoji: string;
}

function pairKey(a: number, b: number): string {
  return [a, b].sort((x, y) => x - y).join('-');
}

export function CompareQuantitiesGame({ onExit, onOpenSettings, range, mode }: CompareQuantitiesGameProps) {
  const { numberItems, locale } = useContent();
  const [gameState, setGameState] = useState<'HOME' | 'PLAYING'>('HOME');
  const lobby = GAME_DEFINITIONS_BY_ID.COMPARE_QUANTITIES.lobby;
  const [round, setRound] = useState<RoundState | null>(null);
  const [pileState, setPileState] = useState<Record<Side, 'neutral' | 'correct'>>({ left: 'neutral', right: 'neutral' });
  const [wrongSide, setWrongSide] = useState<Side | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const MAX_ROUNDS = 5;
  const [roundsPlayed, setRoundsPlayed] = useState(0);
  const [correctRounds, setCorrectRounds] = useState(0);
  const [totalTaps, setTotalTaps] = useState(0);
  const [showSessionComplete, setShowSessionComplete] = useState(false);
  const lastPairKeyRef = useRef<string | null>(null);

  const availableItems = useMemo(
    () => numberItems.filter((n) => n.value >= range.start && n.value <= range.end),
    [numberItems, range],
  );

  useEffect(() => {
    return () => audioManager.stop();
  }, []);

  const startNewRound = useCallback(() => {
    if (availableItems.length < 2) return;
    let a: NumberItem;
    let b: NumberItem;
    let attempts = 0;
    do {
      [a, b] = fisherYatesShuffle(availableItems).slice(0, 2);
      attempts += 1;
    } while (lastPairKeyRef.current === pairKey(a.value, b.value) && attempts < 10);
    lastPairKeyRef.current = pairKey(a.value, b.value);

    const emoji = COUNTING_EMOJIS[Math.floor(Math.random() * COUNTING_EMOJIS.length)];
    const correctSide: Side = a.value > b.value ? 'left' : 'right';

    setRound({ left: a, right: b, correctSide, emoji });
    setPileState({ left: 'neutral', right: 'neutral' });
    setWrongSide(null);
    setShowSuccess(false);
  }, [availableItems]);

  useEffect(() => {
    if (gameState === 'PLAYING' && !round) startNewRound(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [gameState, round, startNewRound]);

  useEffect(() => {
    if (gameState === 'PLAYING') {
      const timer = setTimeout(
        () => audioManager.play({ clips: [getPhraseClip(locale, 'whereIsMore')] }),
        TIMING.AUDIO_DELAY_MS,
      );
      return () => clearTimeout(timer);
    }
  }, [gameState, locale]);

  useEffect(() => {
    const overlay = showSessionComplete ? 'session-complete' : showSuccess ? 'success' : null;
    setE2EState({
      overlay,
      correctSide: round?.correctSide ?? null,
      wrongSide,
    });
  }, [round, showSuccess, showSessionComplete, wrongSide]);

  const handleTap = (side: Side) => {
    if (!round || showSuccess || showSessionComplete) return;
    setTotalTaps((prev) => prev + 1);
    const item = round[side];

    if (side === round.correctSide) {
      audioManager.play(getItemAnnouncementAudio(locale, 'numbers', item.audioKey, String(item.value)));
      setPileState((prev) => ({ ...prev, [side]: 'correct' }));
      const nextRoundsPlayed = roundsPlayed + 1;
      setRoundsPlayed(nextRoundsPlayed);
      setCorrectRounds((prev) => prev + 1);
      if (nextRoundsPlayed >= MAX_ROUNDS) {
        setTimeout(() => setShowSessionComplete(true), TIMING.SUCCESS_SHOW_DELAY_MS);
      } else {
        setTimeout(() => setShowSuccess(true), TIMING.SUCCESS_SHOW_DELAY_MS);
      }
    } else {
      audioManager.play(getWrongAnswerAudio(locale, 'numbers', item.audioKey, String(item.value)));
      setWrongSide(side);
    }
  };

  if (gameState === 'HOME') {
    return (
      <GameLobby
        title={lobby.title}
        playButtonColorClassName={lobby.playButtonColorClassName}
        subtitle={<>Rozsah: {range.start} - {range.end}</>}
        onPlay={() => setGameState('PLAYING')}
        onBack={onExit}
        onOpenSettings={onOpenSettings}
        topDecorationClassName={lobby.topDecorationClassName}
        bottomDecorationClassName={lobby.bottomDecorationClassName}
      />
    );
  }

  return (
    <AppScreen contentClassName="gap-3 sm:gap-4 md:gap-5">
      <TopBar
        left={<BackButton onClick={() => setGameState('HOME')} />}
        center={<RoundCounter completed={roundsPlayed} total={MAX_ROUNDS} />}
        right={(
          <IconButton label="Prehrať zvuk" onClick={() => audioManager.play({ clips: [getPhraseClip(locale, 'whereIsMore')] })}>
            <Volume2 size={24} className="sm:w-7 sm:h-7" />
          </IconButton>
        )}
      />

      {round && (
        <div className="grid grid-cols-2 gap-4 sm:gap-6 flex-1 min-h-0">
          {(['left', 'right'] as const).map((side) => (
            <ChoiceTile
              key={side}
              shape="option"
              state={pileState[side] === 'correct' ? 'correct' : 'neutral'}
              disabled={wrongSide === side}
              onClick={() => handleTap(side)}
              aria-label={side === 'left' ? 'Ľavá skupina' : 'Pravá skupina'}
              className="h-full !rounded-[30px] sm:!rounded-[40px]"
            >
              {mode === 'numerals' ? (
                <span className="text-6xl font-spline sm:text-8xl">{round[side].value}</span>
              ) : (
                <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-2 max-w-[85%]">
                  {Array.from({ length: round[side].value }).map((_, i) => (
                    <span key={i} aria-hidden="true" className="text-3xl sm:text-5xl select-none">
                      {round.emoji}
                    </span>
                  ))}
                </div>
              )}
            </ChoiceTile>
          ))}
        </div>
      )}

      {round && (
        <SuccessOverlay
          show={showSuccess}
          spec={{ echoLine: `${round[round.correctSide].value} ⭐` }}
          onComplete={startNewRound}
        />
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
