/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { OverlayFrame } from '../ui';

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
    <OverlayFrame
      show={show}
      tone="success"
      confetti
      onBackdropClick={onComplete}
      panelClassName="bg-[linear-gradient(150deg,#fff8f0_0%,#ffecd2_100%)] shadow-[0_8px_0_#f0c99a,0_20px_60px_rgba(0,0,0,.10)]"
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
    </OverlayFrame>
  );
}
