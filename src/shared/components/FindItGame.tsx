/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'motion/react';
import { Volume2, ArrowLeft } from 'lucide-react';
import { GameDescriptor, SuccessSpec } from '../types';
import { audioManager } from '../services/audioManager';
import { SuccessOverlay } from './SuccessOverlay';
import { TIMING } from '../contentRegistry';

interface FindItGameProps<T> {
  descriptor: GameDescriptor<T>;
  /** Called when the child taps the back button — typically sets parent gameState back to 'HOME'. */
  onExit: () => void;
}

export function FindItGame<T>({ descriptor, onExit }: FindItGameProps<T>) {
  const [targetItem, setTargetItem] = useState<T | null>(null);
  const [gridItems, setGridItems] = useState<T[]>([]);
  const [feedback, setFeedback] = useState<Record<number, 'correct' | 'wrong' | null>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [successSpec, setSuccessSpec] = useState<SuccessSpec | null>(null);

  const targetItemRef = useRef<T | null>(null);
  useEffect(() => { targetItemRef.current = targetItem; }, [targetItem]);

  const startNewRound = useCallback(() => {
    const pool = descriptor.getItems();
    if (pool.length === 0) return;
    const current = targetItemRef.current;
    const currentId = current ? descriptor.getItemId(current) : null;
    const eligible = currentId
      ? pool.filter(item => descriptor.getItemId(item) !== currentId)
      : pool;
    const candidates = eligible.length > 0 ? eligible : pool;
    const target = candidates[Math.floor(Math.random() * candidates.length)];
    const others = pool
      .filter(item => descriptor.getItemId(item) !== descriptor.getItemId(target))
      .sort(() => 0.5 - Math.random())
      .slice(0, descriptor.gridSize - 1);
    const grid = [...others, target].sort(() => 0.5 - Math.random());
    setTargetItem(target);
    setGridItems(grid);
    setFeedback({});
    setShowSuccess(false);
  }, [descriptor]);

  useEffect(() => {
    if (!targetItem) startNewRound();
  }, [targetItem, startNewRound]);

  useEffect(() => {
    if (!targetItem) return;
    const timer = setTimeout(
      () => audioManager.play(descriptor.getPromptAudio(targetItem)),
      TIMING.AUDIO_DELAY_MS
    );
    return () => clearTimeout(timer);
  }, [targetItem, descriptor]);

  const handleCardClick = (item: T, index: number) => {
    if (showSuccess || !targetItem) return;
    if (descriptor.getItemId(item) === descriptor.getItemId(targetItem)) {
      setFeedback(prev => ({ ...prev, [index]: 'correct' }));
      setSuccessSpec(descriptor.getSuccessSpec(targetItem));
      setTimeout(() => setShowSuccess(true), TIMING.SUCCESS_SHOW_DELAY_MS);
    } else {
      setFeedback(prev => ({ ...prev, [index]: 'wrong' }));
      audioManager.play(descriptor.getWrongAudio(targetItem, item));
      setTimeout(() => setFeedback(prev => ({ ...prev, [index]: null })), TIMING.FEEDBACK_RESET_MS);
    }
  };

  const prompt = targetItem ? descriptor.renderPrompt(targetItem) : null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-8">
      <button
        onClick={onExit}
        className="fixed top-4 left-4 sm:top-8 sm:left-8 w-12 h-12 sm:w-14 sm:h-14 bg-white rounded-full flex items-center justify-center text-text-main shadow-block transition-all active:translate-y-2 active:shadow-block-pressed z-20"
      >
        <ArrowLeft size={24} className="sm:w-7 sm:h-7" />
      </button>

      <div className="flex flex-col items-center gap-4 sm:gap-8 mb-8 sm:mb-12">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => targetItem && audioManager.play(descriptor.getPromptAudio(targetItem))}
          className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-full shadow-block flex items-center justify-center text-text-main"
        >
          <Volume2 size={32} className="sm:w-10 sm:h-10" />
        </motion.button>
        {prompt && <div className="text-center">{prompt}</div>}
      </div>

      <div className={`grid ${descriptor.gridColsClass} gap-4 sm:gap-8 w-full max-w-4xl px-4`}>
        {gridItems.map((item, i) => (
          <motion.button
            key={descriptor.getItemId(item)}
            onClick={() => handleCardClick(item, i)}
            animate={feedback[i] === 'wrong' ? { x: [-10, 10, -10, 10, 0] } : {}}
            className={`
              w-full aspect-square rounded-[24px] sm:rounded-[32px] flex items-center justify-center transition-all
              ${feedback[i] === 'correct' ? 'bg-success text-primary shadow-block-correct -translate-y-1' : 'bg-white text-text-main shadow-block'}
              ${feedback[i] === 'wrong' ? 'opacity-50 shadow-block-pressed scale-95' : 'active:translate-y-2 active:shadow-block-pressed'}
            `}
          >
            {descriptor.renderCard(item)}
          </motion.button>
        ))}
      </div>

      {successSpec && (
        <SuccessOverlay show={showSuccess} spec={successSpec} onComplete={startNewRound} />
      )}
    </div>
  );
}
