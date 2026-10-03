/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import type { PraiseEntry, GameId } from '../types';
import { GAME_DEFINITIONS } from '../gameCatalog';
import { getUiCopy } from '../uiCopy';
import { useContentLocale } from '../contexts/ContentContext';
import { AppScreen, BackButton, Button, OverlayFrame, PageHeader, RoundCounter, cn } from '../ui';
import type { GameState } from './gameState';

export interface GameShellFeedback {
  kind: 'retry' | 'success' | 'failure';
  title: string;
  detail?: string;
  /** Overrides the default success/failure emoji — used to match a randomly picked praise entry. */
  emoji?: string;
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

function RetryAnnouncement({ title, detail }: { title: string; detail?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="game-retry-status"
      className="sr-only"
    >
      <p>{title}</p>
      {detail && <p>{detail}</p>}
    </div>
  );
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

  const definition = GAME_DEFINITIONS.find((g) => g.id === gameId);
  const title = definition ? getUiCopy(locale, definition.titleKey) : gameId;

  // Showing completion's Play again/Home must wait for `session-complete`, or a child could
  // tap past a session recap whose audio never played; input locking uses `isFinalRound`
  // itself so it takes effect the instant the round resolves, not once that phase
  // lands.
  const isFinalRound = state.roundsPlayed >= state.maxRounds;
  const transientFeedback = feedback && (feedback.kind === 'success' || feedback.kind === 'failure') && !isFinalRound;
  const contentLocked =
    state.paused ||
    Boolean(transientFeedback) ||
    state.feedback !== null ||
    state.phase === 'recoverable-error' ||
    isFinalRound;

  const showRetry = (feedback?.kind === 'retry' || state.phase === 'answered-incorrectly') && !isFinalRound && !transientFeedback;

  return (
    <AppScreen maxWidth="game" height="viewport" scroll="vertical" contentClassName="gap-3 sm:gap-4 [@media(max-height:480px)]:gap-1.5">
      <PageHeader
        align="center"
        title={title}
        leading={
          <div data-testid="game-critical-controls">
            <BackButton onClick={onBack} />
          </div>
        }
        actions={
          <div data-testid="game-critical-controls" className="flex items-center gap-2">
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
        // The prompt/tray gap was the one spacing token in this column with no constrained-size
        // override (the AppScreen contentClassName above already has one), so a short landscape
        // strip or a narrow phone was paying full price for it while the tray was starved —
        // reclaim it at the same two breakpoints the rest of the shell already uses.
        className={cn(
          'flex min-h-0 flex-1 flex-col gap-3 sm:gap-4 [@media(max-width:380px)]:gap-1.5 [@media(max-height:480px)]:gap-1.5',
          contentLocked && 'pointer-events-none',
        )}
      >
        {prompt}
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </div>

      {showRetry && (
        <RetryAnnouncement
          title={feedback?.title || getUiCopy(locale, 'game.retryPrompt')}
          detail={feedback?.detail}
        />
      )}

      {transientFeedback && feedback && (
        <OverlayFrame
          show
          tone={feedback.kind === 'success' ? 'success' : 'failure'}
          onBackdropClick={feedback.kind === 'success' ? feedback.onContinue : undefined}
          panelClassName="bg-white shadow-block"
        >
          <div className="text-5xl" aria-hidden="true">
            {feedback.emoji ?? (feedback.kind === 'success' ? '🌟' : '🤗')}
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

      {completion && state.phase === 'session-complete' && (
        <OverlayFrame show tone="success" confetti panelClassName="bg-white shadow-block" focusOnShow>
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
        <OverlayFrame show tone="failure" panelClassName="bg-white shadow-block" focusOnShow>
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

    </AppScreen>
  );
}
