/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Play, Settings, RefreshCw } from 'lucide-react';
import { audioManager } from '../../shared/services/audioManager';
import { COLORS } from '../../shared/constants';

interface CountingItemsGameProps {
  onExit: () => void;
  onOpenSettings: () => void;
  range: { start: number; end: number };
}

const EMOJIS = ['🍎', '⭐️', '🚗', '🐶', '🍦', '🎈', '🍭', '⚽️', '🦋', '🌈'];

interface ItemPosition {
  x: number;
  y: number;
  emoji: string;
  rotation: number;
  scale: number;
}

export function CountingItemsGame({ onExit, onOpenSettings, range }: CountingItemsGameProps) {
  const [gameState, setGameState] = useState<'HOME' | 'PLAYING'>('HOME');
  const [targetCount, setTargetCount] = useState<number | null>(null);
  const [itemPositions, setItemPositions] = useState<ItemPosition[]>([]);
  const [options, setOptions] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<{ [key: number]: 'correct' | 'wrong' | null }>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const generatePositions = useCallback((count: number) => {
    const emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    
    // Create 16 grid slots (4x4)
    const slots = [];
    for (let i = 0; i < 16; i++) {
      slots.push(i);
    }
    
    // Shuffle slots and pick the required number
    const shuffledSlots = [...slots].sort(() => Math.random() - 0.5);
    const selectedSlots = shuffledSlots.slice(0, count);
    
    const padding = 15; // Padding from container edges in %
    const usableSize = 100 - 2 * padding;
    const cellSize = usableSize / 4;
    
    return selectedSlots.map(slotIndex => {
      const row = Math.floor(slotIndex / 4);
      const col = slotIndex % 4;
      
      // Center of the cell in %
      const centerX = padding + (col + 0.5) * cellSize;
      const centerY = padding + (row + 0.5) * cellSize;
      
      // Add some jitter within the cell (up to 40% of cell size) to make it look natural but separated
      const jitterX = (Math.random() - 0.5) * cellSize * 0.4;
      const jitterY = (Math.random() - 0.5) * cellSize * 0.4;
      
      return {
        x: centerX + jitterX,
        y: centerY + jitterY,
        emoji,
        rotation: Math.random() * 40 - 20,
        scale: 0.9 + Math.random() * 0.3
      };
    });
  }, []);

  const startNewRound = useCallback(() => {
    const count = Math.floor(Math.random() * (range.end - range.start + 1)) + range.start;
    const positions = generatePositions(count);
    
    // Generate 4 options
    const availableNumbers = [];
    for (let i = 1; i <= Math.max(range.end, 10); i++) availableNumbers.push(i);
    
    const others = availableNumbers
      .filter(n => n !== count)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);
    
    const gridOptions = [...others, count].sort(() => 0.5 - Math.random());
    
    setTargetCount(count);
    setItemPositions(positions);
    setOptions(gridOptions);
    setFeedback({});
    setShowSuccess(false);
  }, [range, generatePositions]);

  useEffect(() => {
    if (gameState === 'PLAYING' && targetCount === null) {
      startNewRound();
    }
  }, [gameState, targetCount, startNewRound]);

  useEffect(() => {
    if (gameState === 'PLAYING') {
      // Small delay to ensure browser speech engine is ready after user interaction
      const timer = setTimeout(() => {
        audioManager.playWord("Spočítaj predmety");
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [gameState]);

  const handleOptionClick = (num: number, index: number) => {
    if (showSuccess) return;
    
    if (num === targetCount) {
      setFeedback(prev => ({ ...prev, [index]: 'correct' }));
      audioManager.playWord(`Áno, je ich ${num}.`);
      audioManager.playPraise();
      
      setTimeout(() => setShowSuccess(true), 500);
      setTimeout(() => {
        startNewRound();
      }, 3000);
    } else {
      setFeedback(prev => ({ ...prev, [index]: 'wrong' }));
      audioManager.playWord(`${num} to nie je. Skús to znova.`);
      
      setTimeout(() => {
        setFeedback(prev => ({ ...prev, [index]: null }));
      }, 500);
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
              {"SPOČÍTAJ".split('').map((char, i) => (
                <span 
                  key={i} 
                  className={`${COLORS[i % COLORS.length]} inline-block py-2`}
                  style={{ 
                    transform: `rotate(${Math.sin(i) * 10}deg) translateY(${Math.cos(i) * 10}px)`,
                    textShadow: '0px 4px 0px white, 0px 8px 0px var(--color-shadow)'
                  }}
                >
                  {char}
                </span>
              ))}
            </h1>
            <p className="text-2xl sm:text-3xl font-bold opacity-50 mt-4">Rozsah: {range.start} - {range.end}</p>
          </div>

          <motion.button 
            whileHover={{ scale: 1.05, y: -5 }}
            whileTap={{ scale: 0.95, y: 5 }}
            onClick={() => setGameState('PLAYING')}
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
        className="fixed top-4 left-4 sm:top-8 sm:left-8 w-12 h-12 sm:w-14 sm:h-14 bg-white rounded-full flex items-center justify-center text-text-main shadow-block transition-all active:translate-y-2 active:shadow-block-pressed z-20"
      >
        <ArrowLeft size={24} className="sm:w-7 sm:h-7" />
      </button>

      <div className="flex-1 w-full max-w-4xl flex flex-col gap-8 sm:gap-12 mt-16 sm:mt-20">
        {/* Counting Area */}
        <div 
          ref={containerRef}
          className="relative flex-1 bg-white/50 rounded-[40px] sm:rounded-[60px] border-4 border-dashed border-shadow/20 overflow-hidden min-h-[300px]"
        >
          <AnimatePresence>
            {itemPositions.map((pos, i) => (
              <motion.div
                key={`${targetCount}-${i}`}
                initial={{ scale: 0, opacity: 0, rotate: -180 }}
                animate={{ scale: pos.scale, opacity: 1, rotate: pos.rotation }}
                exit={{ scale: 0, opacity: 0, rotate: 180 }}
                transition={{ type: 'spring', damping: 12, stiffness: 100, delay: i * 0.05 }}
                className="absolute text-6xl sm:text-8xl select-none"
                style={{ 
                  left: `${pos.x}%`, 
                  top: `${pos.y}%`,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                {pos.emoji}
              </motion.div>
            ))}
          </AnimatePresence>
          
          {/* Refresh button for the child if they get stuck or just want a new layout */}
          <button 
            onClick={startNewRound}
            className="absolute bottom-4 right-4 w-12 h-12 bg-white/50 rounded-full flex items-center justify-center text-shadow/40 hover:text-shadow transition-colors"
          >
            <RefreshCw size={24} />
          </button>
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-4 gap-4 sm:gap-8 w-full shrink-0 mb-8 sm:mb-12">
          {options.map((num, i) => (
            <motion.button
              key={i}
              onClick={() => handleOptionClick(num, i)}
              animate={feedback[i] === 'wrong' ? { x: [-10, 10, -10, 10, 0] } : {}}
              className={`
                w-full aspect-square rounded-[24px] sm:rounded-[32px] flex items-center justify-center text-5xl sm:text-8xl font-bold font-spline transition-all
                ${feedback[i] === 'correct' ? 'bg-success text-primary shadow-block-correct -translate-y-1' : 'bg-white text-text-main shadow-block'}
                ${feedback[i] === 'wrong' ? 'opacity-50 shadow-block-pressed scale-95' : 'active:translate-y-2 active:shadow-block-pressed'}
              `}
            >
              {num}
            </motion.button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg-light/80 backdrop-blur-sm"
          >
            {[...Array(30)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ y: -500, x: Math.random() * window.innerWidth - window.innerWidth/2, rotate: 0 }}
                animate={{ y: window.innerHeight + 500, rotate: 360 }}
                transition={{ duration: 3 + Math.random() * 3, repeat: Infinity, ease: "linear", delay: Math.random() * 2 }}
                className={`absolute ${i % 3 === 0 ? 'w-16 h-16 rounded-full' : i % 3 === 1 ? 'w-24 h-12 rounded-full' : 'w-12 h-24 rounded-full'} ${COLORS[i % COLORS.length].replace('text-', 'bg-')} opacity-60 blur-[2px]`}
              />
            ))}
            
            <motion.div 
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-shadow px-8 py-12 sm:px-24 sm:py-20 rounded-[40px] sm:rounded-[80px] relative z-10 border-8 border-white shadow-2xl mx-6 max-w-[90vw] w-auto"
            >
              <h3 className="text-primary text-6xl sm:text-[140px] font-black tracking-tighter leading-none text-center whitespace-nowrap">Výborne!</h3>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
