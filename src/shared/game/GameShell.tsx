/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Lock } from 'lucide-react';
import type { PraiseEntry, GameId } from '../types';
import { GAME_DEFINITIONS } from '../gameCatalog';
import { getUiCopy } from '../uiCopy';
import { useContentLocale } from '../contexts/ContentContext';
import { AppScreen, BackButton, Button, IconButton, OverlayFrame, PageHeader, RoundCounter, cn } from '../ui';
import { motionPreset } from '../ui/motion';
import { ParentsGate } from '../components/ParentsGate';
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
  /**
   * Wires a real, permitted parent dialog (the same ParentsGate used by the protected route
   * group) directly into an active round: onPause fires immediately when a parent taps the
   * lock, onResume fires once they solve the gate. Omit both to leave the shell exactly as
   * before — the ui-kit demo has no session to pause.
   */
  onPause?(): void;
  onResume?(): void;
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
  onPause,
  onResume,
  children,
}: GameShellProps) {
  const locale = useContentLocale();
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const lockButtonRef = useRef<HTMLButtonElement | null>(null);
  const unlockButtonRef = useRef<HTMLButtonElement | null>(null);
  const pausedFocusRef = useRef<HTMLDivElement | null>(null);
  const [showParentGate, setShowParentGate] = useState(false);
  const hasPauseContract = Boolean(onPause && onResume);

  // A final round reaches `answered-correctly`/`answered-incorrectly` (feedback: 'failure')
  // as soon as the reducer resolves the answer, but useGameSession only dispatches
  // SHOW_SESSION_COMPLETE once the praise/failure verdict audio has actually finished. A
  // parent pause landing in that window would invalidate() the in-flight resolveAnswer()
  // before it could dispatch SHOW_SESSION_COMPLETE, permanently stranding the round
  // input-locked with no way to reach the completion overlay — so the pause control must be
  // unavailable for the whole window, not just once session-complete is reached.
  const isFinalRound = state.roundsPlayed >= state.maxRounds;
  const canPause = hasPauseContract
    && !state.paused
    && !isFinalRound
    && state.phase !== 'session-complete'
    && state.phase !== 'recoverable-error';

  const openParentPause = () => {
    onPause?.();
    setShowParentGate(true);
  };
  const handleGateSuccess = () => {
    setShowParentGate(false);
    onResume?.();
  };
  const handleGateCancel = () => {
    setShowParentGate(false);
  };

  const definition = GAME_DEFINITIONS.find((g) => g.id === gameId);
  const title = definition ? getUiCopy(locale, definition.titleKey) : gameId;

  // Showing completion's Play again/Home must wait for `session-complete`, or a child could
  // tap past a session recap whose audio never played; input locking uses `isFinalRound`
  // itself (above) so it takes effect the instant the round resolves, not once that phase
  // lands.
  const transientFeedback = feedback && (feedback.kind === 'success' || feedback.kind === 'failure') && !isFinalRound;
  const contentLocked =
    state.paused ||
    Boolean(transientFeedback) ||
    state.feedback !== null ||
    state.phase === 'recoverable-error' ||
    isFinalRound;

  // With a real pause contract, the only path into `paused` is tapping the lock button, which
  // also opens the gate in the same commit — so "whatever was focused before pause" is always
  // that lock button. Capturing it as a plain `document.activeElement` snapshot (the previous
  // approach, still used below for the no-contract case) grabs a reference that's about to be
  // unmounted, since `canPause` goes false the instant `paused` flips true: `.focus()` on it
  // later is a no-op and focus is stranded. Refs attached directly to the live lock/unlock
  // buttons always point at whichever instance is currently mounted (React nulls a ref on
  // unmount), so focusing through them works regardless of remounts. A consumer with no pause
  // contract (e.g. the `/ui-kit` demo, which drives `paused` directly through `state` and never
  // renders either button) keeps the original generic capture-and-restore behavior, since
  // whatever it had focused before pausing stays mounted throughout.
  useEffect(() => {
    if (state.paused) {
      if (!hasPauseContract) {
        restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        pausedFocusRef.current?.focus();
      } else if (!showParentGate) {
        unlockButtonRef.current?.focus();
      } else {
        pausedFocusRef.current?.focus();
      }
      return;
    }
    if (!hasPauseContract) {
      restoreFocusRef.current?.focus();
      restoreFocusRef.current = null;
      return;
    }
    lockButtonRef.current?.focus();
  }, [state.paused, showParentGate, hasPauseContract]);

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
            {canPause && (
              <IconButton ref={lockButtonRef} label={getUiCopy(locale, 'game.parentPause')} onClick={openParentPause}>
                <Lock size={20} />
              </IconButton>
            )}
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

      {state.paused && (
        <div
          ref={pausedFocusRef}
          tabIndex={-1}
          role="status"
          aria-live="polite"
          className="rounded-2xl bg-white/95 px-4 py-3 text-center text-lg font-black text-text-main shadow-block"
        >
          <p>{getUiCopy(locale, 'game.paused')}</p>
          {onResume && !showParentGate && (
            <div data-testid="game-critical-controls" className="mt-3">
              <Button ref={unlockButtonRef} tone="primary" size="child" onClick={() => setShowParentGate(true)}>
                {getUiCopy(locale, 'game.unlock')}
              </Button>
            </div>
          )}
        </div>
      )}

      {showParentGate && <ParentsGate onSuccess={handleGateSuccess} onCancel={handleGateCancel} />}
    </AppScreen>
  );
}
