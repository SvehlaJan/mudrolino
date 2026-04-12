/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { ArrowLeft, Volume2 } from 'lucide-react';
import { gsap } from 'gsap';
import { audioManager } from '../../shared/services/audioManager';
import { PRAISE_ENTRIES, TIMING, WORD_ITEMS } from '../../shared/contentRegistry';
import { Word } from '../../shared/types';
import { SuccessOverlay } from '../../shared/components/SuccessOverlay';
import { SessionCompleteOverlay } from '../../shared/components/SessionCompleteOverlay';
import { GameLobby } from '../../shared/components/GameLobby';
import { GAME_DEFINITIONS_BY_ID } from '../../shared/gameCatalog';

interface AssemblyGameProps {
  onExit: () => void;
  onOpenSettings: () => void;
}

type GameState = 'HOME' | 'PLAYING';

interface AssemblyTile {
  id: string;
  text: string;
  trayIndex: number;
}

interface BoardState {
  trayTiles: AssemblyTile[];
  placedTiles: (AssemblyTile | null)[];
}

interface TileButtonProps {
  tile: AssemblyTile;
  disabled?: boolean;
  hidden?: boolean;
  onClick?: () => void;
}

interface AnswerSlotProps {
  index: number;
  tile: AssemblyTile | null;
  isResettingBoard: boolean;
  hiddenTileIds: string[];
  onTileTap: (slotIndex: number) => void;
}

const MAX_ROUNDS = 5;
const TILE_FLIGHT_DURATION_S = 0.62;
const BOARD_SETTLE_DELAY_MS = 500;
const WRONG_REVEAL_DELAY_MS = 180;
const WRONG_RESET_DELAY_MS = 320;
const ELIGIBLE_WORDS = WORD_ITEMS.filter(({ syllables }) => {
  const syllableCount = syllables.split('-').length;
  return syllableCount >= 2 && syllableCount <= 3;
});

function shuffleItems<T>(items: T[]) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }
  return shuffled;
}

function getPromptAudio(word: Word) {
  return {
    clips: [
      { path: 'phrases/usporiadaj-slabiky', fallbackText: 'Usporiadaj slabiky' },
      { path: `words/${word.audioKey}`, fallbackText: word.word },
    ],
  };
}

function getReplayAudio(word: Word) {
  return {
    clips: [{ path: `words/${word.audioKey}`, fallbackText: word.word }],
  };
}

function getSuccessAudio(word: Word) {
  return {
    clips: [{ path: `words/${word.audioKey}`, fallbackText: word.word }],
  };
}

function getWrongAudio(word: Word, selectedSyllable?: string) {
  return {
    clips: [
      ...(selectedSyllable
        ? [{ path: `syllables/${selectedSyllable.toLowerCase()}`, fallbackText: selectedSyllable }]
        : []),
      { path: 'phrases/skus-to-znova', fallbackText: 'Skús to znova.' },
      { path: `words/${word.audioKey}`, fallbackText: word.word },
    ],
  };
}

function renderTileLabel(text: string) {
  return text.toUpperCase();
}

function clearTimer(timerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>) {
  if (timerRef.current) {
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }
}

function TileButton({
  tile,
  disabled = false,
  hidden = false,
  onClick,
}: TileButtonProps) {
  return (
    <button
      type="button"
      data-assembly-tile-id={tile.id}
      disabled={disabled}
      onClick={onClick}
      style={hidden ? { opacity: 0, visibility: 'hidden' } : undefined}
      className={`w-full h-[72px] sm:h-[92px] min-w-[112px] sm:min-w-[150px] px-6 sm:px-8 rounded-[24px] border-2 border-white/30 bg-accent-blue text-white text-3xl sm:text-5xl font-black uppercase tracking-wide ${disabled ? 'pointer-events-none opacity-70' : ''} ${hidden ? 'opacity-0' : ''}`}
    >
      {renderTileLabel(tile.text)}
    </button>
  );
}

function AnswerSlot({
  index,
  tile,
  isResettingBoard,
  hiddenTileIds,
  onTileTap,
}: AnswerSlotProps) {
  const isHidden = tile ? hiddenTileIds.includes(tile.id) : false;

  return (
    <div
      className={`min-h-[88px] sm:min-h-[120px] rounded-[28px] sm:rounded-[32px] border-[3px] border-dashed flex items-center justify-center ${
        tile ? 'border-primary/35 bg-primary/8' : 'border-shadow/15 bg-bg-light/55'
      }`}
    >
      <div className="w-full max-w-[240px] h-[72px] sm:h-[92px] flex items-center justify-center">
        {tile ? (
          <TileButton
            tile={tile}
            disabled={isResettingBoard || isHidden}
            hidden={isHidden}
            onClick={() => onTileTap(index)}
          />
        ) : (
          <span className="text-shadow/25 text-xl sm:text-2xl font-black">?</span>
        )}
      </div>
    </div>
  );
}

export function AssemblyGame({ onExit, onOpenSettings }: AssemblyGameProps) {
  const [gameState, setGameState] = useState<GameState>('HOME');
  const lobby = GAME_DEFINITIONS_BY_ID.ASSEMBLY.lobby;
  const [targetWord, setTargetWord] = useState<Word | null>(null);
  const [board, setBoard] = useState<BoardState>({ trayTiles: [], placedTiles: [] });
  const [showSuccess, setShowSuccess] = useState(false);
  const [showSessionComplete, setShowSessionComplete] = useState(false);
  const [roundsPlayed, setRoundsPlayed] = useState(0);
  const [correctRounds, setCorrectRounds] = useState(0);
  const [totalChecks, setTotalChecks] = useState(0);
  const [isResettingBoard, setIsResettingBoard] = useState(false);
  const [wrongPulse, setWrongPulse] = useState(false);
  const [animatingTileIds, setAnimatingTileIds] = useState<string[]>([]);
  const previousWordKeyRef = useRef<string | null>(null);
  const tileIdRef = useRef(0);
  const boardRootRef = useRef<HTMLDivElement | null>(null);
  const promptTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrongPulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetRevealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetBoardTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roundAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeTweensRef = useRef(new Map<string, gsap.core.Tween>());
  const floatingTilesRef = useRef(new Map<string, HTMLElement>());

  const correctSyllables = useMemo(
    () => targetWord?.syllables.split('-') ?? [],
    [targetWord]
  );
  const trayTiles = board.trayTiles;
  const placedTiles = board.placedTiles;

  const createTiles = useCallback((syllables: string[]) => (
    shuffleItems(syllables).map((text, trayIndex) => ({
      id: `assembly-tile-${tileIdRef.current++}`,
      text,
      trayIndex,
    }))
  ), []);

  const cleanupFloatingTile = useCallback((tileId: string) => {
    activeTweensRef.current.get(tileId)?.kill();
    activeTweensRef.current.delete(tileId);
    const floatingTile = floatingTilesRef.current.get(tileId);
    if (floatingTile) {
      floatingTile.remove();
      floatingTilesRef.current.delete(tileId);
    }
    setAnimatingTileIds(prev => prev.filter(id => id !== tileId));
  }, []);

  const cleanupAllFloatingTiles = useCallback(() => {
    Array.from(activeTweensRef.current.keys()).forEach(tileId => {
      cleanupFloatingTile(tileId);
    });
    setAnimatingTileIds([]);
  }, [cleanupFloatingTile]);

  const resetTransientTimers = useCallback(() => {
    clearTimer(promptTimerRef);
    clearTimer(wrongPulseTimerRef);
    clearTimer(resetRevealTimerRef);
    clearTimer(resetBoardTimerRef);
    clearTimer(roundAdvanceTimerRef);
    cleanupAllFloatingTiles();
  }, [cleanupAllFloatingTiles]);

  const playPromptAudio = useCallback((word: Word | null) => {
    if (!word) return;
    audioManager.play(getReplayAudio(word));
  }, []);

  const triggerWrongPulse = useCallback(() => {
    clearTimer(wrongPulseTimerRef);
    setWrongPulse(true);
    wrongPulseTimerRef.current = setTimeout(() => {
      setWrongPulse(false);
      wrongPulseTimerRef.current = null;
    }, TIMING.FEEDBACK_RESET_MS);
  }, []);

  const startNewRound = useCallback(() => {
    if (ELIGIBLE_WORDS.length === 0) return;

    resetTransientTimers();
    const candidates =
      ELIGIBLE_WORDS.length > 1
        ? ELIGIBLE_WORDS.filter(word => word.audioKey !== previousWordKeyRef.current)
        : ELIGIBLE_WORDS;
    const nextWord = candidates[Math.floor(Math.random() * candidates.length)];
    const nextTiles = createTiles(nextWord.syllables.split('-'));

    previousWordKeyRef.current = nextWord.audioKey;
    setTargetWord(nextWord);
    setBoard({
      trayTiles: nextTiles,
      placedTiles: Array.from({ length: nextTiles.length }, () => null),
    });
    setShowSuccess(false);
    setShowSessionComplete(false);
    setWrongPulse(false);
    setIsResettingBoard(false);
    setAnimatingTileIds([]);

    promptTimerRef.current = setTimeout(() => {
      audioManager.play(getPromptAudio(nextWord));
      promptTimerRef.current = null;
    }, TIMING.AUDIO_DELAY_MS);
  }, [createTiles, resetTransientTimers]);

  useEffect(() => {
    return () => {
      audioManager.stop();
      resetTransientTimers();
    };
  }, [resetTransientTimers]);

  useEffect(() => {
    if (gameState === 'PLAYING' && !targetWord) startNewRound(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [gameState, targetWord, startNewRound]);

  const animateBoardMove = useCallback((tileId: string, mutateBoard: () => void) => {
    const root = boardRootRef.current;
    const source = root?.querySelector(`[data-assembly-tile-id="${tileId}"]`) as HTMLElement | null;
    if (!root || !source) {
      mutateBoard();
      return;
    }

    cleanupFloatingTile(tileId);

    const sourceRect = source.getBoundingClientRect();
    const clone = source.cloneNode(true) as HTMLElement;
    clone.style.position = 'fixed';
    clone.style.top = `${sourceRect.top}px`;
    clone.style.left = `${sourceRect.left}px`;
    clone.style.width = `${sourceRect.width}px`;
    clone.style.height = `${sourceRect.height}px`;
    clone.style.margin = '0';
    clone.style.pointerEvents = 'none';
    clone.style.zIndex = '40';
    clone.style.transformOrigin = 'top left';
    document.body.appendChild(clone);
    floatingTilesRef.current.set(tileId, clone);

    flushSync(() => {
      setAnimatingTileIds(prev => (prev.includes(tileId) ? prev : [...prev, tileId]));
      mutateBoard();
    });

    const destination = root.querySelector(`[data-assembly-tile-id="${tileId}"]`) as HTMLElement | null;
    if (!destination) {
      cleanupFloatingTile(tileId);
      return;
    }

    const destinationRect = destination.getBoundingClientRect();
    const tween = gsap.to(clone, {
      top: destinationRect.top,
      left: destinationRect.left,
      width: destinationRect.width,
      height: destinationRect.height,
      duration: TILE_FLIGHT_DURATION_S,
      ease: 'power2.inOut',
      onComplete: () => {
        activeTweensRef.current.delete(tileId);
        setAnimatingTileIds(prev => prev.filter(id => id !== tileId));
        requestAnimationFrame(() => {
          if (floatingTilesRef.current.get(tileId) === clone) {
            clone.remove();
            floatingTilesRef.current.delete(tileId);
          }
        });
      },
    });
    activeTweensRef.current.set(tileId, tween);
  }, [cleanupFloatingTile]);

  const validateBoard = useCallback((nextPlaced: (AssemblyTile | null)[], finalSelectedSyllable?: string) => {
    if (!targetWord || nextPlaced.some(slot => slot === null)) return;

    const isCorrect = nextPlaced.every((tile, index) => tile?.text === correctSyllables[index]);
    setTotalChecks(prev => prev + 1);

    if (isCorrect) {
      const nextRoundsPlayed = roundsPlayed + 1;
      setRoundsPlayed(nextRoundsPlayed);
      setCorrectRounds(prev => prev + 1);
      clearTimer(roundAdvanceTimerRef);
      roundAdvanceTimerRef.current = setTimeout(() => {
        if (nextRoundsPlayed >= MAX_ROUNDS) {
          setShowSessionComplete(true);
        } else {
          setShowSuccess(true);
        }
        roundAdvanceTimerRef.current = null;
      }, BOARD_SETTLE_DELAY_MS + TIMING.SUCCESS_SHOW_DELAY_MS);
      return;
    }

    triggerWrongPulse();
    audioManager.play(getWrongAudio(targetWord, finalSelectedSyllable));
    const resetTiles = nextPlaced.filter((tile): tile is AssemblyTile => tile !== null);

    clearTimer(resetRevealTimerRef);
    clearTimer(resetBoardTimerRef);
    resetRevealTimerRef.current = setTimeout(() => {
      setIsResettingBoard(true);
      resetRevealTimerRef.current = null;
      resetBoardTimerRef.current = setTimeout(() => {
        setBoard({
          trayTiles: [...resetTiles].sort((first, second) => first.trayIndex - second.trayIndex),
          placedTiles: Array.from({ length: correctSyllables.length }, () => null),
        });
        setIsResettingBoard(false);
        cleanupAllFloatingTiles();
        resetBoardTimerRef.current = null;
      }, WRONG_RESET_DELAY_MS);
    }, BOARD_SETTLE_DELAY_MS + WRONG_REVEAL_DELAY_MS);
  }, [cleanupAllFloatingTiles, correctSyllables, roundsPlayed, targetWord, triggerWrongPulse]);

  const handleTrayTileTap = useCallback((tileId: string) => {
    if (showSuccess || showSessionComplete || isResettingBoard) return;

    let nextPlacedSnapshot: (AssemblyTile | null)[] | null = null;
    let selectedTileText: string | null = null;
    animateBoardMove(tileId, () => {
      setBoard(prevBoard => {
        const tile = prevBoard.trayTiles.find(candidate => candidate.id === tileId);
        if (!tile) return prevBoard;
        selectedTileText = tile.text;

        const targetSlotIndex = prevBoard.placedTiles.findIndex(slot => slot === null);
        if (targetSlotIndex < 0) return prevBoard;

        const nextPlaced = [...prevBoard.placedTiles];
        nextPlaced[targetSlotIndex] = tile;
        nextPlacedSnapshot = nextPlaced;

        return {
          trayTiles: prevBoard.trayTiles.filter(candidate => candidate.id !== tileId),
          placedTiles: nextPlaced,
        };
      });
    });

    if (typeof selectedTileText === 'string') {
      const selectedSyllable = selectedTileText as string;
      audioManager.play({
        clips: [
          { path: `syllables/${selectedSyllable.toLowerCase()}`, fallbackText: selectedSyllable },
        ],
      });
    }

    if (nextPlacedSnapshot) {
      validateBoard(nextPlacedSnapshot, selectedTileText ?? undefined);
    }
  }, [animateBoardMove, isResettingBoard, showSessionComplete, showSuccess, validateBoard]);

  const handlePlacedTileTap = useCallback((slotIndex: number) => {
    if (showSuccess || showSessionComplete || isResettingBoard) return;

    const tile = placedTiles[slotIndex];
    if (!tile) return;

    animateBoardMove(tile.id, () => {
      setBoard(prevBoard => {
        const slotTile = prevBoard.placedTiles[slotIndex];
        if (!slotTile) return prevBoard;

        const nextPlaced = [...prevBoard.placedTiles];
        nextPlaced[slotIndex] = null;

        return {
          trayTiles: [...prevBoard.trayTiles, slotTile].sort((first, second) => first.trayIndex - second.trayIndex),
          placedTiles: nextPlaced,
        };
      });
    });
  }, [animateBoardMove, isResettingBoard, placedTiles, showSessionComplete, showSuccess]);

  const handlePlay = useCallback(() => {
    setGameState('PLAYING');
  }, []);

  const handleBackToLobby = useCallback(() => {
    audioManager.stop();
    resetTransientTimers();
    setShowSuccess(false);
    setShowSessionComplete(false);
    setTargetWord(null);
    setBoard({ trayTiles: [], placedTiles: [] });
    setRoundsPlayed(0);
    setCorrectRounds(0);
    setTotalChecks(0);
    setIsResettingBoard(false);
    setWrongPulse(false);
    setAnimatingTileIds([]);
    setGameState('HOME');
  }, [resetTransientTimers]);

  if (gameState === 'HOME') {
    return (
      <GameLobby
        title={lobby.title}
        playButtonColorClassName={lobby.playButtonColorClassName}
        subtitle={<>Poskladaj slovo zo slabík</>}
        onPlay={handlePlay}
        onBack={onExit}
        onOpenSettings={onOpenSettings}
        topDecorationClassName={lobby.topDecorationClassName}
        bottomDecorationClassName={lobby.bottomDecorationClassName}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center p-4 sm:p-8 relative overflow-hidden">
      <button
        onClick={handleBackToLobby}
        aria-label="Späť"
        className="fixed safe-top sm:safe-top-lg safe-left sm:safe-left-lg w-12 h-12 sm:w-14 sm:h-14 bg-white rounded-full flex items-center justify-center text-text-main shadow-block transition-all active:translate-y-2 active:shadow-block-pressed z-20"
      >
        <ArrowLeft size={24} className="sm:w-7 sm:h-7" />
      </button>

      <button
        onClick={() => playPromptAudio(targetWord)}
        aria-label="Prehrať slovo"
        className="fixed safe-top sm:safe-top-lg safe-right sm:safe-right-lg w-12 h-12 sm:w-14 sm:h-14 bg-white rounded-full flex items-center justify-center text-text-main shadow-block z-20"
      >
        <Volume2 size={24} className="sm:w-7 sm:h-7" />
      </button>

      <div ref={boardRootRef} className="flex-1 w-full max-w-4xl xl:max-w-5xl flex flex-col gap-4 sm:gap-6 md:gap-8 mt-14 sm:mt-16 md:mt-20 pb-4 sm:pb-6">
        <div className="flex justify-center">
          <div className="bg-white rounded-full px-6 py-2 shadow-block font-bold text-lg sm:text-xl text-text-main">
            ✓ {roundsPlayed} / {MAX_ROUNDS}
          </div>
        </div>

        <div className="flex justify-center">
          <div className="bg-white rounded-[32px] sm:rounded-[48px] px-8 py-6 sm:px-12 sm:py-8 shadow-block min-w-[180px] sm:min-w-[220px] text-center">
            <div className="text-[72px] sm:text-[112px] lg:text-[132px] leading-none" aria-label={targetWord?.word}>
              {targetWord?.emoji}
            </div>
          </div>
        </div>

        <div
          className={`w-full max-w-3xl mx-auto bg-white/70 rounded-[36px] sm:rounded-[48px] p-4 sm:p-6 shadow-block transition-all ${
            wrongPulse ? 'ring-4 ring-soft-watermelon scale-[1.01]' : ''
          }`}
        >
          <div className={`grid gap-3 sm:gap-5 ${placedTiles.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
            {placedTiles.map((tile, index) => (
              <AnswerSlot
                key={`answer-slot-${index}`}
                index={index}
                tile={tile}
                isResettingBoard={isResettingBoard}
                hiddenTileIds={animatingTileIds}
                onTileTap={handlePlacedTileTap}
              />
            ))}
          </div>
        </div>

        <div className="w-full max-w-3xl mx-auto bg-white rounded-[36px] sm:rounded-[48px] p-4 sm:p-6 shadow-block">
          <div className={`grid gap-3 sm:gap-5 min-h-[112px] ${correctSyllables.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
            {Array.from({ length: correctSyllables.length }, (_, index) => {
              const tile = trayTiles.find(candidate => candidate.trayIndex === index) ?? null;

              return (
                <div
                  key={`tray-slot-${index}`}
                  className="min-h-[88px] sm:min-h-[120px] flex items-center justify-center"
                >
                  <div className="w-full max-w-[240px] h-[72px] sm:h-[92px] flex items-center justify-center">
                    {tile ? (
                      <TileButton
                        tile={tile}
                        disabled={isResettingBoard || animatingTileIds.includes(tile.id)}
                        hidden={animatingTileIds.includes(tile.id)}
                        onClick={() => handleTrayTileTap(tile.id)}
                      />
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {targetWord && (
        <SuccessOverlay
          show={showSuccess}
          spec={{
            echoLine: `${targetWord.syllables} ${targetWord.emoji}`,
            audioSpec: getSuccessAudio(targetWord),
            praiseEntry: PRAISE_ENTRIES.find((entry) => entry.audioKey === 'vyborne'),
          }}
          onComplete={startNewRound}
        />
      )}

      <SessionCompleteOverlay
        show={showSessionComplete}
        roundsCompleted={correctRounds}
        totalTaps={totalChecks}
        maxRounds={MAX_ROUNDS}
        onComplete={handleBackToLobby}
      />
    </div>
  );
}
