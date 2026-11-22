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
  companion?: React.ReactNode;
  replaying?: boolean;
  nudgeReplay?: boolean;
  onReplay(): void;
}

export function GamePrompt({ instruction, visual, companion, replaying = false, nudgeReplay = false, onReplay }: GamePromptProps) {
  const prefersReducedMotion = useReducedMotion();
  const locale = useContentLocale();

  return (
    <section
      aria-label={getUiCopy(locale, 'game.promptSection')}
      className="flex flex-col items-center gap-2 sm:gap-3 [@media(max-width:380px)]:gap-1 [@media(max-height:480px)]:gap-0.5 text-center"
    >
      <div className="flex w-full max-w-2xl items-center justify-center gap-2 sm:gap-4 [@media(max-width:380px)]:gap-1.5">
        <div className="flex min-w-0 flex-col items-center gap-2 sm:gap-3 [@media(max-width:380px)]:gap-1 [@media(max-height:480px)]:gap-0.5">
          <p
            data-testid="game-visible-instruction"
            className={cn(
              'text-lg font-black text-text-main sm:text-xl',
              Boolean(companion) && '[@media(max-width:380px)]:text-base [@media(max-width:380px)]:leading-tight',
            )}
          >
            {instruction}
          </p>
          <div data-testid="game-critical-controls" className="flex min-h-12 items-center justify-center">
            <Button
              size="child"
              tone="neutral"
              icon={<Volume2 aria-hidden="true" size={22} />}
              onClick={onReplay}
              className={cn(
                Boolean(companion) && '[@media(max-width:380px)]:px-3 [@media(max-width:380px)]:text-sm',
                'group-data-[idle-nudge=true]:ring-4 group-data-[idle-nudge=true]:ring-amber-400/70 motion-safe:group-data-[idle-nudge=true]:animate-pulse',
                nudgeReplay && 'ring-4 ring-amber-400/70 motion-safe:animate-pulse',
              )}
            >
              {getUiCopy(locale, 'game.replayPrompt')}
            </Button>
          </div>
        </div>
        {companion}
      </div>
      {visual && <div className="flex min-h-12 items-center justify-center">{visual}</div>}
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
        // At short heights the replay cue stays in the live region without reserving another
        // line in the prompt. Keeping its min-height stable also prevents the tray resizing when
        // `replaying` flips.
        className={cn(
          'min-h-5 text-sm font-bold text-text-muted [@media(max-height:480px)]:sr-only',
          !replaying && 'pointer-events-none',
        )}
      >
        {replaying ? getUiCopy(locale, 'game.replayingInstruction') : ''}
      </motion.p>
    </section>
  );
}
