/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Pause, X } from 'lucide-react';
import { SuccessSpec, PraiseEntry } from '../types';
import { PRAISE_ENTRIES, COLORS, TIMING } from '../contentRegistry';
import { audioManager } from '../services/audioManager';

interface SuccessOverlayProps {
  show: boolean;
  spec: SuccessSpec;
  onComplete: () => void;
}

export function SuccessOverlay({ show, spec, onComplete }: SuccessOverlayProps) {
  const [praise, setPraise] = useState<PraiseEntry>(PRAISE_ENTRIES[0]);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /* eslint-disable react-hooks/purity */
  const confetti = useMemo(() =>
    [...Array(30)].map((_, i) => ({
      x: Math.random() * window.innerWidth - window.innerWidth / 2,
      duration: 3 + Math.random() * 3,
      delay: Math.random() * 2,
      shape: i % 3,
    })),
    [show] // eslint-disable-line react-hooks/exhaustive-deps
  );
  /* eslint-enable react-hooks/purity */

  useEffect(() => {
    if (!show) { setPaused(false); return; }
    const entry = PRAISE_ENTRIES[Math.floor(Math.random() * PRAISE_ENTRIES.length)];
    setPraise(entry);
    setPaused(false);
    audioManager.playPraise(entry);
    timerRef.current = setTimeout(onComplete, TIMING.SUCCESS_OVERLAY_DURATION_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [show]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePause = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    setPaused(true);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onComplete}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg-light/80 backdrop-blur-sm"
        >
          {confetti.map((p, i) => (
            <motion.div
              key={i}
              aria-hidden="true"
              initial={{ y: -500, x: p.x, rotate: 0 }}
              animate={{ y: window.innerHeight + 500, rotate: 360 }}
              transition={{ duration: p.duration, ease: 'linear', delay: p.delay }}
              className={`absolute ${p.shape === 0 ? 'w-16 h-16 rounded-full' : p.shape === 1 ? 'w-24 h-12 rounded-full' : 'w-12 h-24 rounded-full'} ${COLORS[i % COLORS.length].replace('text-', 'bg-')} opacity-60 blur-[2px]`}
            />
          ))}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={e => e.stopPropagation()}
            className="relative z-10 border-[6px] border-white rounded-[48px] px-12 py-12 sm:px-20 sm:py-16 mx-6 max-w-[90vw] w-auto text-center"
            style={{
              background: 'linear-gradient(150deg, #fff8f0 0%, #ffecd2 100%)',
              boxShadow: '0 8px 0 #f0c99a, 0 20px 60px rgba(0,0,0,.10)',
            }}
          >
            <button
              onClick={paused ? onComplete : handlePause}
              aria-label={paused ? 'Zavrieť' : 'Pauza'}
              className="absolute top-4 right-4 w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#aaa] transition-colors hover:text-[#666]"
              style={{ boxShadow: '0 2px 8px rgba(0,0,0,.10)' }}
            >
              {paused ? <X size={20} /> : <Pause size={20} />}
            </button>
            <div role="img" aria-label={praise.text} className="text-[100px] sm:text-[140px] leading-none mb-2">{praise.emoji}</div>
            <h3 className="text-primary text-5xl sm:text-[80px] font-black tracking-tighter leading-none">
              {praise.text}
            </h3>
            <p className="text-2xl sm:text-4xl font-extrabold mt-5" style={{ color: '#c06a00' }}>
              {spec.echoLine}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
