/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Volume2, ArrowLeft } from 'lucide-react';
import { GameDescriptor, SuccessSpec, FailureSpec } from '../types';
import { audioManager } from '../services/audioManager';
import { SuccessOverlay } from './SuccessOverlay';
import { FailureOverlay } from './FailureOverlay';
import { SessionCompleteOverlay } from './SessionCompleteOverlay';
import { TIMING } from '../contentRegistry';

interface FindItGameProps<T> {
  descriptor: GameDescriptor<T>;
  /** Called when the child taps the back button — typically sets parent gameState back to 'HOME'. */
  onExit: () => void;
}

export function FindItGame<T>({ descriptor, onExit }: FindItGameProps<T>) {
  const [targetItem, setTargetItem] = useState<T | null>(null);
  const [gridItems, setGridItems] = useState<T[]>([]);
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

  const targetItemRef = useRef<T | null>(null);
  const pendingSuccessRef = useRef(false);
  useEffect(() => { targetItemRef.current = targetItem; }, [targetItem]);

  useEffect(() => {
    return () => audioManager.stop();
  }, []);

  const startNewRound = useCallback(() => {
    const pool = descriptor.getItems();
    if (pool.length === 0) return;
    const effectiveGridSize = Math.min(descriptor.gridSize, pool.length);
    const current = targetItemRef.current;
    const currentId = current ? descriptor.getItemId(current) : null;
    const eligible = currentId
      ? pool.filter(item => descriptor.getItemId(item) !== currentId)
      : pool;
    const candidates = eligible.length > 0 ? eligible : pool;
    const target = candidates[Math.floor(Math.random() * candidates.length)];
    const others = pool
      .filter(item => descriptor.getItemId(item) !== descriptor.getItemId(target))
      .sort(() => 0.5 - Math.random())
      .slice(0, effectiveGridSize - 1);
    const grid = [...others, target].sort(() => 0.5 - Math.random());
    setTargetItem(target);
    setGridItems(grid);
    setFeedback({});
    setShowSuccess(false);
    setShowFailure(false);
    setWrongAttemptsThisRound(0);
    pendingSuccessRef.current = false;
  }, [descriptor]);

  useEffect(() => {
    if (!targetItem) startNewRound(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [targetItem, startNewRound]);

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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-8">
      <button
        onClick={onExit}
        aria-label="Späť"
        className="fixed safe-top sm:safe-top-lg safe-left sm:safe-left-lg w-12 h-12 sm:w-14 sm:h-14 bg-white rounded-full flex items-center justify-center text-text-main shadow-block transition-all active:translate-y-2 active:shadow-block-pressed z-20"
      >
        <ArrowLeft size={24} className="sm:w-7 sm:h-7" />
      </button>

      <div className="flex flex-col items-center gap-4 sm:gap-8 mb-8 sm:mb-12">
        <div className="bg-white rounded-full px-6 py-2 shadow-block font-bold text-lg sm:text-xl text-text-main">
          ✓ {roundsPlayed} / {maxRounds}
        </div>
        {descriptor.speakerButtonPosition === 'inline' ? (
          <div className="flex flex-row items-center gap-4">
            <button
              onClick={() => targetItem && audioManager.play(
                descriptor.getReplayAudio
                  ? descriptor.getReplayAudio(targetItem)
                  : descriptor.getPromptAudio(targetItem)
              )}
              aria-label="Prehrať zvuk"
              className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-full shadow-block flex items-center justify-center text-text-main shrink-0"
            >
              <Volume2 size={32} className="sm:w-10 sm:h-10" />
            </button>
            {prompt && <div className="text-center">{prompt}</div>}
          </div>
        ) : (
          <>
            <button
              onClick={() => targetItem && audioManager.play(
                descriptor.getReplayAudio
                  ? descriptor.getReplayAudio(targetItem)
                  : descriptor.getPromptAudio(targetItem)
              )}
              aria-label="Prehrať zvuk"
              className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-full shadow-block flex items-center justify-center text-text-main"
            >
              <Volume2 size={32} className="sm:w-10 sm:h-10" />
            </button>
            {prompt && <div className="text-center">{prompt}</div>}
          </>
        )}
      </div>

      <div className={`grid ${descriptor.gridColsClass} gap-4 sm:gap-8 w-full max-w-4xl px-4`}>
        {gridItems.map((item, i) => (
          <button
            key={descriptor.getItemId(item)}
            onClick={() => handleCardClick(item, i)}
            aria-label={descriptor.getItemId(item)}
            className={`
              w-full aspect-square rounded-[24px] sm:rounded-[32px] flex items-center justify-center transition-all
              ${feedback[i] === 'correct' ? 'bg-success text-primary shadow-block-correct -translate-y-1' : 'bg-white text-text-main shadow-block'}
              ${feedback[i] === 'wrong' ? 'opacity-50 shadow-block-pressed scale-95' : 'active:translate-y-2 active:shadow-block-pressed'}
            `}
          >
            {descriptor.renderCard(item)}
          </button>
        ))}
      </div>

      {successSpec && (
        <SuccessOverlay show={showSuccess} spec={successSpec} onComplete={startNewRound} />
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
    </div>
  );
}
