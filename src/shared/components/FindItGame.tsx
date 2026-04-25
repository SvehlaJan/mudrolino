/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { Volume2 } from 'lucide-react';
import { GameDescriptor, SuccessSpec, FailureSpec } from '../types';
import { audioManager } from '../services/audioManager';
import { SuccessOverlay } from './SuccessOverlay';
import { FailureOverlay } from './FailureOverlay';
import { SessionCompleteOverlay } from './SessionCompleteOverlay';
import { TIMING } from '../contentRegistry';
import { fisherYatesShuffle } from '../utils';
import { AppScreen, BackButton, ChoiceTile, IconButton, RoundCounter, TopBar } from '../ui';

interface FindItGameProps<T> {
  descriptor: GameDescriptor<T>;
  /** Called when the child taps the back button — typically sets parent gameState back to 'HOME'. */
  onExit: () => void;
  locale?: string;
}

interface RoundState<T> {
  targetItem: T | null;
  gridItems: T[];
}

function getGridColsClass(gridCols: GameDescriptor<unknown>['gridCols']) {
  return gridCols.sm
    ? `grid-cols-${gridCols.base} sm:grid-cols-${gridCols.sm}`
    : `grid-cols-${gridCols.base}`;
}

function getGridMaxWidthClass(gridCols: GameDescriptor<unknown>['gridCols']) {
  const desktopCols = gridCols.sm ?? gridCols.base;
  if (desktopCols >= 4) return 'max-w-4xl';
  if (desktopCols === 3) return 'max-w-3xl';
  return 'max-w-2xl';
}

function buildGrid<T>(descriptor: GameDescriptor<T>, target: T): RoundState<T> {
  const pool = descriptor.getItems();
  const effectiveGridSize = Math.min(descriptor.gridSize, pool.length);
  const others = fisherYatesShuffle(
    pool.filter(item => descriptor.getItemId(item) !== descriptor.getItemId(target))
  ).slice(0, effectiveGridSize - 1);
  return {
    targetItem: target,
    gridItems: fisherYatesShuffle([...others, target]),
  };
}

export function FindItGame<T>({ descriptor, onExit, locale = 'sk' }: FindItGameProps<T>) {
  const [{ roundState }, setSession] = useState(() => {
    const pool = fisherYatesShuffle(descriptor.getItems());
    const [first, ...rest] = pool;
    return { roundState: buildGrid(descriptor, first), roundQueue: rest };
  });
  const [feedback, setFeedback] = useState<Record<number, 'correct' | 'wrong' | null>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [successSpec, setSuccessSpec] = useState<SuccessSpec | null>(null);

  const maxRounds = descriptor.maxRounds ?? 5;
  const maxAttempts = descriptor.maxAttempts ?? 3;
  const [wrongAttemptsThisRound, setWrongAttemptsThisRound] = useState(0);
  const [showFailure, setShowFailure] = useState(false);
  const [failureSpec, setFailureSpec] = useState<FailureSpec | null>(null);
  const [roundsPlayed, setRoundsPlayed] = useState(0);
  const [correctRounds, setCorrectRounds] = useState(0);
  const [totalTaps, setTotalTaps] = useState(0);
  const [showSessionComplete, setShowSessionComplete] = useState(false);

  const { targetItem, gridItems } = roundState;
  const gridAreaRef = useRef<HTMLDivElement | null>(null);
  const pendingSuccessRef = useRef(false);
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);
  const [gridAreaSize, setGridAreaSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    return () => audioManager.stop();
  }, []);

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useLayoutEffect(() => {
    const node = gridAreaRef.current;
    if (!node) return;

    const updateSize = () => {
      setGridAreaSize({
        width: node.clientWidth,
        height: node.clientHeight,
      });
    };

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const startNewRound = useCallback(() => {
    setSession(prev => {
      const pool = descriptor.getItems();
      const currentQueue = prev.roundQueue.length > 0 ? prev.roundQueue : fisherYatesShuffle(pool);
      const [target, ...rest] = currentQueue;
      return { roundState: buildGrid(descriptor, target), roundQueue: rest };
    });
    setFeedback({});
    setShowSuccess(false);
    setShowFailure(false);
    setWrongAttemptsThisRound(0);
    pendingSuccessRef.current = false;
  }, [descriptor]);

  useEffect(() => {
    if (!targetItem) return;
    const timer = setTimeout(
      () => audioManager.play(descriptor.getPromptAudio(targetItem)),
      TIMING.AUDIO_DELAY_MS
    );
    return () => clearTimeout(timer);
  }, [targetItem, descriptor]);

  const handleCardClick = (item: T, index: number) => {
    if (showSuccess || showFailure || pendingSuccessRef.current || !targetItem || showSessionComplete) return;
    setTotalTaps(prev => prev + 1);
    if (descriptor.getItemId(item) === descriptor.getItemId(targetItem)) {
      pendingSuccessRef.current = true;
      setFeedback(prev => ({ ...prev, [index]: 'correct' }));
      setSuccessSpec(descriptor.getSuccessSpec(targetItem));
      const nextRoundsPlayed = roundsPlayed + 1;
      setRoundsPlayed(nextRoundsPlayed);
      setCorrectRounds(prev => prev + 1);
      if (nextRoundsPlayed >= maxRounds) {
        setTimeout(() => setShowSessionComplete(true), TIMING.SUCCESS_SHOW_DELAY_MS);
      } else {
        setTimeout(() => setShowSuccess(true), TIMING.SUCCESS_SHOW_DELAY_MS);
      }
    } else {
      const nextWrong = wrongAttemptsThisRound + 1;
      setWrongAttemptsThisRound(nextWrong);
      setFeedback(prev => ({ ...prev, [index]: 'wrong' }));
      if (nextWrong >= maxAttempts) {
        pendingSuccessRef.current = true;
        setFailureSpec(descriptor.getFailureSpec(targetItem));
        const nextRoundsPlayed = roundsPlayed + 1;
        setRoundsPlayed(nextRoundsPlayed);
        if (nextRoundsPlayed >= maxRounds) {
          setTimeout(() => setShowSessionComplete(true), TIMING.SUCCESS_SHOW_DELAY_MS);
        } else {
          setTimeout(() => setShowFailure(true), TIMING.SUCCESS_SHOW_DELAY_MS);
        }
      } else {
        audioManager.play(descriptor.getWrongAudio(targetItem, item));
        setTimeout(() => setFeedback(prev => ({ ...prev, [index]: null })), TIMING.FEEDBACK_RESET_MS);
      }
    }
  };

  const prompt = targetItem ? descriptor.renderPrompt(targetItem) : null;
  const gridColsClass = getGridColsClass(descriptor.gridCols);
  const gridMaxWidthClass = getGridMaxWidthClass(descriptor.gridCols);
  const activeCols = viewportWidth >= 640 ? (descriptor.gridCols.sm ?? descriptor.gridCols.base) : descriptor.gridCols.base;
  const activeRows = Math.max(1, Math.ceil(gridItems.length / activeCols));
  const gridGap = viewportWidth >= 768 ? 20 : viewportWidth >= 640 ? 16 : 12;
  const tileSize = gridAreaSize.width > 0 && gridAreaSize.height > 0
    ? Math.max(
        0,
        Math.floor(
          Math.min(
            (gridAreaSize.width - gridGap * (activeCols - 1)) / activeCols,
            (gridAreaSize.height - gridGap * (activeRows - 1)) / activeRows,
          ),
        ),
      )
    : null;
  const gridWidth = tileSize ? tileSize * activeCols + gridGap * (activeCols - 1) : undefined;
  const replayButton = (
    <IconButton
      onClick={() => targetItem && audioManager.play(
        descriptor.getReplayAudio
          ? descriptor.getReplayAudio(targetItem)
          : descriptor.getPromptAudio(targetItem)
      )}
      label="Prehrať zvuk"
    >
      <Volume2 size={24} className="sm:w-7 sm:h-7" />
    </IconButton>
  );

  return (
    <AppScreen>
      <TopBar
        left={<BackButton onClick={onExit} />}
        center={<RoundCounter completed={roundsPlayed} total={maxRounds} />}
        right={replayButton}
      />

      <div className="flex flex-col items-center justify-center gap-3 sm:gap-4 shrink-0 pb-3 sm:pb-4">
        {prompt && <div className="text-center max-w-full">{prompt}</div>}
      </div>

      <div ref={gridAreaRef} className="flex-1 min-h-0 flex items-center justify-center">
        <div
          className={`grid ${gridColsClass} gap-3 sm:gap-4 md:gap-5 w-full ${gridMaxWidthClass} mx-auto px-1 sm:px-2 place-content-center`}
          style={gridWidth ? { width: `${gridWidth}px` } : undefined}
        >
          {gridItems.map((item, i) => (
            <ChoiceTile
              key={descriptor.getItemId(item)}
              onClick={() => handleCardClick(item, i)}
              aria-label={descriptor.getItemId(item)}
              state={feedback[i] ?? 'neutral'}
              className="w-full overflow-hidden"
            >
              {descriptor.renderCard(item)}
            </ChoiceTile>
          ))}
        </div>
      </div>

      {successSpec && (
        <SuccessOverlay show={showSuccess} spec={successSpec} onComplete={startNewRound} locale={locale} />
      )}
      {failureSpec && (
        <FailureOverlay show={showFailure} spec={failureSpec} onComplete={startNewRound} />
      )}
      <SessionCompleteOverlay
        show={showSessionComplete}
        roundsCompleted={correctRounds}
        totalTaps={totalTaps}
        maxRounds={maxRounds}
        onComplete={onExit}
      />
    </AppScreen>
  );
}
