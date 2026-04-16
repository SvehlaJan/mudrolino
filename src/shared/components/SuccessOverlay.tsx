/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Pause, X } from 'lucide-react';
import { SuccessSpec, PraiseEntry } from '../types';
import { getLocaleContent, COLORS, TIMING } from '../contentRegistry';
import { audioManager } from '../services/audioManager';

interface SuccessOverlayProps {
  show: boolean;
  spec: SuccessSpec;
  onComplete: () => void;
  locale?: string;
}

export function SuccessOverlay({ show, spec, onComplete, locale = 'sk' }: SuccessOverlayProps) {
  const [praise, setPraise] = useState<PraiseEntry>(getLocaleContent(locale).praiseEntries[0]);
  const [paused, setPaused] = useState(false);
  /* eslint-disable react-hooks/purity */
  const confetti = useMemo(() =>
    [...Array(54)].map((_, i) => ({
      x: `${Math.random() * 100}%`,
      y: `${Math.random() * 30}%`,
      rotation: Math.random() * 80 - 40,
      scale: 0.55 + Math.random() * 0.55,
      drift: `${Math.random() * 80 - 40}px`,
      spin: `${Math.random() * 140 - 70}deg`,
      opacity: 0.18 + Math.random() * 0.22,
      duration: 7 + Math.random() * 5,
      delay: Math.random() * 4,
      shape: i % 3,
    })),
    [show] // eslint-disable-line react-hooks/exhaustive-deps
  );
  /* eslint-enable react-hooks/purity */

  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!show) { setPaused(false); return; }
    const praiseEntries = getLocaleContent(locale).praiseEntries;
    const entry = spec.praiseEntry ?? praiseEntries[Math.floor(Math.random() * praiseEntries.length)];
    setPraise(entry);
    setPaused(false);
    cancelledRef.current = false;

    const minTimer = new Promise<void>(resolve =>
      setTimeout(resolve, TIMING.SUCCESS_OVERLAY_DURATION_MS)
    );
    const audio = spec.audioSpec
      ? audioManager.playPraise().then(() => audioManager.play(spec.audioSpec!))
      : audioManager.playPraise();

    Promise.all([minTimer, audio]).then(() => {
      if (!cancelledRef.current) onComplete();
    });

    return () => {
      cancelledRef.current = true;
      audioManager.stop();
    };
  }, [show, spec]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePause = () => {
    cancelledRef.current = true;
    audioManager.stop();
    setPaused(true);
  };

  return (
    show ? (
      <div
        onClick={() => {
          cancelledRef.current = true;
          audioManager.stop();
          onComplete();
        }}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg-light/80 backdrop-blur-sm"
      >
          {confetti.map((p, i) => (
            <div
              key={i}
              aria-hidden="true"
              className={`overlay-confetti absolute ${p.shape === 0 ? 'w-7 h-7 rounded-full' : p.shape === 1 ? 'w-10 h-5 rounded-full' : 'w-5 h-10 rounded-full'} ${COLORS[i % COLORS.length].replace('text-', 'bg-')} blur-[1px]`}
              style={{
                left: p.x,
                top: p.y,
                animationDuration: `${p.duration}s`,
                animationDelay: `-${p.delay}s`,
                ['--confetti-rotation' as string]: `${p.rotation}deg`,
                ['--confetti-scale' as string]: String(p.scale),
                ['--confetti-drift' as string]: p.drift,
                ['--confetti-spin' as string]: p.spin,
                ['--confetti-opacity' as string]: String(p.opacity),
              }}
            />
          ))}
          <div
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
          </div>
      </div>
    ) : null
  );
}
