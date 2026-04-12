/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useMemo } from 'react';
import { COLORS } from '../contentRegistry';

interface SessionCompleteOverlayProps {
  show: boolean;
  roundsCompleted: number;
  totalTaps: number;
  maxRounds: number;
  onComplete: () => void;
}

function getStars(roundsCompleted: number, totalTaps: number): number {
  if (totalTaps === 0) return 3;
  const accuracy = roundsCompleted / totalTaps;
  if (accuracy > 0.8) return 3;
  if (accuracy >= 0.5) return 2;
  return 1;
}

export function SessionCompleteOverlay({
  show,
  roundsCompleted,
  totalTaps,
  maxRounds,
  onComplete,
}: SessionCompleteOverlayProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* eslint-disable react-hooks/purity */
  const confetti = useMemo(
    () =>
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

  useEffect(() => {
    if (!show) return;
    timerRef.current = setTimeout(onComplete, 5000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [show]); // eslint-disable-line react-hooks/exhaustive-deps

  const stars = getStars(roundsCompleted, totalTaps);
  const starDisplay = ['⭐', '⭐', '⭐']
    .map((s, i) => (i < stars ? s : '☆'))
    .join(' ');

  return (
    show ? (
      <div
        onClick={onComplete}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg-light/80 backdrop-blur-sm"
      >
          {confetti.map((p, i) => (
            <div
              key={i}
              aria-hidden="true"
              className={`overlay-confetti absolute ${
                p.shape === 0
                  ? 'w-7 h-7 rounded-full'
                  : p.shape === 1
                  ? 'w-10 h-5 rounded-full'
                  : 'w-5 h-10 rounded-full'
              } ${COLORS[i % COLORS.length].replace('text-', 'bg-')} blur-[1px]`}
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
            <div role="img" aria-label="Hotovo!" className="text-[120px] sm:text-[160px] leading-none mb-2">🎉</div>
            <h3 className="text-primary text-5xl sm:text-7xl font-black tracking-tighter leading-none">
              Hotovo!
            </h3>
            <p aria-label={`${stars} z 3 hviezd`} className="text-5xl mt-4 tracking-widest">{starDisplay}</p>
            <p
              className="text-2xl sm:text-3xl font-extrabold mt-4"
              style={{ color: '#c06a00' }}
            >
              {roundsCompleted} z {maxRounds} správne
            </p>
          </div>
      </div>
    ) : null
  );
}
