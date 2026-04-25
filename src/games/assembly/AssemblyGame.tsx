/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Volume2 } from 'lucide-react';
import { gsap } from 'gsap';
import { fisherYatesShuffle } from '../../shared/utils';
import { audioManager } from '../../shared/services/audioManager';
import { TIMING, getLocaleContent } from '../../shared/contentRegistry';
import { Word } from '../../shared/types';
import { AppScreen, BackButton, Card, IconButton, RoundCounter, TopBar } from '../../shared/ui';
import { SuccessOverlay } from '../../shared/components/SuccessOverlay';
import { SessionCompleteOverlay } from '../../shared/components/SessionCompleteOverlay';
import { GameLobby } from '../../shared/components/GameLobby';
import { GAME_DEFINITIONS_BY_ID } from '../../shared/gameCatalog';

interface AssemblyGameProps {
  locale: string;
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

interface PreparedRound {
  word: Word;
  board: BoardState;
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

function getPromptAudio(locale: string, word: Word) {
  return {
    clips: [
      { path: `${locale}/phrases/usporiadaj-slabiky`, fallbackText: 'Usporiadaj slabiky' },
      { path: `${locale}/words/${word.audioKey}`, fallbackText: word.word },
    ],
  };
}

function getReplayAudio(locale: string, word: Word) {
  return {
    clips: [{ path: `${locale}/words/${word.audioKey}`, fallbackText: word.word }],
  };
}

function getSuccessAudio(locale: string, word: Word) {
  return {
    clips: [{ path: `${locale}/words/${word.audioKey}`, fallbackText: word.word }],
  };
}

function getWrongAudio(locale: string, word: Word, selectedSyllable?: string) {
  return {
    clips: [
      ...(selectedSyllable
        ? [{ path: `${locale}/syllables/${selectedSyllable.toLowerCase()}`, fallbackText: selectedSyllable }]
        : []),
      { path: `${locale}/phrases/skus-to-znova`, fallbackText: 'Skús to znova.' },
      { path: `${locale}/words/${word.audioKey}`, fallbackText: word.word },
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

export function AssemblyGame({ locale, onExit, onOpenSettings }: AssemblyGameProps) {
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
  const tileIdRef = useRef(0);
  const boardRootRef = useRef<HTMLDivElement | null>(null);
  const promptTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrongPulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetRevealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetBoardTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roundAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeTweensRef = useRef(new Map<string, gsap.core.Tween>());
  const floatingTilesRef = useRef(new Map<string, HTMLElement>());

  const eligibleWords = useMemo(
    () =>
      getLocaleContent(locale).wordItems.filter(({ syllables }) => {
        const syllableCount = syllables.split('-').length;
        return syllableCount >= 2 && syllableCount <= 3;
      }),
    [locale],
  );

  const wordQueueRef = useRef<Word[]>([]);

  useEffect(() => {
    wordQueueRef.current = [];
  }, [eligibleWords]);

  const correctSyllables = useMemo(
    () => targetWord?.syllables.split('-') ?? [],
    [targetWord]
  );
  const trayTiles = board.trayTiles;
  const placedTiles = board.placedTiles;

  const createTiles = useCallback((syllables: string[]) => (
    fisherYatesShuffle(syllables).map((text, trayIndex) => ({
      id: `assembly-tile-${tileIdRef.current++}`,
      text,
      trayIndex,
    }))
  ), []);

  const prepareRound = useCallback((): PreparedRound | null => {
    if (eligibleWords.length === 0) return null;

    if (wordQueueRef.current.length === 0) {
      wordQueueRef.current = fisherYatesShuffle(eligibleWords);
    }
    const word = wordQueueRef.current.shift()!;
    const trayTiles = createTiles(word.syllables.split('-'));

    return {
      word,
      board: {
        trayTiles,
        placedTiles: Array.from({ length: trayTiles.length }, () => null),
      },
    };
  }, [createTiles, eligibleWords]);

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
    audioManager.play(getReplayAudio(locale, word));
  }, [locale]);

  const triggerWrongPulse = useCallback(() => {
    clearTimer(wrongPulseTimerRef);
    setWrongPulse(true);
    wrongPulseTimerRef.current = setTimeout(() => {
      setWrongPulse(false);
      wrongPulseTimerRef.current = null;
    }, TIMING.FEEDBACK_RESET_MS);
  }, []);

  const startNewRound = useCallback(() => {
    const nextRound = prepareRound();
    if (!nextRound) return;

    resetTransientTimers();
    const { word: nextWord, board: nextBoard } = nextRound;

    setTargetWord(nextWord);
    setBoard(nextBoard);
    setShowSuccess(false);
    setShowSessionComplete(false);
    setWrongPulse(false);
    setIsResettingBoard(false);
    setAnimatingTileIds([]);

    promptTimerRef.current = setTimeout(() => {
      audioManager.play(getPromptAudio(locale, nextWord));
      promptTimerRef.current = null;
    }, TIMING.AUDIO_DELAY_MS);
  }, [locale, prepareRound, resetTransientTimers]);

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
    audioManager.play(getWrongAudio(locale, targetWord, finalSelectedSyllable));
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
  }, [cleanupAllFloatingTiles, correctSyllables, locale, roundsPlayed, targetWord, triggerWrongPulse]);

  const handleTrayTileTap = useCallback((tileId: string) => {
    if (showSuccess || showSessionComplete || isResettingBoard) return;

    const emptySlots = board.placedTiles.filter(s => s === null).length;
    const placingLastTile = emptySlots === 1;

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

    if (typeof selectedTileText === 'string' && !placingLastTile) {
      const selectedSyllable = selectedTileText as string;
      audioManager.play({
        clips: [
          { path: `${locale}/syllables/${selectedSyllable.toLowerCase()}`, fallbackText: selectedSyllable },
        ],
      });
    }

    if (nextPlacedSnapshot) {
      validateBoard(nextPlacedSnapshot, selectedTileText ?? undefined);
    }
  }, [animateBoardMove, board.placedTiles, isResettingBoard, locale, showSessionComplete, showSuccess, validateBoard]);

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
    const nextRound = prepareRound();
    if (!nextRound) return;

    resetTransientTimers();
    setTargetWord(nextRound.word);
    setBoard(nextRound.board);
    setShowSuccess(false);
    setShowSessionComplete(false);
    setWrongPulse(false);
    setIsResettingBoard(false);
    setAnimatingTileIds([]);
    setGameState('PLAYING');
    promptTimerRef.current = setTimeout(() => {
      audioManager.play(getPromptAudio(locale, nextRound.word));
      promptTimerRef.current = null;
    }, TIMING.AUDIO_DELAY_MS);
  }, [locale, prepareRound, resetTransientTimers]);

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
    <AppScreen maxWidth="game" contentClassName="gap-4 sm:gap-5 md:gap-6 xl:max-w-5xl">
      <div ref={boardRootRef} className="flex flex-1 min-h-0 flex-col gap-4 sm:gap-5 md:gap-6">
        <TopBar
          left={<BackButton onClick={handleBackToLobby} />}
          center={<RoundCounter completed={roundsPlayed} total={MAX_ROUNDS} />}
          right={(
            <IconButton label="Prehrať slovo" onClick={() => playPromptAudio(targetWord)}>
              <Volume2 size={24} className="sm:w-7 sm:h-7" />
            </IconButton>
          )}
        />

        <div className="flex justify-center">
          <Card className="min-w-[180px] !rounded-[32px] !px-8 !py-6 text-center !shadow-block sm:min-w-[220px] sm:!rounded-[48px] sm:!px-12 sm:!py-8">
            <div className="text-[72px] sm:text-[112px] lg:text-[132px] leading-none" aria-label={targetWord?.word}>
              {targetWord?.emoji}
            </div>
          </Card>
        </div>

        <Card
          className={`mx-auto w-full max-w-3xl !rounded-[36px] !bg-white/70 !p-4 !shadow-block transition-all sm:!rounded-[48px] sm:!p-6 ${
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
        </Card>

        <Card className="mx-auto w-full max-w-3xl !rounded-[36px] !p-4 !shadow-block sm:!rounded-[48px] sm:!p-6">
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
        </Card>
      </div>

      {targetWord && (
        <SuccessOverlay
          show={showSuccess}
          spec={{
            echoLine: `${targetWord.syllables} ${targetWord.emoji}`,
            audioSpec: getSuccessAudio(locale, targetWord),
            praiseEntry: getLocaleContent(locale).praiseEntries.find((entry) => entry.audioKey === 'vyborne'),
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
    </AppScreen>
  );
}
