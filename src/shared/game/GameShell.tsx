/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import type { PraiseEntry, GameId } from '../types';
import { GAME_DEFINITIONS } from '../gameCatalog';
import { getUiCopy } from '../uiCopy';
import { useContentLocale } from '../contexts/ContentContext';
import { AppScreen, BackButton, Button, OverlayFrame, PageHeader, RoundCounter, cn } from '../ui';
import { motionPreset } from '../ui/motion';
import type { GameState } from './gameState';

export interface GameShellFeedback {
  kind: 'retry' | 'success' | 'failure';
  title: string;
  detail?: string;
  onContinue?: () => void;
}

export interface GameShellCompletion {
  praise: PraiseEntry;
  correctRounds: number;
  totalTaps: number;
  maxRounds: number;
  onPlayAgain(): void;
  onHome(): void;
}

export interface GameShellProps {
  gameId: GameId;
  state: GameState;
  onBack(): void;
  prompt: React.ReactNode;
  feedback?: GameShellFeedback | null;
  completion?: GameShellCompletion | null;
  onRetryError?: () => void;
  children: React.ReactNode;
}

export function GameShell({
  gameId,
  state,
  onBack,
  prompt,
  feedback,
  completion,
  onRetryError,
  children,
}: GameShellProps) {
  const locale = useContentLocale();
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const pausedFocusRef = useRef<HTMLDivElement | null>(null);

  const definition = GAME_DEFINITIONS.find((g) => g.id === gameId);
  const title = definition ? getUiCopy(locale, definition.titleKey) : gameId;

  const isFinal = state.phase === 'session-complete' || state.roundsPlayed >= state.maxRounds;
  const transientFeedback = feedback && (feedback.kind === 'success' || feedback.kind === 'failure') && !isFinal;
  const contentLocked = state.paused || Boolean(transientFeedback) || state.feedback !== null || state.phase === 'recoverable-error';

  useEffect(() => {
    if (state.paused) {
      restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      pausedFocusRef.current?.focus();
      return;
    }
    restoreFocusRef.current?.focus();
    restoreFocusRef.current = null;
  }, [state.paused]);

  const showRetry = (feedback?.kind === 'retry' || state.phase === 'answered-incorrectly') && !isFinal && !transientFeedback;

  return (
    <AppScreen maxWidth="game" height="viewport" scroll="vertical" contentClassName="gap-3 sm:gap-4">
      <PageHeader
        title={title}
        leading={
          <div data-testid="game-critical-controls">
            <BackButton onClick={onBack} />
          </div>
        }
        actions={
          <div data-testid="game-critical-controls">
            <RoundCounter
              completed={state.roundsPlayed}
              total={state.maxRounds}
              ariaLabel={getUiCopy(locale, 'game.progress')}
            />
          </div>
        }
      />

      <div
        data-testid="game-interactive-content"
        inert={contentLocked || undefined}
        aria-hidden={contentLocked || undefined}
        className={cn('flex min-h-0 flex-1 flex-col gap-3 sm:gap-4', contentLocked && 'pointer-events-none')}
      >
        {prompt}
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </div>

      {showRetry && (
        <motion.div
          role="status"
          aria-live="polite"
          initial={motionPreset.enter.initial}
          animate={motionPreset.enter.animate}
          transition={motionPreset.transition}
          className="rounded-2xl bg-accent-blue/20 px-4 py-3 text-center font-bold text-text-main"
        >
          <p>{feedback?.title || getUiCopy(locale, 'game.retryPrompt')}</p>
          {feedback?.detail && <p className="mt-1 text-sm text-text-muted">{feedback.detail}</p>}
        </motion.div>
      )}

      {transientFeedback && feedback && (
        <OverlayFrame
          show
          inline
          tone={feedback.kind === 'success' ? 'success' : 'failure'}
          panelClassName="bg-white shadow-block"
        >
          <div className="text-5xl" aria-hidden="true">
            {feedback.kind === 'success' ? '🌟' : '🤗'}
          </div>
          <p className="mt-2 text-3xl font-black text-text-main">{feedback.title}</p>
          {feedback.detail && <p className="mt-2 text-lg font-bold text-text-muted">{feedback.detail}</p>}
          {feedback.onContinue && (
            <div data-testid="game-critical-controls" className="mt-5">
              <Button tone="primary" size="child" onClick={feedback.onContinue}>
                {getUiCopy(locale, 'game.continue')}
              </Button>
            </div>
          )}
        </OverlayFrame>
      )}

      {completion && (isFinal || state.phase === 'session-complete') && (
        <OverlayFrame show inline tone="success" confetti panelClassName="bg-white shadow-block" focusOnShow>
          <div className="text-6xl" aria-hidden="true">{completion.praise.emoji}</div>
          <p className="mt-2 text-3xl font-black text-text-main">{getUiCopy(locale, 'game.completionTitle')}</p>
          <p className="mt-2 text-xl font-bold text-text-muted">{completion.praise.text}</p>
          <p className="mt-4 text-2xl font-black text-text-main">
            {completion.correctRounds} / {completion.maxRounds}
          </p>
          <p className="mt-1 text-sm font-bold text-text-muted">{completion.totalTaps} {getUiCopy(locale, 'game.taps')}</p>
          <div data-testid="game-critical-controls" className="mt-5 flex flex-wrap justify-center gap-3">
            <Button tone="primary" size="child" onClick={completion.onPlayAgain}>
              {getUiCopy(locale, 'game.playAgain')}
            </Button>
            <Button tone="neutral" size="child" onClick={completion.onHome}>
              {getUiCopy(locale, 'game.home')}
            </Button>
          </div>
        </OverlayFrame>
      )}

      {state.phase === 'recoverable-error' && (
        <OverlayFrame show inline tone="failure" panelClassName="bg-white shadow-block" focusOnShow>
          <div role="alert">
            <p className="text-2xl font-black text-text-main">
              {state.errorMessage || getUiCopy(locale, 'game.error.title')}
            </p>
            <p className="mt-2 font-bold text-text-muted">{getUiCopy(locale, 'game.error.detail')}</p>
            <div data-testid="game-critical-controls" className="mt-5 flex flex-wrap justify-center gap-3">
              {onRetryError && (
                <Button tone="primary" size="child" onClick={onRetryError}>
                  {getUiCopy(locale, 'game.retryError')}
                </Button>
              )}
              <Button tone="neutral" size="child" onClick={onBack}>
                {getUiCopy(locale, 'game.home')}
              </Button>
            </div>
          </div>
        </OverlayFrame>
      )}

      {state.paused && (
        <div
          ref={pausedFocusRef}
          tabIndex={-1}
          role="status"
          aria-live="polite"
          className="rounded-2xl bg-white/95 px-4 py-3 text-center text-lg font-black text-text-main shadow-block"
        >
          {getUiCopy(locale, 'game.paused')}
        </div>
      )}
    </AppScreen>
  );
}
