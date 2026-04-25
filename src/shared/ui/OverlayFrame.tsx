/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { COLORS } from '../contentRegistry';
import { cx } from './utils';

interface ConfettiLayerProps {
  show?: boolean;
}

export function ConfettiLayer({ show = true }: ConfettiLayerProps) {
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
    [show], // eslint-disable-line react-hooks/exhaustive-deps
  );
  /* eslint-enable react-hooks/purity */

  if (!show) return null;

  return (
    <>
      {confetti.map((p, i) => (
        <div
          key={i}
          aria-hidden="true"
          className={cx(
            'overlay-confetti absolute blur-[1px]',
            p.shape === 0
              ? 'w-7 h-7 rounded-full'
              : p.shape === 1
              ? 'w-10 h-5 rounded-full'
              : 'w-5 h-10 rounded-full',
            COLORS[i % COLORS.length].replace('text-', 'bg-'),
          )}
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
    </>
  );
}

interface OverlayFrameProps {
  show: boolean;
  children: React.ReactNode;
  onBackdropClick?: () => void;
  tone?: 'success' | 'failure' | 'neutral';
  confetti?: boolean;
  panelClassName?: string;
  inline?: boolean;
}

export function OverlayFrame({
  show,
  children,
  onBackdropClick,
  tone = 'success',
  confetti = false,
  panelClassName,
  inline = false,
}: OverlayFrameProps) {
  if (!show) return null;

  return (
    <div
      onClick={onBackdropClick}
      className={cx(
        inline ? 'relative min-h-[320px] rounded-[32px]' : 'fixed inset-0 z-50',
        'flex flex-col items-center justify-center overflow-hidden backdrop-blur-sm',
        tone === 'failure' ? 'bg-[#1e2a4a]/70' : 'bg-bg-light/80',
      )}
    >
      {confetti && <ConfettiLayer />}
      <div
        onClick={event => event.stopPropagation()}
        className={cx(
          'relative z-10 mx-6 w-auto max-w-[90vw] rounded-[48px] border-[6px] border-white px-12 py-12 text-center sm:px-20 sm:py-16',
          panelClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}
