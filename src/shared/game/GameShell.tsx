/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { PraiseEntry, GameId } from '../types';
import { GAME_DEFINITIONS } from '../gameCatalog';
import { getUiCopy } from '../uiCopy';
import { useContentLocale } from '../contexts/ContentContext';
import { AppScreen, BackButton, Button, OverlayFrame, PageHeader, RoundCounter, cn } from '../ui';
import { useAppScreenLayout } from '../ui/appScreenLayout';
import { motionPreset } from '../ui/motion';
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

/**
 * The inline retry status is a normal-flow sibling below the interactive content, so every pixel
 * it takes comes straight out of the answer tray's own flex space. On a screen that is short or
 * narrow the tray has no slack left to give: the two-line band pushed it under AnswerGroup's
 * 48px minimum tile size, AnswerGroup fell back to its "nothing fits" geometry, and the tiles
 * then either spilled out over the banner itself (complete-letter/complete-syllable/assembly and
 * Phase 5's own `words` at shortLandscape/phoneLandscape) or were clipped away entirely
 * (narrowPhone). Collapsing to one line at exactly the sizes the shell already treats as
 * constrained keeps the tray above that floor in every canonical viewport.
 *
 * The height half reads the measured `useAppScreenLayout().layout` signal — the same one
 * TopBar/RoundCounter/GameLobby/CustomContentScreen consume — rather than introducing yet another
 * raw `max-height:480px` query; the width half reuses the 380px narrow query PictureCard and the
 * literacy prompt stacks already share. The detail line stays in the live region as `sr-only` so
 * the spoken announcement is byte-for-byte what it was before, only its box is given up.
 */
function RetryStatusBanner({ title, detail }: { title: string; detail?: string }) {
  const { layout } = useAppScreenLayout();
  const prefersReducedMotion = useReducedMotion();
  const compact = layout === 'short';
  const enterPreset = prefersReducedMotion ? motionPreset.reducedEnter : motionPreset.enter;

  return (
    <motion.div
      role="status"
      aria-live="polite"
      data-testid="game-retry-status"
      initial={enterPreset.initial}
      animate={enterPreset.animate}
      transition={motionPreset.transition}
      className={cn(
        'shrink-0 rounded-2xl bg-accent-blue/20 text-center font-bold text-text-main',
        compact
          ? 'px-3 py-1.5 text-sm'
          : 'px-4 py-3 [@media(max-width:380px)]:px-3 [@media(max-width:380px)]:py-1.5 [@media(max-width:380px)]:text-sm',
      )}
    >
      <p>{title}</p>
      {detail && (
        <p
          className={cn(
            'mt-1 text-sm text-text-muted',
            compact ? 'sr-only' : '[@media(max-width:380px)]:sr-only',
          )}
        >
          {detail}
        </p>
      )}
    </motion.div>
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
        <RetryStatusBanner
          title={feedback?.title || getUiCopy(locale, 'game.retryPrompt')}
          detail={feedback?.detail}
        />
      )}

      {transientFeedback && feedback && (
        <OverlayFrame
          show
          tone={feedback.kind === 'success' ? 'success' : 'failure'}
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
