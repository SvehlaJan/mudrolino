import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ContentItem, PraiseEntry } from '../types';
import { PRAISE_ENTRIES, COLORS } from '../contentRegistry';
import { audioManager } from '../services/audioManager';

interface SuccessOverlayProps {
  show: boolean;
  item: ContentItem;
  onComplete: () => void;
}

function getEchoLine(item: ContentItem): string {
  if (item.category === 'letter' && item.label) {
    return `${item.symbol} ako ${item.label} ${item.emoji ?? ''}`.trim();
  }
  if (item.category === 'number') {
    return `Správne, je ich ${item.symbol} ${item.emoji ?? '⭐'}`.trim();
  }
  if (item.category === 'syllable') {
    return `${item.symbol} ${item.emoji ?? '🗣️'}`.trim();
  }
  return `${item.symbol} ${item.emoji ?? ''}`.trim();
}

export function SuccessOverlay({ show, item, onComplete }: SuccessOverlayProps) {
  const [praise, setPraise] = useState<PraiseEntry>(PRAISE_ENTRIES[0]);

  useEffect(() => {
    if (!show) return;
    const entry = PRAISE_ENTRIES[Math.floor(Math.random() * PRAISE_ENTRIES.length)];
    setPraise(entry);
    audioManager.playPraise(entry);
    const timer = setTimeout(onComplete, 3000);
    return () => clearTimeout(timer);
  }, [show]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg-light/80 backdrop-blur-sm"
        >
          {[...Array(30)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ y: -500, x: Math.random() * window.innerWidth - window.innerWidth / 2, rotate: 0 }}
              animate={{ y: window.innerHeight + 500, rotate: 360 }}
              transition={{ duration: 3 + Math.random() * 3, repeat: Infinity, ease: 'linear', delay: Math.random() * 2 }}
              className={`absolute ${i % 3 === 0 ? 'w-16 h-16 rounded-full' : i % 3 === 1 ? 'w-24 h-12 rounded-full' : 'w-12 h-24 rounded-full'} ${COLORS[i % COLORS.length].replace('text-', 'bg-')} opacity-60 blur-[2px]`}
            />
          ))}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-shadow px-8 py-12 sm:px-24 sm:py-20 rounded-[40px] sm:rounded-[80px] relative z-10 border-8 border-white shadow-2xl mx-6 max-w-[90vw] w-auto text-center"
          >
            <div className="text-8xl sm:text-[120px] leading-none mb-2">{praise.emoji}</div>
            <h3 className="text-primary text-5xl sm:text-[100px] font-black tracking-tighter leading-none whitespace-nowrap">
              {praise.text}
            </h3>
            <p className="text-shadow text-2xl sm:text-4xl font-bold mt-4 opacity-70">
              {getEchoLine(item)}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
