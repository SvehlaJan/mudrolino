/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Mic, Trash2, Play, Square } from 'lucide-react';
import type { RecorderState } from '../shared/hooks/useRecorder';
import type { IconMenuAction } from '../shared/ui';
import { Button, Card, IconButton, IconMenuButton } from '../shared/ui';

export interface AudioItem {
  key: string;
  label: string;
  category: string;
}

export interface RecordingListItemProps {
  item: AudioItem;
  secondaryLabel?: string;
  menuActions?: IconMenuAction[];
  hasCustom: boolean;
  /** True when this row owns the active recorder. */
  isActive: boolean;
  disabled?: boolean;
  /** Only meaningful when isActive. */
  recorderState: RecorderState;
  /** True when recorder is active and voice has been detected. Only meaningful when isActive && recorderState === 'recording'. */
  speaking: boolean;
  /** True for ~800ms after blob is saved. Only meaningful when isActive. */
  savedFlash: boolean;
  statusLabel?: string;
  statusTone?: 'default' | 'draft' | 'ready';
  allowPlay?: boolean;
  allowDeleteRecording?: boolean;
  recordEmphasis?: boolean;
  onRecord: () => void;
  onStop: () => void;
  onCancel?: () => void;
  onPlay: () => void;
  onDelete: () => void;
}

export function RecordingListItem({
  item,
  secondaryLabel,
  menuActions,
  hasCustom,
  isActive,
  disabled = false,
  recorderState,
  speaking,
  savedFlash,
  statusLabel,
  statusTone = 'default',
  allowPlay = true,
  allowDeleteRecording = true,
  recordEmphasis = false,
  onRecord,
  onStop,
  onCancel,
  onPlay,
  onDelete,
}: RecordingListItemProps) {
  const isRequesting = isActive && recorderState === 'requesting';
  const isRecording = isActive && recorderState === 'recording';
  const isProcessing = isActive && recorderState === 'processing';
  const isSavedFlash = isActive && savedFlash;
  // "active" = any non-idle state for this row (recording, processing, or saved flash)
  const isEngaged = isRequesting || isRecording || isProcessing || isSavedFlash;

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

  const rowClass = 'flex flex-wrap items-center justify-between gap-2 transition-colors';

  let statusText: string | null = null;
  if (isRequesting) statusText = 'Čakám na povolenie mikrofónu…';
  else if (isRecording) statusText = speaking ? 'Nahrávam — počujem hlas.' : 'Nahrávam — hovorte do mikrofónu.';
  else if (isProcessing) statusText = 'Spracovávam…';
  else if (isSavedFlash) statusText = 'Uložené';

  const customStatusClass = statusTone === 'draft'
    ? 'bg-amber-100 text-amber-700'
    : statusTone === 'ready'
      ? 'bg-green-100 text-green-700'
      : 'bg-shadow/10 text-text-main/60';

  const recordClass = recordEmphasis
    ? '!bg-soft-watermelon text-text-main ring-2 ring-soft-watermelon/45'
    : '!bg-soft-watermelon/45 text-text-main';

  const labelClass = 'text-lg font-medium text-left break-words text-text-main';
  const secondaryClass = 'mt-0.5 text-xs font-bold uppercase tracking-normal text-text-muted';

  const compactActionClass = 'h-11 w-11 min-h-11 min-w-11 shrink-0';

  return (
    <Card variant="row" className={rowClass}>
      {/* Left indicator — fixed 22px slot */}
      <div className="w-[22px] flex items-center justify-center shrink-0">
        {indicator}
      </div>

      {/* Label */}
      <span className="min-w-0 flex-1 text-left">
        <span className={`block ${labelClass}`}>{item.label}</span>
        {secondaryLabel && (
          <span className={`block ${secondaryClass}`}>{secondaryLabel}</span>
        )}
      </span>

      {/* Status text — active recorder feedback live region */}
      {statusText && (
        <span role="status" aria-live="polite" className="basis-full text-sm text-text-main">
          {statusText}
        </span>
      )}

      {/* Right controls / deliberate second row on compact mobile */}
      <div className="flex w-full sm:w-auto flex-wrap items-center justify-end gap-2 shrink-0">
        {statusLabel && !isEngaged && (
          <span className={`mr-auto sm:mr-0 shrink-0 rounded-full px-2 py-1 text-[0.68rem] font-bold ${customStatusClass}`}>
            {statusLabel}
          </span>
        )}

        {isEngaged ? (
          <>
            {/* Stop button (recording only; hidden during processing/saved) */}
            <div className="w-11 flex items-center justify-center shrink-0">
              {isRecording && (
                <button
                  onClick={onStop}
                  className="min-w-11 min-h-11 rounded-full bg-action-danger flex items-center justify-center focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-focus"
                  aria-label="Zastaviť"
                >
                  <Square size={12} className="text-white fill-white" />
                </button>
              )}
            </div>
            {(isRequesting || isRecording || isProcessing) && (
              <Button tone="neutral" size="parent" onClick={onCancel}>
                Zrušiť nahrávanie
              </Button>
            )}
          </>
        ) : (
          <>
            {/* Delete — only when idle and has custom recording */}
            {hasCustom && allowDeleteRecording ? (
              <div className="w-11 flex items-center justify-center shrink-0">
                <IconButton
                  onClick={onDelete}
                  className={`${compactActionClass} !bg-shadow/20 text-text-main/70`}
                  label="Zmazať nahrávku"
                >
                  <Trash2 size={16} />
                </IconButton>
              </div>
            ) : (
              <div className="hidden sm:flex w-11 items-center justify-center shrink-0" />
            )}

            {/* Play */}
            {allowPlay ? (
              <div className="w-11 flex items-center justify-center shrink-0">
                <IconButton
                  onClick={onPlay}
                  className={`${compactActionClass} !bg-accent-blue/45 text-text-main`}
                  label="Prehrať"
                >
                  <Play size={16} />
                </IconButton>
              </div>
            ) : (
              <div className="hidden sm:flex w-11 items-center justify-center shrink-0" />
            )}

            {/* Record */}
            <div className="w-11 flex items-center justify-center shrink-0">
              <IconButton
                onClick={onRecord}
                className={`${compactActionClass} ${recordClass}`}
                label="Nahrať"
                disabled={disabled || (!isActive && ['requesting', 'recording', 'processing'].includes(recorderState))}
              >
                <Mic size={16} />
              </IconButton>
            </div>

            {menuActions && menuActions.length > 0 && (
              <div className="w-11 flex items-center justify-center shrink-0">
                <IconMenuButton
                  label="Ďalšie možnosti"
                  actions={menuActions}
                  className={`${compactActionClass} !bg-transparent !shadow-none text-text-main/70`}
                />
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
}
