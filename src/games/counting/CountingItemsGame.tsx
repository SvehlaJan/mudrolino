/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion } from 'motion/react';
import { Volume2, ArrowLeft, Play, Settings, RefreshCw } from 'lucide-react';
import { audioManager } from '../../shared/services/audioManager';
import { NUMBER_ITEMS, COLORS, TIMING, COUNTING_EMOJIS, getNumberItemsInRange } from '../../shared/contentRegistry';
import { SlovakNumber, FailureSpec } from '../../shared/types';
import { SuccessOverlay } from '../../shared/components/SuccessOverlay';
import { FailureOverlay } from '../../shared/components/FailureOverlay';
import { SessionCompleteOverlay } from '../../shared/components/SessionCompleteOverlay';

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
  const [roundsCompleted, setRoundsCompleted] = useState(0);
  const [totalTaps, setTotalTaps] = useState(0);
  const [showSessionComplete, setShowSessionComplete] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const pendingFailureRef = useRef(false);

  const availableItems = useMemo(() => getNumberItemsInRange(range), [range]);

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
        () => audioManager.play({ sequence: ['phrases/spocitaj-predmety'], fallbackText: 'Spočítaj predmety' }),
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
      const nextRoundsCompleted = roundsCompleted + 1;
      setRoundsCompleted(nextRoundsCompleted);
      if (nextRoundsCompleted >= MAX_ROUNDS) {
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
            sequence: ['phrases/nevadi', 'phrases/spravna-odpoved', `numbers/${targetItem.audioKey}`],
            fallbackText: `Nevadí! Správna odpoveď je ${targetItem.value}.`,
          },
        });
        setTimeout(() => setShowFailure(true), TIMING.SUCCESS_SHOW_DELAY_MS);
      } else {
        audioManager.play({ sequence: ['phrases/skus-to-znova'], fallbackText: 'Skús to znova.' });
        setTimeout(() => setFeedback(prev => ({ ...prev, [index]: null })), TIMING.FEEDBACK_RESET_MS);
      }
    }
  };

  if (gameState === 'HOME') {
    return (
      <div className="min-h-screen relative bg-bg-light flex flex-col">
        <div className="absolute safe-top sm:safe-top-lg safe-left sm:safe-left-lg flex gap-4 z-20">
          <button
            onClick={onExit}
            aria-label="Späť"
            className="w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-full shadow-block flex items-center justify-center text-shadow transition-transform active:scale-95"
          >
            <ArrowLeft size={24} className="sm:w-8 sm:h-8" />
          </button>
        </div>
        <button
          onClick={onOpenSettings}
          aria-label="Nastavenia"
          className="absolute safe-top sm:safe-top-lg safe-right sm:safe-right-lg w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-full shadow-block flex items-center justify-center text-shadow transition-transform active:scale-95 z-20"
        >
          <Settings size={24} className="sm:w-8 sm:h-8" />
        </button>
        <div className="flex-1 flex flex-col items-center justify-center p-4 py-8 sm:py-12">
          <div className="mb-8 sm:mb-12 md:mb-20 text-center w-full px-4 py-4 shrink-0">
            <h1 className="text-5xl sm:text-7xl md:text-[120px] font-black flex flex-wrap justify-center gap-2 sm:gap-4 select-none leading-tight">
              {'SPOČÍTAJ'.split('').map((char, i) => (
                <span
                  key={i}
                  className={`${COLORS[i % COLORS.length]} inline-block py-2`}
                  style={{
                    transform: `rotate(${Math.sin(i) * 10}deg) translateY(${Math.cos(i) * 10}px)`,
                    textShadow: '0px 4px 0px white, 0px 8px 0px var(--color-shadow)',
                  }}
                >
                  {char}
                </span>
              ))}
            </h1>
            <p className="text-2xl sm:text-3xl font-bold opacity-50 mt-4">
              Rozsah: {range.start} - {range.end}
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05, y: -5 }}
            whileTap={{ scale: 0.95, y: 5 }}
            onClick={() => setGameState('PLAYING')}
            aria-label="Hrať"
            className="w-32 h-32 sm:w-48 md:w-60 sm:h-48 md:h-60 bg-soft-watermelon rounded-full shadow-block flex items-center justify-center text-white transition-all shrink-0"
          >
            <Play size={48} className="sm:w-20 sm:h-20 md:w-[100px] md:h-[100px] ml-2 sm:ml-4" fill="currentColor" />
          </motion.button>
        </div>
      </div>
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

      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => audioManager.play({ sequence: ['phrases/spocitaj-predmety'], fallbackText: 'Spočítaj predmety' })}
        aria-label="Prehrať zvuk"
        className="fixed safe-top sm:safe-top-lg safe-right sm:safe-right-lg w-12 h-12 sm:w-14 sm:h-14 bg-white rounded-full flex items-center justify-center text-text-main shadow-block z-20"
      >
        <Volume2 size={24} className="sm:w-7 sm:h-7" />
      </motion.button>

      <div className="flex-1 w-full max-w-4xl flex flex-col gap-8 sm:gap-12 mt-16 sm:mt-20">
        <div className="flex justify-center">
          <div className="bg-white rounded-full px-6 py-2 shadow-block font-bold text-lg sm:text-xl text-text-main">
            ✓ {roundsCompleted} / {MAX_ROUNDS}
          </div>
        </div>
        <div
          ref={containerRef}
          className="relative flex-1 bg-white/50 rounded-[40px] sm:rounded-[60px] border-4 border-dashed border-shadow/20 overflow-hidden min-h-[300px]"
        >
          {itemPositions.map((pos, i) => (
            <motion.div
              key={`${targetItem?.value}-${i}`}
              aria-hidden="true"
              initial={{ scale: 0, opacity: 0, rotate: -180 }}
              animate={{ scale: pos.scale, opacity: 1, rotate: pos.rotation }}
              exit={{ scale: 0, opacity: 0, rotate: 180 }}
              transition={{ type: 'spring', damping: 12, stiffness: 100, delay: i * 0.05 }}
              className="absolute text-6xl sm:text-8xl select-none"
              style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%, -50%)' }}
            >
              {pos.emoji}
            </motion.div>
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
            <motion.button
              key={i}
              onClick={() => handleOptionClick(item, i)}
              animate={feedback[i] === 'wrong' ? { x: [-10, 10, -10, 10, 0] } : {}}
              className={`
                w-full aspect-square rounded-[24px] sm:rounded-[32px] flex items-center justify-center text-5xl sm:text-8xl font-bold font-spline transition-all
                ${feedback[i] === 'correct' ? 'bg-success text-primary shadow-block-correct -translate-y-1' : 'bg-white text-text-main shadow-block'}
                ${feedback[i] === 'wrong' ? 'opacity-50 shadow-block-pressed scale-95' : 'active:translate-y-2 active:shadow-block-pressed'}
              `}
            >
              {item.value}
            </motion.button>
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
        roundsCompleted={roundsCompleted}
        totalTaps={totalTaps}
        maxRounds={MAX_ROUNDS}
        onComplete={() => setGameState('HOME')}
      />
    </div>
  );
}
