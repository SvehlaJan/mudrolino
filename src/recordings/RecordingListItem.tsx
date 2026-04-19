/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Mic, Trash2, Play, Square } from 'lucide-react';
import type { RecorderState } from '../shared/hooks/useRecorder';

export interface AudioItem {
  key: string;
  label: string;
  category: string;
}

export interface RecordingListItemProps {
  item: AudioItem;
  hasCustom: boolean;
  /** True when this row owns the active recorder. */
  isActive: boolean;
  /** Only meaningful when isActive. */
  recorderState: RecorderState;
  /** True when recorder is active and voice has been detected. Only meaningful when isActive && recorderState === 'recording'. */
  speaking: boolean;
  /** True for ~800ms after blob is saved. Only meaningful when isActive. */
  savedFlash: boolean;
  onRecord: () => void;
  onStop: () => void;
  onPlay: () => void;
  onDelete: () => void;
}

export function RecordingListItem({
  item,
  hasCustom,
  isActive,
  recorderState,
  speaking,
  savedFlash,
  onRecord,
  onStop,
  onPlay,
  onDelete,
}: RecordingListItemProps) {
  const isRecording = isActive && recorderState === 'recording';
  const isProcessing = isActive && recorderState === 'processing';
  const isSavedFlash = isActive && savedFlash;
  // "active" = any non-idle state for this row (recording, processing, or saved flash)
  const isEngaged = isRecording || isProcessing || isSavedFlash;

  // ── Left indicator ────────────────────────────────────────────────────────
  let indicator: React.ReactNode;
  if (isSavedFlash) {
    indicator = <span className="text-green-500 text-sm">✓</span>;
  } else if (isProcessing) {
    indicator = <span className="text-amber-400 text-sm animate-spin inline-block">⏳</span>;
  } else if (isRecording) {
    indicator = <span className="text-red-400 text-sm">🔴</span>;
  } else if (hasCustom) {
    indicator = <Mic size={14} className="text-accent-blue" />;
  } else {
    indicator = <span className="w-3 h-3 rounded-full border-2 border-shadow/20 inline-block" />;
  }

  // ── Row background / border ───────────────────────────────────────────────
  let rowClass = 'flex items-center gap-2 px-4 py-3 rounded-2xl transition-colors ';
  if (isSavedFlash) {
    rowClass += 'bg-green-950/40 border-2 border-green-600/50';
  } else if (isProcessing) {
    rowClass += 'bg-amber-950/30 border-2 border-amber-500/40';
  } else if (isRecording && speaking) {
    rowClass += 'bg-pink-950/30 border-2 border-pink-500/50';
  } else if (isRecording) {
    rowClass += 'bg-blue-950/30 border-2 border-accent-blue/50';
  } else {
    rowClass += 'bg-white border-2 border-transparent';
  }

  // ── Status text ───────────────────────────────────────────────────────────
  let statusText: string | null = null;
  if (isRecording && !speaking) statusText = 'Čakám…';
  else if (isRecording && speaking) statusText = 'Počujem…';
  else if (isProcessing) statusText = 'Spracovávam…';
  else if (isSavedFlash) statusText = 'Uložené';

  // ── Label colour ──────────────────────────────────────────────────────────
  let labelClass = 'text-lg font-medium flex-1 text-left truncate text-text-main ';
  if (isSavedFlash) labelClass += 'text-green-300';
  else if (isProcessing) labelClass += 'text-amber-300';
  else if (isRecording) labelClass += speaking ? 'text-pink-200' : 'text-blue-200';

  const idleActionClass =
    'w-9 h-9 shrink-0 rounded-full flex items-center justify-center shadow-sm active:opacity-60';
  const deleteActionClass = `${idleActionClass} bg-shadow/20 text-text-main/70`;
  const playActionClass = `${idleActionClass} bg-accent-blue/45 text-text-main`;
  const recordActionClass = `${idleActionClass} bg-soft-watermelon/45 text-text-main`;

  return (
    <div className={rowClass}>
      {/* Left indicator — fixed 22px slot */}
      <div className="w-[22px] flex items-center justify-center shrink-0">
        {indicator}
      </div>

      {/* Label */}
      <span className={labelClass}>{item.label}</span>

      {/* Status text — flush against right buttons */}
      {statusText && (
        <span className="text-xs italic opacity-80 shrink-0 mr-1">{statusText}</span>
      )}

      {/* Right buttons — each slot is sized to the circular button */}
      {isEngaged ? (
        <>
          {/* Stop button (recording only; hidden during processing/saved) */}
          <div className="w-9 flex items-center justify-center shrink-0">
            {isRecording && (
              <button
                onClick={onStop}
                className="w-7 h-7 rounded-full bg-red-500 flex items-center justify-center active:opacity-70"
                aria-label="Zastaviť"
              >
                <Square size={12} className="text-white fill-white" />
              </button>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Delete — only when idle and has custom recording */}
          <div className="w-9 flex items-center justify-center shrink-0">
            {hasCustom && (
              <button
                onClick={onDelete}
                className={deleteActionClass}
                aria-label="Zmazať nahrávku"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>

          {/* Play */}
          <div className="w-9 flex items-center justify-center shrink-0">
            <button
              onClick={onPlay}
              className={playActionClass}
              aria-label="Prehrať"
            >
              <Play size={16} />
            </button>
          </div>

          {/* Record */}
          <div className="w-9 flex items-center justify-center shrink-0">
            <button
              onClick={onRecord}
              className={recordActionClass}
              aria-label="Nahrať"
            >
              <Mic size={16} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
