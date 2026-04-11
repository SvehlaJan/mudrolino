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
              className={`absolute ${
                p.shape === 0
                  ? 'w-16 h-16 rounded-full'
                  : p.shape === 1
                  ? 'w-24 h-12 rounded-full'
                  : 'w-12 h-24 rounded-full'
              } ${COLORS[i % COLORS.length].replace('text-', 'bg-')} opacity-60 blur-[2px]`}
              style={{ transform: `translateX(${p.x}px)` }}
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
