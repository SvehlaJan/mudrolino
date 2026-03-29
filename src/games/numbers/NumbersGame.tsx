/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion } from 'motion/react';
import { Volume2, ArrowLeft, Play, Settings } from 'lucide-react';
import { audioManager } from '../../shared/services/audioManager';
import { NUMBER_ITEMS, COLORS, TIMING } from '../../shared/contentRegistry';
import { ContentItem } from '../../shared/types';
import { SuccessOverlay } from '../../shared/components/SuccessOverlay';

interface NumbersGameProps {
  onExit: () => void;
  onOpenSettings: () => void;
  range: { start: number; end: number };
}

export function NumbersGame({ onExit, onOpenSettings, range }: NumbersGameProps) {
  const [gameState, setGameState] = useState<'HOME' | 'PLAYING'>('HOME');
  const [targetItem, setTargetItem] = useState<ContentItem | null>(null);
  const [gridItems, setGridItems] = useState<ContentItem[]>([]);
  const [feedback, setFeedback] = useState<{ [key: number]: 'correct' | 'wrong' | null }>({});
  const [showSuccess, setShowSuccess] = useState(false);

  const availableItems = useMemo(
    () => NUMBER_ITEMS.filter(item => {
      const n = parseInt(item.symbol, 10);
      return n >= range.start && n <= range.end;
    }),
    [range]
  );

  const targetItemRef = useRef<ContentItem | null>(null);
  useEffect(() => {
    targetItemRef.current = targetItem;
  }, [targetItem]);

  const startNewRound = useCallback(() => {
    if (availableItems.length === 0) return;
    let target = availableItems[Math.floor(Math.random() * availableItems.length)];
    const current = targetItemRef.current;
    if (current && availableItems.length > 1) {
      while (target.symbol === current.symbol) {
        target = availableItems[Math.floor(Math.random() * availableItems.length)];
      }
    }
    const others = availableItems.filter(n => n.symbol !== target.symbol)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);
    const grid = [...others, target].sort(() => 0.5 - Math.random());
    setTargetItem(target);
    setGridItems(grid);
    setFeedback({});
    setShowSuccess(false);
  }, [availableItems]);

  useEffect(() => {
    if (gameState === 'PLAYING' && targetItem) {
      const timer = setTimeout(() => audioManager.playNumber(targetItem), TIMING.AUDIO_DELAY_MS);
      return () => clearTimeout(timer);
    }
  }, [gameState, targetItem]);

  useEffect(() => {
    if (gameState === 'PLAYING' && !targetItem) startNewRound();
  }, [gameState, targetItem, startNewRound]);

  const handleNumberClick = (item: ContentItem, index: number) => {
    if (showSuccess || !targetItem) return;
    if (item.symbol === targetItem.symbol) {
      setFeedback(prev => ({ ...prev, [index]: 'correct' }));
      setTimeout(() => setShowSuccess(true), TIMING.SUCCESS_SHOW_DELAY_MS);
    } else {
      setFeedback(prev => ({ ...prev, [index]: 'wrong' }));
      audioManager.playAnnouncement('wrong-number', targetItem);
      setTimeout(() => setFeedback(prev => ({ ...prev, [index]: null })), TIMING.FEEDBACK_RESET_MS);
    }
  };

  if (gameState === 'HOME') {
    return (
      <div className="min-h-screen relative bg-bg-light flex flex-col">
        <div className="absolute top-4 left-4 sm:top-8 sm:left-8 flex gap-4 z-20">
          <button
            onClick={onExit}
            className="w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-full shadow-block flex items-center justify-center text-shadow transition-transform active:scale-95"
          >
            <ArrowLeft size={24} className="sm:w-8 sm:h-8" />
          </button>
        </div>
        <button
          onClick={onOpenSettings}
          className="absolute top-4 right-4 sm:top-8 sm:right-8 w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-full shadow-block flex items-center justify-center text-shadow transition-transform active:scale-95 z-20"
        >
          <Settings size={24} className="sm:w-8 sm:h-8" />
        </button>
        <div className="flex-1 flex flex-col items-center justify-center p-4 py-8 sm:py-12">
          <div className="mb-8 sm:mb-12 md:mb-20 text-center w-full px-4 py-4 shrink-0">
            <h1 className="text-5xl sm:text-7xl md:text-[120px] font-black flex flex-wrap justify-center gap-2 sm:gap-4 select-none leading-tight">
              {'ČÍSLA'.split('').map((char, i) => (
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
            className="w-32 h-32 sm:w-48 md:w-60 sm:h-48 md:h-60 bg-accent-blue rounded-full shadow-block flex items-center justify-center text-white transition-all shrink-0"
          >
            <Play size={48} className="sm:w-20 sm:h-20 md:w-[100px] md:h-[100px] ml-2 sm:ml-4" fill="currentColor" />
          </motion.button>
        </div>
        <div className="absolute top-1/4 left-4 sm:left-10 w-20 h-20 sm:w-32 sm:h-32 rounded-3xl bg-primary opacity-30 -rotate-12 blur-sm pointer-events-none" />
        <div className="absolute bottom-10 right-4 sm:bottom-20 sm:right-20 w-32 h-32 sm:w-48 sm:h-48 rounded-full bg-success opacity-20 translate-y-10 blur-md pointer-events-none" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-8">
      <button
        onClick={() => setGameState('HOME')}
        className="fixed top-4 left-4 sm:top-8 sm:left-8 w-12 h-12 sm:w-14 sm:h-14 bg-white rounded-full flex items-center justify-center text-text-main shadow-block transition-all active:translate-y-2 active:shadow-block-pressed z-20"
      >
        <ArrowLeft size={24} className="sm:w-7 sm:h-7" />
      </button>
      <div className="flex flex-col items-center gap-4 sm:gap-8 mb-8 sm:mb-12">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => targetItem && audioManager.playNumber(targetItem)}
          className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-full shadow-block flex items-center justify-center text-text-main"
        >
          <Volume2 size={32} className="sm:w-10 sm:h-10" />
        </motion.button>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:gap-8 w-full max-w-3xl px-4">
        {gridItems.map((item, i) => (
          <motion.button
            key={i}
            onClick={() => handleNumberClick(item, i)}
            animate={feedback[i] === 'wrong' ? { x: [-10, 10, -10, 10, 0] } : {}}
            className={`
              w-full aspect-square rounded-[24px] sm:rounded-[32px] flex items-center justify-center text-6xl sm:text-[120px] font-bold font-spline transition-all
              ${feedback[i] === 'correct' ? 'bg-success text-primary shadow-block-correct -translate-y-1' : 'bg-white text-text-main shadow-block'}
              ${feedback[i] === 'wrong' ? 'opacity-50 shadow-block-pressed scale-95' : 'active:translate-y-2 active:shadow-block-pressed'}
            `}
          >
            {item.symbol}
          </motion.button>
        ))}
      </div>
      {targetItem && (
        <SuccessOverlay show={showSuccess} item={targetItem} onComplete={startNewRound} />
      )}
    </div>
  );
}
