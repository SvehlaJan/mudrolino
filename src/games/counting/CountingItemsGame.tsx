/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Volume2, ArrowLeft, RefreshCw } from 'lucide-react';
import { audioManager } from '../../shared/services/audioManager';
import { NUMBER_ITEMS, TIMING, COUNTING_EMOJIS, getNumberItemsInRange, getPhraseClip } from '../../shared/contentRegistry';
import { SlovakNumber, FailureSpec } from '../../shared/types';
import { SuccessOverlay } from '../../shared/components/SuccessOverlay';
import { FailureOverlay } from '../../shared/components/FailureOverlay';
import { SessionCompleteOverlay } from '../../shared/components/SessionCompleteOverlay';
import { GameLobby } from '../../shared/components/GameLobby';

interface CountingItemsGameProps {
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

export function CountingItemsGame({ onExit, onOpenSettings, range }: CountingItemsGameProps) {
  const [gameState, setGameState] = useState<'HOME' | 'PLAYING'>('HOME');
  const [targetItem, setTargetItem] = useState<SlovakNumber | null>(null);
  const [itemPositions, setItemPositions] = useState<ItemPosition[]>([]);
  const [optionItems, setOptionItems] = useState<SlovakNumber[]>([]);
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

  const availableItems = useMemo(() => getNumberItemsInRange(range), [range]);

  useEffect(() => {
    return () => audioManager.stop();
  }, []);

  const generatePositions = useCallback((count: number): ItemPosition[] => {
    const emoji = COUNTING_EMOJIS[Math.floor(Math.random() * COUNTING_EMOJIS.length)];
    const slots = Array.from({ length: 16 }, (_, i) => i)
      .sort(() => Math.random() - 0.5)
      .slice(0, count);
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
    const target = availableItems[Math.floor(Math.random() * availableItems.length)];
    const positions = generatePositions(target.value);

    // Build 4 options (target + 3 others from full NUMBER_ITEMS range up to max)
    const allNumbers = NUMBER_ITEMS.filter(n => n.value <= Math.max(range.end, 10));
    const others = allNumbers.filter(n => n.value !== target.value)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);
    const options = [...others, target].sort(() => 0.5 - Math.random());

    setTargetItem(target);
    setItemPositions(positions);
    setOptionItems(options);
    setFeedback({});
    setShowSuccess(false);
    setShowFailure(false);
    pendingFailureRef.current = false;
    setWrongAttemptsThisRound(0);
  }, [availableItems, range.end, generatePositions]);

  useEffect(() => {
    if (gameState === 'PLAYING' && !targetItem) startNewRound(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [gameState, targetItem, startNewRound]);

  useEffect(() => {
    if (gameState === 'PLAYING') {
      const timer = setTimeout(
        () => audioManager.play({ clips: [getPhraseClip('countItems')] }),
        TIMING.AUDIO_DELAY_MS
      );
      return () => clearTimeout(timer);
    }
  }, [gameState]);

  const handleOptionClick = (item: SlovakNumber, index: number) => {
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
          echoLine: `Správne je ${targetItem.value} ⭐`,
          audioSpec: {
            clips: [
              getPhraseClip('neverMind'),
              getPhraseClip('correctAnswerIs'),
              { path: `numbers/${targetItem.audioKey}`, fallbackText: String(targetItem.value) },
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
        audioManager.play({ clips: [getPhraseClip('retry')] });
        setTimeout(() => setFeedback(prev => ({ ...prev, [index]: null })), TIMING.FEEDBACK_RESET_MS);
      }
    }
  };

  if (gameState === 'HOME') {
    return (
      <GameLobby
        title="SPOČÍTAJ"
        playButtonColorClassName="bg-soft-watermelon"
        subtitle={<>Rozsah: {range.start} - {range.end}</>}
        onPlay={() => setGameState('PLAYING')}
        onBack={onExit}
        onOpenSettings={onOpenSettings}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center p-4 sm:p-8 relative overflow-hidden">
      <button
        onClick={() => setGameState('HOME')}
        aria-label="Späť"
        className="fixed safe-top sm:safe-top-lg safe-left sm:safe-left-lg w-12 h-12 sm:w-14 sm:h-14 bg-white rounded-full flex items-center justify-center text-text-main shadow-block transition-all active:translate-y-2 active:shadow-block-pressed z-20"
      >
        <ArrowLeft size={24} className="sm:w-7 sm:h-7" />
      </button>

      <button
        onClick={() => audioManager.play({ clips: [getPhraseClip('countItems')] })}
        aria-label="Prehrať zvuk"
        className="fixed safe-top sm:safe-top-lg safe-right sm:safe-right-lg w-12 h-12 sm:w-14 sm:h-14 bg-white rounded-full flex items-center justify-center text-text-main shadow-block z-20"
      >
        <Volume2 size={24} className="sm:w-7 sm:h-7" />
      </button>

      <div className="flex-1 w-full max-w-4xl flex flex-col gap-8 sm:gap-12 mt-16 sm:mt-20">
        <div className="flex justify-center">
          <div className="bg-white rounded-full px-6 py-2 shadow-block font-bold text-lg sm:text-xl text-text-main">
            ✓ {roundsPlayed} / {MAX_ROUNDS}
          </div>
        </div>
        <div
          ref={containerRef}
          className="relative flex-1 bg-white/50 rounded-[40px] sm:rounded-[60px] border-4 border-dashed border-shadow/20 overflow-hidden min-h-[300px]"
        >
          {itemPositions.map((pos, i) => (
            <div
              key={`${targetItem?.value}-${i}`}
              aria-hidden="true"
              className="absolute text-6xl sm:text-8xl select-none"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                transform: `translate(-50%, -50%) rotate(${pos.rotation}deg) scale(${pos.scale})`,
              }}
            >
              {pos.emoji}
            </div>
          ))}
          <button
            onClick={startNewRound}
            aria-label="Nové kolo"
            className="absolute bottom-4 right-4 w-12 h-12 bg-white/50 rounded-full flex items-center justify-center text-shadow/40 hover:text-shadow transition-colors"
          >
            <RefreshCw size={24} />
          </button>
        </div>

        <div
          className="grid grid-cols-4 gap-4 sm:gap-8 w-full shrink-0 mb-8 sm:mb-12"
        >
          {optionItems.map((item, i) => (
            <button
              key={i}
              onClick={() => handleOptionClick(item, i)}
              className={`
                w-full aspect-square rounded-[24px] sm:rounded-[32px] flex items-center justify-center text-5xl sm:text-8xl font-bold font-spline transition-all
                ${feedback[i] === 'correct' ? 'bg-success text-primary shadow-block-correct -translate-y-1' : 'bg-white text-text-main shadow-block'}
                ${feedback[i] === 'wrong' ? 'opacity-50 shadow-block-pressed scale-95' : 'active:translate-y-2 active:shadow-block-pressed'}
              `}
            >
              {item.value}
            </button>
          ))}
        </div>
      </div>

      {targetItem && (
        <SuccessOverlay
          show={showSuccess}
          spec={{ echoLine: `Správne, je ich ${targetItem.value} ⭐` }}
          onComplete={startNewRound}
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
    </div>
  );
}
