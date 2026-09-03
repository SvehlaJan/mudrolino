/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Volume2 } from 'lucide-react';
import { Card } from '../ui/Card';
import { cx } from '../ui/utils';

interface AuditoryPromptBadgeProps {
  isPlaying: boolean;
  onReplay: () => void;
  label?: string;
  ariaLabel?: string;
  className?: string;
}

export function AuditoryPromptBadge({
  isPlaying,
  onReplay,
  label = 'Počúvaj',
  ariaLabel,
  className,
}: AuditoryPromptBadgeProps) {
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onReplay}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault?.();
          onReplay();
        }
      }}
      aria-label={ariaLabel ?? 'Prehrať zadanie znova'}
      className={cx(
        'relative inline-flex items-center gap-3 !rounded-[28px] sm:!rounded-[36px] !px-6 !py-3 sm:!px-8 sm:!py-4 !shadow-block cursor-pointer select-none transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40',
        className
      )}
    >
      {/* Concentric soundwave ripple rings */}
      <div className="relative flex items-center justify-center w-8 h-8">
        {isPlaying && (
          <>
            <span className="absolute inline-flex h-full w-full rounded-full bg-primary/25 animate-ping" />
            <span className="absolute -inset-1.5 rounded-full border-2 border-primary/40 animate-pulse" />
          </>
        )}
        <Volume2
          size={26}
          className={cx(
            'text-primary transition-transform',
            isPlaying && 'scale-110'
          )}
        />
      </div>

      <span className="font-spline text-lg sm:text-xl font-bold text-text-main">
        {label}
      </span>
    </Card>
  );
}
