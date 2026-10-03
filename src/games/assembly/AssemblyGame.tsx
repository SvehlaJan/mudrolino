/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { gsap } from 'gsap';
import { createFloatingTile } from '../../shared/game/motion/tileTransfer';
import { useReducedMotion } from 'motion/react';
import { AudioSpec, PraiseEntry, SuccessSpec, Word } from '../../shared/types';
import { GameRuntimeProps } from '../../shared/gameRuntime';
import { useContent } from '../../shared/contexts/ContentContext';
import { GameLobby } from '../../shared/components/GameLobby';
import { getSuccessOverlayAudioSpec } from '../../shared/components/successOverlayAudio';
import { getItemAnnouncementAudio, getItemAudioClip, getPhraseClip } from '../../shared/contentRegistry';
import { setE2EState } from '../../shared/services/e2eState';
import { getUiCopy } from '../../shared/uiCopy';
import { fisherYatesShuffle } from '../../shared/utils';
import {
  AnswerGroup,
  GamePrompt,
  GameShell,
  InsetSlot,
  PictureCard,
  PlayTray,
  TactilePiece,
  WordRail,
  useGameSession,
  useGameSessionAudio,
  type GameShellCompletion,
  type GameShellFeedback,
  type GameState,
  type TactilePieceState,
} from '../../shared/game';
import {
  AssemblyBoard,
  AssemblyTile,
  createAssemblyBoard,
  getCorrectTileOrder,
  moveTileToFirstOpenSlot,
  returnTileToTray,
} from './assemblyLogic';
import { getAssemblySelectionAudioDecision } from './assemblyAudioLogic';

const INSTRUCTION = 'Usporiadaj slabiky';
const ANSWER_GROUP_LABEL = 'Zásobník slabík';
const MAX_ROUNDS = 5;
const TILE_FLIGHT_DURATION_S = 0.62;
const REDUCED_MOTION_FADE_MS = 220;

const FALLBACK_PRAISE: PraiseEntry = { emoji: '🌟', text: 'Výborne!', audioKey: 'vyborne' };

function pickPraise(praiseEntries: PraiseEntry[]): PraiseEntry {
  return praiseEntries[Math.floor(Math.random() * praiseEntries.length)] ?? FALLBACK_PRAISE;
}

function getPromptAudio(locale: string, word: Word): AudioSpec {
  return {
    clips: [
      getPhraseClip(locale, 'orderSyllables'),
      getItemAudioClip(locale, 'words', word.audioKey, word.word),
    ],
  };
}

function getReplayAudio(locale: string, word: Word): AudioSpec {
  return { clips: [getItemAudioClip(locale, 'words', word.audioKey, word.word)] };
}

function getCompletedLine(word: Word): string {
  return `${word.syllables} ${word.emoji}`;
}

function getSuccessSpec(locale: string, word: Word): SuccessSpec {
  return {
    echoLine: getCompletedLine(word),
    audioSpec: { clips: [getItemAudioClip(locale, 'words', word.audioKey, word.word)] },
  };
}

/**
 * The documented Assembly exception: a wrong FINAL tile skips the normal immediate
 * selected-syllable call entirely and plays this exact 3-clip sequence instead — the syllable
 * that was just placed, the shared retry phrase, then the target word — as the resolveAnswer
 * `selectionAudio` itself (useGameSession never awaits `verdictAudio` for a non-terminal 'wrong'
 * outcome, which this game always is, since it never fails). See assemblyAudioLogic.ts.
 */
function getWrongSequenceAudio(locale: string, word: Word, selectedSyllable: string): AudioSpec {
  return {
    clips: [
      getItemAudioClip(locale, 'syllables', selectedSyllable.toLowerCase(), selectedSyllable),
      getPhraseClip(locale, 'retry'),
      getItemAudioClip(locale, 'words', word.audioKey, word.word),
    ],
  };
}

function renderTileLabel(text: string): string {
  return text.toUpperCase();
}

/** Mirrors CompleteLetterGame/CompleteSyllableGame's own per-answer piece-state convention. */
function getTilePieceState(state: GameState, tileId: string): TactilePieceState | undefined {
  if (state.selectedAnswerId !== tileId) return undefined;
  if (state.phase === 'resolving-answer') return 'pressed';
  if (state.phase === 'answered-correctly') return 'settled';
  if (state.phase === 'answered-incorrectly') return 'retry';
  return undefined;
}

function findNextTrayFocusId(trayTilesAfter: AssemblyTile[], placedTrayIndex: number): string | null {
  if (trayTilesAfter.length === 0) return null;
  const sorted = [...trayTilesAfter].sort((a, b) => a.trayIndex - b.trayIndex);
  return (sorted.find((tile) => tile.trayIndex >= placedTrayIndex) ?? sorted[0]).id;
}

/** A minimal single-row roving-tabstop keydown handler, scoped to the rail's own occupied
 * slots — WordRail/InsetSlot render an <ol>/<li> list, so the Phase 5 AnswerGroup component
 * (which clones its own direct button children) cannot wrap it directly; this reproduces the
 * same Home/End/ArrowLeft/ArrowRight contract as its own, independent group. */
function handleRailKeyDown(event: React.KeyboardEvent<HTMLDivElement>, container: HTMLElement | null) {
  if (!container) return;
  const buttons = Array.from(container.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
  if (buttons.length === 0) return;
  const currentIndex = buttons.findIndex((button) => button === document.activeElement);
  const sourceIndex = currentIndex >= 0 ? currentIndex : 0;
  let targetIndex: number | undefined;
  switch (event.key) {
    case 'ArrowRight':
      event.preventDefault();
      targetIndex = Math.min(sourceIndex + 1, buttons.length - 1);
      break;
    case 'ArrowLeft':
      event.preventDefault();
      targetIndex = Math.max(sourceIndex - 1, 0);
      break;
    case 'Home':
      event.preventDefault();
      targetIndex = 0;
      break;
    case 'End':
      event.preventDefault();
      targetIndex = buttons.length - 1;
      break;
    default:
      return;
  }
  buttons[targetIndex]?.focus();
}

interface RoundState {
  word: Word | null;
  board: AssemblyBoard;
}

const EMPTY_ROUND_STATE: RoundState = { word: null, board: { trayTiles: [], placedTiles: [] } };

interface AssemblyPlayfieldProps {
  eligibleWords: Word[];
  onExit: () => void;
}

function AssemblyPlayfield({ eligibleWords, onExit }: AssemblyPlayfieldProps) {
  const { locale, praiseEntries } = useContent();
  const isEmpty = eligibleWords.length === 0;
  const prefersReducedMotion = useReducedMotion();

  const tileIdRef = useRef(0);
  const wordQueueRef = useRef<Word[]>([]);
  const boardRootRef = useRef<HTMLDivElement | null>(null);
  const trayRegionRef = useRef<HTMLDivElement | null>(null);
  const railRegionRef = useRef<HTMLDivElement | null>(null);
  const activeTweensRef = useRef(new Map<string, gsap.core.Tween>());
  const floatingTilesRef = useRef(new Map<string, HTMLElement>());
  const fadeTimersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const flightResolversRef = useRef(new Map<string, (completed: boolean) => void>());
  const mountedRef = useRef(false);
  const pendingFocusTileIdRef = useRef<string | null>(null);
  const answerLockRef = useRef(false);

  const createBoard = useCallback((syllables: string[]): AssemblyBoard => createAssemblyBoard(
    syllables,
    () => `assembly-tile-${tileIdRef.current++}`,
    (tiles) => fisherYatesShuffle(tiles).map((tile, trayIndex) => ({ ...tile, trayIndex })),
  ), []);

  const drawWord = useCallback((): Word | null => {
    if (eligibleWords.length === 0) return null;
    if (wordQueueRef.current.length === 0) wordQueueRef.current = fisherYatesShuffle(eligibleWords);
    return wordQueueRef.current.shift()!;
  }, [eligibleWords]);

  const buildRound = useCallback((): RoundState => {
    const word = drawWord();
    if (!word) return EMPTY_ROUND_STATE;
    return { word, board: createBoard(word.syllables.split('-')) };
  }, [drawWord, createBoard]);

  const [roundState, setRoundState] = useState<RoundState>(() => buildRound());
  const { word: targetWord, board } = roundState;
  const trayTiles = board.trayTiles;
  const placedTiles = board.placedTiles;
  const placedTileList = useMemo(
    () => placedTiles.filter((tile): tile is AssemblyTile => tile !== null),
    [placedTiles],
  );
  const traySlots = useMemo(() => {
    return Array.from({ length: trayTiles.length + placedTileList.length }, (_, trayIndex) => ({
      trayIndex,
      tile: trayTiles.find((candidate) => candidate.trayIndex === trayIndex),
    }));
  }, [trayTiles, placedTileList]);

  const correctSyllables = useMemo(() => targetWord?.syllables.split('-') ?? [], [targetWord]);
  const correctTileOrder = useMemo(
    () => (targetWord ? getCorrectTileOrder(board, correctSyllables) : []),
    [targetWord, board, correctSyllables],
  );

  const [completionPraise, setCompletionPraise] = useState<PraiseEntry>(() => pickPraise(praiseEntries));
  const [roundPraise, setRoundPraise] = useState<PraiseEntry | null>(null);
  const [animatingTileIds, setAnimatingTileIds] = useState<string[]>([]);
  const [enteringTileIds, setEnteringTileIds] = useState<string[]>([]);
  const [railActiveTileId, setRailActiveTileId] = useState<string | null>(null);

  const resolvedRailActiveId = placedTileList.some((tile) => tile.id === railActiveTileId)
    ? railActiveTileId
    : placedTileList[0]?.id ?? null;

  const cleanupFloatingTile = useCallback((tileId: string) => {
    flightResolversRef.current.get(tileId)?.(false);
    flightResolversRef.current.delete(tileId);
    activeTweensRef.current.get(tileId)?.kill();
    activeTweensRef.current.delete(tileId);
    const floatingTile = floatingTilesRef.current.get(tileId);
    if (floatingTile) {
      floatingTile.remove();
      floatingTilesRef.current.delete(tileId);
    }
    const fadeTimer = fadeTimersRef.current.get(tileId);
    if (fadeTimer) {
      clearTimeout(fadeTimer);
      fadeTimersRef.current.delete(tileId);
    }
    setAnimatingTileIds((prev) => (prev.includes(tileId) ? prev.filter((id) => id !== tileId) : prev));
    setEnteringTileIds((prev) => (prev.includes(tileId) ? prev.filter((id) => id !== tileId) : prev));
  }, []);

  const cleanupAllFloatingTiles = useCallback(() => {
    const tileIds = new Set([...activeTweensRef.current.keys(), ...fadeTimersRef.current.keys(), ...floatingTilesRef.current.keys()]);
    tileIds.forEach(cleanupFloatingTile);
  }, [cleanupFloatingTile]);

  /**
   * Moves one or more tiles between tray and rail. Normal motion flies a cloned node between
   * measured positions (via a synchronous flushSync mutation so the destination can be measured
   * immediately after). Reduced motion mutates the board immediately and only ever animates
   * opacity, never position — see the plan's reduced-motion contract.
   */
  const animateTilesMove = useCallback((tileIds: string[], mutateBoard: () => void) => {
    tileIds.forEach(cleanupFloatingTile);

    if (prefersReducedMotion) {
      mutateBoard();
      setAnimatingTileIds((prev) => Array.from(new Set([...prev, ...tileIds])));
      setEnteringTileIds((prev) => Array.from(new Set([...prev, ...tileIds])));
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setEnteringTileIds((prev) => prev.filter((id) => !tileIds.includes(id)));
        });
      });
      tileIds.forEach((tileId) => {
        const timer = setTimeout(() => {
          fadeTimersRef.current.delete(tileId);
          setAnimatingTileIds((prev) => prev.filter((id) => id !== tileId));
        }, REDUCED_MOTION_FADE_MS);
        fadeTimersRef.current.set(tileId, timer);
      });
      return Promise.resolve(true);
    }

    const root = boardRootRef.current;
    if (!root) {
      mutateBoard();
      return Promise.resolve(true);
    }

    const sourceRects = new Map<string, DOMRect>();
    tileIds.forEach((tileId) => {
      const source = root.querySelector(`[data-tile-id="${tileId}"]`) as HTMLElement | null;
      if (source) sourceRects.set(tileId, source.getBoundingClientRect());
    });
    if (sourceRects.size === 0) {
      mutateBoard();
      return Promise.resolve(true);
    }

    const clones = new Map<string, HTMLElement>();
    sourceRects.forEach((_rect, tileId) => {
      const source = root.querySelector(`[data-tile-id="${tileId}"]`) as HTMLElement;
      const clone = createFloatingTile(source);
      floatingTilesRef.current.set(tileId, clone);
      clones.set(tileId, clone);
    });

    flushSync(() => {
      setAnimatingTileIds((prev) => Array.from(new Set([...prev, ...tileIds])));
      mutateBoard();
    });

    const flights: Promise<boolean>[] = [];
    clones.forEach((clone, tileId) => {
      const destination = root.querySelector(`[data-tile-id="${tileId}"]`) as HTMLElement | null;
      if (!destination) {
        cleanupFloatingTile(tileId);
        return;
      }
      flights.push(new Promise<boolean>((resolve) => flightResolversRef.current.set(tileId, resolve)));
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
          setAnimatingTileIds((prev) => prev.filter((id) => id !== tileId));
          clone.remove();
          floatingTilesRef.current.delete(tileId);
          flightResolversRef.current.get(tileId)?.(true);
          flightResolversRef.current.delete(tileId);
        },
      });
      activeTweensRef.current.set(tileId, tween);
    });
    return Promise.all(flights).then((completed) => completed.every(Boolean));
  }, [cleanupFloatingTile, prefersReducedMotion]);

  const session = useGameSession({
    maxRounds: MAX_ROUNDS,
    maxAttempts: null,
    onNextRound: () => {
      cleanupAllFloatingTiles();
      setRoundState(buildRound());
    },
    onPlayAgain: () => {
      cleanupAllFloatingTiles();
      setCompletionPraise(pickPraise(praiseEntries));
      wordQueueRef.current = [];
      setRoundState(buildRound());
    },
  });
  const {
    state,
    canAnswer,
    replaying,
    replayPrompt,
    resolveAnswer,
    continueAfterFeedback,
    playAgain,
    fail,
  } = session;

  useEffect(() => {
    if (isEmpty) {
      cleanupAllFloatingTiles();
      fail(getUiCopy(locale, 'game.error.emptyPool'));
    }
  }, [isEmpty, fail, locale, cleanupAllFloatingTiles]);

  useEffect(() => {
    setE2EState({
      gameId: 'ASSEMBLY',
      gamePhase: state.phase,
      paused: state.paused,
      wrongAttempts: state.wrongAttempts,
      roundsPlayed: state.roundsPlayed,
      totalTaps: state.totalTaps,
      replaying,
      trayTileIds: trayTiles.map((tile) => tile.id),
      placedTileIds: placedTiles.map((tile) => tile?.id ?? null),
      correctTileOrder,
    });
  }, [state, replaying, trayTiles, placedTiles, correctTileOrder]);

  // Restores DOM focus after a board mutation: the "next available tray piece" once a tile is
  // placed, or the tile itself once it returns to the tray. Set synchronously by placeTile/
  // returnTile before any await, so no effect can fire in between and see a stale ref. The
  // target stays `visibility: hidden` (normal motion) or opacity-faded (reduced motion) for the
  // whole flight/fade window tracked by `animatingTileIds`, and a hidden element can't take
  // focus — so this waits for that window to close, re-running each time it changes, before
  // actually focusing and clearing the pending ref.
  useEffect(() => {
    const pendingId = pendingFocusTileIdRef.current;
    if (!pendingId || !canAnswer || animatingTileIds.length > 0) return;
    const target = trayRegionRef.current?.querySelector<HTMLElement>(`[data-tile-id="${pendingId}"]`);
    if (!target || (target instanceof HTMLButtonElement && target.disabled)) return;
    target.focus();
    if (document.activeElement === target) pendingFocusTileIdRef.current = null;
  }, [trayTiles, placedTiles, animatingTileIds, canAnswer]);

  useGameSessionAudio({
    session, roundKey: targetWord, enabled: !isEmpty && !!targetWord,
    getPromptAudio: () => getPromptAudio(locale, targetWord!), locale, completionPraise,
  });

  // Every new round, replay, lobby exit, recoverable error, and unmount must kill any
  // in-flight GSAP tween/clone — useGameSession's own invalidate() only knows about audio and
  // timers, not GSAP, so this game must clean those up itself at each of those points.
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; cleanupAllFloatingTiles(); };
  }, [cleanupAllFloatingTiles]);

  useEffect(() => {
    if (state.paused || state.phase === 'recoverable-error') cleanupAllFloatingTiles();
  }, [state.paused, state.phase, cleanupAllFloatingTiles]);

  const handleReplay = useCallback(() => {
    if (!targetWord) return;
    cleanupAllFloatingTiles();
    void replayPrompt(getReplayAudio(locale, targetWord));
  }, [targetWord, locale, replayPrompt, cleanupAllFloatingTiles]);

  const handleExit = useCallback(() => {
    cleanupAllFloatingTiles();
    onExit();
  }, [cleanupAllFloatingTiles, onExit]);

  const retryAfterError = useCallback(() => {
    if (!isEmpty) playAgain();
  }, [isEmpty, playAgain]);

  /** Returns every currently placed tile back to the tray, animated. */
  const resetCompleteBoardToTray = useCallback((boardToReset: AssemblyBoard) => {
    const placedNow = boardToReset.placedTiles.filter((placed): placed is AssemblyTile => placed !== null);
    if (placedNow.length === 0) return;
    const resetBoard = placedNow.reduce<AssemblyBoard>(
      (acc, _placedTile, slotIndex) => returnTileToTray(acc, slotIndex),
      boardToReset,
    );
    const sortedTray = [...resetBoard.trayTiles].sort((a, b) => a.trayIndex - b.trayIndex);
    pendingFocusTileIdRef.current = sortedTray[0]?.id ?? null;
    animateTilesMove(
      placedNow.map((placedTile) => placedTile.id),
      () => setRoundState((prev) => ({ ...prev, board: resetBoard })),
    );
  }, [animateTilesMove]);

  const placeTile = useCallback(async (tile: AssemblyTile) => {
    if (!targetWord || !canAnswer) return;
    if (animatingTileIds.includes(tile.id)) return;
    if (answerLockRef.current) return;
    answerLockRef.current = true;
    try {
      const emptySlotCount = board.placedTiles.filter((slot) => slot === null).length;
      const placingLastTile = emptySlotCount === 1;
      const nextBoard = moveTileToFirstOpenSlot(board, tile.id);
      if (nextBoard === board) return;

      pendingFocusTileIdRef.current = findNextTrayFocusId(nextBoard.trayTiles, tile.trayIndex);
      const landing = animateTilesMove([tile.id], () => setRoundState((prev) => ({ ...prev, board: nextBoard })))
        .then((landed) => {
          if (!landed && mountedRef.current) setRoundState((prev) => prev.word === targetWord ? { ...prev, board } : prev);
          return landed && mountedRef.current;
        });
      const beforeOutcome = () => landing;

      const decision = getAssemblySelectionAudioDecision({
        placingLastTile,
        nextPlaced: nextBoard.placedTiles,
        correctSyllables,
      });

      if (!placingLastTile) {
        await resolveAnswer({
          answerId: tile.id,
          beforeOutcome,
          outcome: 'progress',
          countTap: false,
          selectionAudio: getItemAnnouncementAudio(locale, 'syllables', tile.text.toLowerCase(), tile.text),
        });
        return;
      }

      if (decision === 'selected-now') {
        const praise = pickPraise(praiseEntries);
        setRoundPraise(praise);
        await resolveAnswer({
          answerId: tile.id,
          beforeOutcome,
          outcome: 'correct',
          selectionAudio: getItemAnnouncementAudio(locale, 'syllables', tile.text.toLowerCase(), tile.text),
          verdictAudio: getSuccessOverlayAudioSpec(locale, praise, getSuccessSpec(locale, targetWord)),
        });
        return;
      }

      // decision === 'defer-to-wrong-sequence': the wrong-final-tile exception. Nothing plays
      // the syllable immediately — the whole [syllable, retry, word] sequence below is the
      // *only* time it's announced, standing in as this call's own selectionAudio (verdictAudio
      // never plays for a non-terminal 'wrong' outcome, and this game never has a terminal one).
      const resolution = await resolveAnswer({
        answerId: tile.id,
        beforeOutcome,
        outcome: 'wrong',
        selectionAudio: getWrongSequenceAudio(locale, targetWord, tile.text),
      });

      if (resolution === 'retry') {
        resetCompleteBoardToTray(nextBoard);
      }
    } finally {
      answerLockRef.current = false;
    }
  }, [
    animateTilesMove, animatingTileIds, board, canAnswer, correctSyllables, locale,
    praiseEntries, resetCompleteBoardToTray, resolveAnswer, targetWord,
  ]);

  const returnTile = useCallback((tile: AssemblyTile, slotIndex: number) => {
    if (!canAnswer || answerLockRef.current || animatingTileIds.includes(tile.id)) return;
    const nextBoard = returnTileToTray(board, slotIndex);
    if (nextBoard === board) return;
    pendingFocusTileIdRef.current = tile.id;
    animateTilesMove([tile.id], () => setRoundState((prev) => ({ ...prev, board: nextBoard })));
  }, [animateTilesMove, animatingTileIds, board, canAnswer]);

  const feedback: GameShellFeedback | null = state.feedback === 'success'
    ? {
        kind: 'success',
        title: roundPraise?.text ?? getUiCopy(locale, 'game.successTitle'),
        emoji: roundPraise?.emoji,
        onContinue: continueAfterFeedback,
      }
    : state.phase === 'answered-incorrectly'
    ? { kind: 'retry', title: getUiCopy(locale, 'game.retryPrompt'), detail: getUiCopy(locale, 'game.retry.detail') }
    : null;

  const completion: GameShellCompletion = {
    praise: completionPraise,
    correctRounds: state.correctRounds,
    totalTaps: state.totalTaps,
    maxRounds: state.maxRounds,
    onPlayAgain: playAgain,
    onHome: handleExit,
  };

  return (
    <div
      ref={boardRootRef}
      className="contents"
      style={{
        '--assembly-tile-size': 'clamp(3rem, min(18vw, 12vh), 8rem)',
        '--assembly-label-size': 'clamp(1rem, calc(var(--assembly-tile-size) * 0.35), 2rem)',
      } as React.CSSProperties}
    >
    <GameShell
      gameId="ASSEMBLY"
      state={state}
      onBack={handleExit}
      onRetryError={retryAfterError}
      prompt={
        <GamePrompt
          instruction={INSTRUCTION}
          visual={
            targetWord ? (
              <div
                className="flex w-full flex-col items-center gap-3 [@media(max-height:480px)]:gap-0 [@media(max-width:380px)]:gap-1"
              >
                <PictureCard emoji={targetWord.emoji} label={targetWord.word} />
                <div
                  ref={railRegionRef}
                  className="w-full"
                  onKeyDown={(event) => handleRailKeyDown(event, railRegionRef.current)}
                >
                  <WordRail label={`Slovo ${targetWord.word}`}>
                    {placedTiles.map((tile, index) => {
                      const isMoving = tile ? animatingTileIds.includes(tile.id) : false;
                      const isEntering = tile ? enteringTileIds.includes(tile.id) : false;
                      return (
                        <InsetSlot
                          key={`assembly-slot-${index}`}
                          label={tile ? `Slabika ${index + 1}: ${tile.text}` : `Slabika ${index + 1}: prázdne`}
                          state={tile ? 'filled' : 'pending'}
                          style={{ width: 'var(--assembly-tile-size)', height: 'var(--assembly-tile-size)' }}
                          className="h-[var(--assembly-tile-size)] w-[var(--assembly-tile-size)] min-h-0 min-w-0 shrink-0 grid-cols-1 grid-rows-1 p-0"
                        >
                          {tile ? (
                            <TactilePiece
                              as="button"
                              material="felt"
                              visualRole="answer"
                              className="h-full w-full min-h-0 min-w-0 p-0"
                              label={`Umiestnená slabika ${tile.text}, klepnutím vrátiš do zásobníka`}
                              data-tile-id={tile.id}
                              state={getTilePieceState(state, tile.id)}
                              disabled={!canAnswer || isMoving}
                              tabIndex={tile.id === resolvedRailActiveId ? 0 : -1}
                              onFocus={() => setRailActiveTileId(tile.id)}
                              onPress={() => returnTile(tile, index)}
                              style={{
                                width: 'var(--assembly-tile-size)',
                                height: 'var(--assembly-tile-size)',
                                ...(prefersReducedMotion
                                  ? { opacity: isEntering ? 0 : 1, transition: 'opacity 200ms ease' }
                                  : { transitionProperty: 'transform, box-shadow, opacity', ...(isMoving ? { visibility: 'hidden' as const } : {}) }),
                              }}
                            >
                              <span className="font-spline text-[length:var(--assembly-label-size)] font-black leading-none">
                                {renderTileLabel(tile.text)}
                              </span>
                            </TactilePiece>
                          ) : null}
                        </InsetSlot>
                      );
                    })}
                  </WordRail>
                </div>
              </div>
            ) : null
          }
          replaying={replaying}
          onReplay={handleReplay}
        />
      }
      feedback={feedback}
      completion={completion}
    >
      <div ref={trayRegionRef} className="flex min-h-0 flex-1 flex-col">
        <PlayTray label={getUiCopy(locale, 'game.playArea')}>
          <AnswerGroup label={ANSWER_GROUP_LABEL} disabled={!canAnswer || animatingTileIds.length > 0}>
            {traySlots.map(({ trayIndex, tile }) => {
              if (!tile) {
                return (
                  <div
                    key={`assembly-empty-${trayIndex}`}
                    data-tray-index={trayIndex}
                    data-answer-layout-placeholder="true"
                    aria-hidden="true"
                    style={{ width: 'var(--assembly-tile-size)', height: 'var(--assembly-tile-size)' }}
                    className="h-[var(--assembly-tile-size)] w-[var(--assembly-tile-size)] min-h-0 min-w-0 rounded-2xl border-2 border-dashed border-black/25 bg-white/60"
                  />
                );
              }
              const isMoving = animatingTileIds.includes(tile.id);
              const isEntering = enteringTileIds.includes(tile.id);
              return (
                <TactilePiece
                  key={tile.id}
                  as="button"
                  material="felt"
                  visualRole="answer"
                  label={`Slabika ${tile.text}`}
                  data-tile-id={tile.id}
                  data-tray-index={trayIndex}
                  state={getTilePieceState(state, tile.id)}
                  disabled={isMoving}
                  onPress={() => void placeTile(tile)}
                  style={{
                    width: 'var(--assembly-tile-size)',
                    height: 'var(--assembly-tile-size)',
                    ...(prefersReducedMotion
                      ? { opacity: isEntering ? 0 : 1, transition: 'opacity 200ms ease' }
                      : { transitionProperty: 'transform, box-shadow, opacity', ...(isMoving ? { visibility: 'hidden' as const } : {}) }),
                  }}
                  className="h-[var(--assembly-tile-size)] w-[var(--assembly-tile-size)] min-h-0 min-w-0 p-0"
                >
                  <span className="font-spline text-[length:var(--assembly-label-size)] font-black leading-none">
                    {renderTileLabel(tile.text)}
                  </span>
                </TactilePiece>
              );
            })}
          </AnswerGroup>
        </PlayTray>
      </div>
    </GameShell>
    </div>
  );
}

export function AssemblyGame({ onExit, onOpenSettings }: GameRuntimeProps) {
  const { wordItems } = useContent();
  const [gameState, setGameState] = useState<'HOME' | 'PLAYING'>('HOME');

  const eligibleWords = useMemo(
    () => wordItems.filter(({ syllables }) => {
      const syllableCount = syllables.split('-').length;
      return syllableCount >= 2 && syllableCount <= 3;
    }),
    [wordItems],
  );
  const isPlayable = eligibleWords.length > 0;

  if (gameState === 'PLAYING') {
    return <AssemblyPlayfield eligibleWords={eligibleWords} onExit={() => setGameState('HOME')} />;
  }

  return (
    <GameLobby
      gameId="ASSEMBLY"
      availabilityMessage={
        isPlayable ? undefined : 'Pridajte slová so slabikami v sekcii Obsah'
      }
      onPlay={() => setGameState('PLAYING')}
      onBack={onExit}
      onOpenSettings={onOpenSettings}
    />
  );
}
