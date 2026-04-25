/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Volume2, RefreshCw } from 'lucide-react';
import { audioManager } from '../../shared/services/audioManager';
import { TIMING, COUNTING_EMOJIS, getNumberItemsInRange, getLocaleContent, getPhraseClip } from '../../shared/contentRegistry';
import { fisherYatesShuffle } from '../../shared/utils';
import { NumberItem, FailureSpec } from '../../shared/types';
import { AppScreen, BackButton, Card, ChoiceTile, IconButton, RoundCounter, TopBar } from '../../shared/ui';
import { SuccessOverlay } from '../../shared/components/SuccessOverlay';
import { FailureOverlay } from '../../shared/components/FailureOverlay';
import { SessionCompleteOverlay } from '../../shared/components/SessionCompleteOverlay';
import { GameLobby } from '../../shared/components/GameLobby';
import { GAME_DEFINITIONS_BY_ID } from '../../shared/gameCatalog';

interface CountingItemsGameProps {
  locale: string;
  onExit: () => void;
  onOpenSettings: () => void;
  range: { start: number; end: number };
}

interface ItemPosition {
  x: number;
  y: number;
  emoji: string;
  rotation: number;
  scale: number;
}

export function CountingItemsGame({ locale, onExit, onOpenSettings, range }: CountingItemsGameProps) {
  const [gameState, setGameState] = useState<'HOME' | 'PLAYING'>('HOME');
  const lobby = GAME_DEFINITIONS_BY_ID.COUNTING_ITEMS.lobby;
  const [targetItem, setTargetItem] = useState<NumberItem | null>(null);
  const [itemPositions, setItemPositions] = useState<ItemPosition[]>([]);
  const [optionItems, setOptionItems] = useState<NumberItem[]>([]);
  const [feedback, setFeedback] = useState<{ [key: number]: 'correct' | 'wrong' | null }>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const MAX_ROUNDS = 5;
  const MAX_ATTEMPTS = 3;
  const [wrongAttemptsThisRound, setWrongAttemptsThisRound] = useState(0);
  const [showFailure, setShowFailure] = useState(false);
  const [failureSpec, setFailureSpec] = useState<FailureSpec | null>(null);
  const [roundsPlayed, setRoundsPlayed] = useState(0);
  const [correctRounds, setCorrectRounds] = useState(0);
  const [totalTaps, setTotalTaps] = useState(0);
  const [showSessionComplete, setShowSessionComplete] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const pendingFailureRef = useRef(false);

  const availableItems = useMemo(() => getNumberItemsInRange(locale, range), [locale, range]);

  const queueRef = useRef<NumberItem[]>([]);

  useEffect(() => {
    queueRef.current = [];
  }, [availableItems]);

  useEffect(() => {
    return () => audioManager.stop();
  }, []);

  const generatePositions = useCallback((count: number): ItemPosition[] => {
    const emoji = COUNTING_EMOJIS[Math.floor(Math.random() * COUNTING_EMOJIS.length)];
    const slots = fisherYatesShuffle(Array.from({ length: 16 }, (_, i) => i)).slice(0, count);
    const padding = 15;
    const usableSize = 100 - 2 * padding;
    const cellSize = usableSize / 4;
    return slots.map(slotIndex => {
      const row = Math.floor(slotIndex / 4);
      const col = slotIndex % 4;
      const centerX = padding + (col + 0.5) * cellSize;
      const centerY = padding + (row + 0.5) * cellSize;
      return {
        x: centerX + (Math.random() - 0.5) * cellSize * 0.4,
        y: centerY + (Math.random() - 0.5) * cellSize * 0.4,
        emoji,
        rotation: Math.random() * 40 - 20,
        scale: 0.9 + Math.random() * 0.3,
      };
    });
  }, []);

  const startNewRound = useCallback(() => {
    if (availableItems.length === 0) return;
    if (queueRef.current.length === 0) {
      queueRef.current = fisherYatesShuffle(availableItems);
    }
    const target = queueRef.current.shift()!;
    const positions = generatePositions(target.value);

    // Build 4 options (target + 3 others from full number items range up to max)
    const allNumbers = getLocaleContent(locale).numberItems.filter((n) => n.value <= Math.max(range.end, 10));
    const others = fisherYatesShuffle(
      allNumbers.filter(n => n.value !== target.value)
    ).slice(0, 3);
    const options = fisherYatesShuffle([...others, target]);

    setTargetItem(target);
    setItemPositions(positions);
    setOptionItems(options);
    setFeedback({});
    setShowSuccess(false);
    setShowFailure(false);
    pendingFailureRef.current = false;
    setWrongAttemptsThisRound(0);
  }, [availableItems, locale, range.end, generatePositions]);

  useEffect(() => {
    if (gameState === 'PLAYING' && !targetItem) startNewRound();
  }, [gameState, targetItem, startNewRound]);

  useEffect(() => {
    if (gameState === 'PLAYING') {
      const timer = setTimeout(
        () => audioManager.play({ clips: [getPhraseClip(locale, 'countItems')] }),
        TIMING.AUDIO_DELAY_MS
      );
      return () => clearTimeout(timer);
    }
  }, [gameState, locale]);

  const handleOptionClick = (item: NumberItem, index: number) => {
    if (showSuccess || showFailure || pendingFailureRef.current || showSessionComplete || !targetItem) return;
    setTotalTaps(prev => prev + 1);
    if (item.value === targetItem.value) {
      setFeedback(prev => ({ ...prev, [index]: 'correct' }));
      const nextRoundsPlayed = roundsPlayed + 1;
      setRoundsPlayed(nextRoundsPlayed);
      setCorrectRounds(prev => prev + 1);
      if (nextRoundsPlayed >= MAX_ROUNDS) {
        setTimeout(() => setShowSessionComplete(true), TIMING.SUCCESS_SHOW_DELAY_MS);
      } else {
        setTimeout(() => setShowSuccess(true), TIMING.SUCCESS_SHOW_DELAY_MS);
      }
    } else {
      const nextWrong = wrongAttemptsThisRound + 1;
      setWrongAttemptsThisRound(nextWrong);
      setFeedback(prev => ({ ...prev, [index]: 'wrong' }));
      if (nextWrong >= MAX_ATTEMPTS) {
        pendingFailureRef.current = true;
        setFailureSpec({
          echoLine: `${targetItem.value} ⭐`,
          audioSpec: {
            clips: [
              getPhraseClip(locale, 'neverMind'),
              getPhraseClip(locale, 'itIs'),
              { path: `${locale}/numbers/${targetItem.audioKey}`, fallbackText: String(targetItem.value) },
            ],
          },
        });
        const nextRoundsPlayed = roundsPlayed + 1;
        setRoundsPlayed(nextRoundsPlayed);
        if (nextRoundsPlayed >= MAX_ROUNDS) {
          setTimeout(() => setShowSessionComplete(true), TIMING.SUCCESS_SHOW_DELAY_MS);
        } else {
          setTimeout(() => setShowFailure(true), TIMING.SUCCESS_SHOW_DELAY_MS);
        }
      } else {
        audioManager.play({
          clips: [
            getPhraseClip(locale, 'thisIs'),
            { path: `${locale}/numbers/${item.audioKey}`, fallbackText: String(item.value) },
            getPhraseClip(locale, 'retry'),
          ],
        });
        setTimeout(() => setFeedback(prev => ({ ...prev, [index]: null })), TIMING.FEEDBACK_RESET_MS);
      }
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
      />
    );
  }

  return (
    <AppScreen contentClassName="gap-3 sm:gap-4 md:gap-5">
      <TopBar
        left={<BackButton onClick={() => setGameState('HOME')} />}
        center={<RoundCounter completed={roundsPlayed} total={MAX_ROUNDS} />}
        right={(
          <IconButton label="Prehrať zvuk" onClick={() => audioManager.play({ clips: [getPhraseClip(locale, 'countItems')] })}>
            <Volume2 size={24} className="sm:w-7 sm:h-7" />
          </IconButton>
        )}
      />

      <Card
        ref={containerRef}
        className="relative flex-1 min-h-[220px] overflow-hidden !rounded-[30px] !border-4 !border-dashed !border-shadow/20 !bg-white/50 !p-0 !shadow-none sm:!rounded-[44px]"
      >
        {itemPositions.map((pos, i) => (
          <div
            key={`${targetItem?.value}-${i}`}
            aria-hidden="true"
            className="absolute text-5xl sm:text-7xl md:text-8xl select-none"
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              transform: `translate(-50%, -50%) rotate(${pos.rotation}deg) scale(${pos.scale})`,
            }}
          >
            {pos.emoji}
          </div>
        ))}
        <IconButton
          onClick={startNewRound}
          label="Nové kolo"
          className="absolute bottom-4 right-4 !bg-white/50 text-shadow/40 hover:text-shadow"
        >
          <RefreshCw size={24} />
        </IconButton>
      </Card>

      <div className="grid grid-cols-4 auto-rows-fr gap-3 sm:gap-4 md:gap-5 w-full shrink-0 pb-1 sm:pb-2">
        {optionItems.map((item, i) => (
          <ChoiceTile
            key={i}
            onClick={() => handleOptionClick(item, i)}
            state={feedback[i] ?? 'neutral'}
            className="w-full !aspect-[4/5] text-4xl font-spline sm:!aspect-square sm:text-6xl md:text-7xl"
          >
            {item.value}
          </ChoiceTile>
        ))}
      </div>

      {targetItem && (
        <SuccessOverlay
          show={showSuccess}
          spec={{ echoLine: `Správne, je ich ${targetItem.value} ⭐` }}
          onComplete={startNewRound}
          locale={locale}
        />
      )}
      {failureSpec && (
        <FailureOverlay show={showFailure} spec={failureSpec} onComplete={startNewRound} />
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
