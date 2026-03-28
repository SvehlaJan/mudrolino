/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Volume2, ArrowLeft, Play, Settings } from 'lucide-react';
import { audioManager } from '../../shared/services/audioManager';
import { ALPHABET, COLORS } from '../../shared/constants';

interface AlphabetGameProps {
  onExit: () => void;
  onOpenSettings: () => void;
}

export function AlphabetGame({ onExit, onOpenSettings }: AlphabetGameProps) {
  const [gameState, setGameState] = useState<'HOME' | 'PLAYING'>('HOME');
  const [targetLetter, setTargetLetter] = useState('');
  const [gridLetters, setGridLetters] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<{ [key: number]: 'correct' | 'wrong' | null }>({});
  const [showSuccess, setShowSuccess] = useState(false);

  const playAudio = useCallback((type: 'letter' | 'success' | 'wrong', letter?: string) => {
    if (type === 'letter' && letter) {
      audioManager.playLetter(letter);
    } else if (type === 'success') {
      audioManager.playSfx('success');
      audioManager.playPraise();
    } else if (type === 'wrong' && letter) {
      audioManager.playSfx('error');
      audioManager.playFeedback(letter);
    }
  }, []);

  const startNewRound = useCallback(() => {
    let target = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    if (targetLetter && ALPHABET.length > 1) {
      while (target === targetLetter) {
        target = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
      }
    }
    
    const others = ALPHABET.filter(l => l !== target).sort(() => 0.5 - Math.random()).slice(0, 7);
    const grid = [...others, target].sort(() => 0.5 - Math.random());
    
    setTargetLetter(target);
    setGridLetters(grid);
    setFeedback({});
    setShowSuccess(false);
  }, [targetLetter]);

  useEffect(() => {
    if (gameState === 'PLAYING' && targetLetter) {
      playAudio('letter', targetLetter);
    }
  }, [gameState, targetLetter, playAudio]);

  useEffect(() => {
    if (gameState === 'PLAYING' && !targetLetter) {
      startNewRound();
    }
  }, [gameState, targetLetter, startNewRound]);

  const handleLetterClick = (letter: string, index: number) => {
    if (showSuccess) return;
    
    if (letter === targetLetter) {
      setFeedback(prev => ({ ...prev, [index]: 'correct' }));
      playAudio('success');
      setTimeout(() => setShowSuccess(true), 500);
      setTimeout(() => {
        startNewRound();
      }, 3000);
    } else {
      setFeedback(prev => ({ ...prev, [index]: 'wrong' }));
      playAudio('wrong', letter);
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
              {"ABECEDA".split('').map((char, i) => (
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
          </div>

          <motion.button 
            whileHover={{ scale: 1.05, y: -5 }}
            whileTap={{ scale: 0.95, y: 5 }}
            onClick={() => setGameState('PLAYING')}
            className="w-32 h-32 sm:w-48 md:w-60 sm:h-48 md:h-60 bg-success rounded-full shadow-block flex items-center justify-center text-white transition-all shrink-0"
          >
            <Play size={48} className="sm:w-20 sm:h-20 md:w-[100px] md:h-[100px] ml-2 sm:ml-4" fill="currentColor" />
          </motion.button>
        </div>
        
        <div className="absolute top-1/4 left-4 sm:left-10 w-20 h-20 sm:w-32 sm:h-32 rounded-3xl bg-accent-blue opacity-30 -rotate-12 blur-sm pointer-events-none" />
        <div className="absolute bottom-10 right-4 sm:bottom-20 sm:right-20 w-32 h-32 sm:w-48 sm:h-48 rounded-full bg-primary opacity-20 translate-y-10 blur-md pointer-events-none" />
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
          onClick={() => playAudio('letter', targetLetter)}
          className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-full shadow-block flex items-center justify-center text-text-main"
        >
          <Volume2 size={32} className="sm:w-10 sm:h-10" />
        </motion.button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8 w-full max-w-5xl px-4">
        {gridLetters.map((letter, i) => (
          <motion.button
            key={i}
            onClick={() => handleLetterClick(letter, i)}
            animate={feedback[i] === 'wrong' ? { x: [-10, 10, -10, 10, 0] } : {}}
            className={`
              w-full aspect-[4/5] rounded-[24px] sm:rounded-[32px] flex items-center justify-center text-6xl sm:text-[120px] font-bold font-spline transition-all
              ${feedback[i] === 'correct' ? 'bg-success text-primary shadow-block-correct -translate-y-1' : 'bg-white text-text-main shadow-block'}
              ${feedback[i] === 'wrong' ? 'opacity-50 shadow-block-pressed scale-95' : 'active:translate-y-2 active:shadow-block-pressed'}
            `}
          >
            {letter}
          </motion.button>
        ))}
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
