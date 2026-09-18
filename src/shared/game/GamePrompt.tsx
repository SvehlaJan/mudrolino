/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Volume2 } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { Button, cn } from '../ui';
import { motionPreset } from '../ui/motion';
import { getUiCopy } from '../uiCopy';
import { useContentLocale } from '../contexts/ContentContext';

export interface GamePromptProps {
  instruction: string;
  visual?: React.ReactNode;
  replaying?: boolean;
  onReplay(): void;
}

export function GamePrompt({ instruction, visual, replaying = false, onReplay }: GamePromptProps) {
  const prefersReducedMotion = useReducedMotion();
  const locale = useContentLocale();

  return (
    <section aria-label={getUiCopy(locale, 'game.promptSection')} className="flex flex-col items-center gap-3 text-center">
      <p data-testid="game-visible-instruction" className="text-lg font-black text-text-main sm:text-xl">
        {instruction}
      </p>
      {visual && <div className="flex min-h-12 items-center justify-center">{visual}</div>}
      <div data-testid="game-critical-controls" className="flex min-h-12 items-center justify-center">
        <Button
          size="child"
          tone="neutral"
          icon={<Volume2 aria-hidden="true" size={22} />}
          onClick={onReplay}
        >
          {getUiCopy(locale, 'game.replayPrompt')}
        </Button>
      </div>
      <motion.p
        aria-live="polite"
        initial={false}
        animate={
          replaying && !prefersReducedMotion
            ? { opacity: [0.55, 1, 0.55] }
            : { opacity: replaying ? 1 : 0 }
        }
        transition={
          replaying && !prefersReducedMotion
            ? { duration: 0.45 }
            : motionPreset.transition
        }
        className={cn('min-h-5 text-sm font-bold text-text-muted', !replaying && 'pointer-events-none')}
      >
        {replaying ? getUiCopy(locale, 'game.replayingInstruction') : ''}
      </motion.p>
    </section>
  );
}
