/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, Plus, RotateCcw } from 'lucide-react';
import { Button, SearchInput } from '../shared/ui';
import type { IconMenuAction } from '../shared/ui';
import { RecordingListItem } from '../recordings/RecordingListItem';
import type { AudioItem } from '../recordings/RecordingListItem';
import { audioManager } from '../shared/services/audioManager';
import { audioOverrideStore } from '../shared/services/audioOverrideStore';
import { useRecorder } from '../shared/hooks/useRecorder';
import { normalizeComparableText } from './customContentValidation';

const SAVED_FLASH_MS = 800;

export interface ContentRow {
  id: string;
  storeKey: string;
  label: string;
  secondaryLabel?: string;
  statusLabel?: string;
  statusTone?: 'default' | 'draft' | 'ready';
  allowPlay?: boolean;
  recordEmphasis?: boolean;
  menuActions?: IconMenuAction[];
  /** Free text matched against the search query; normally the label plus any secondary label. */
  searchText: string;
}

export interface ContentItemListProps {
  rows: ContentRow[];
  disabledRows?: ContentRow[];
  onRestoreOne?: (row: ContentRow) => void;
  onRestoreAll?: () => void;
  restoreAllLabel?: string;
  onAfterRecordSaved?: (row: ContentRow) => void | Promise<void>;
  onAfterDeleteAudio?: (row: ContentRow) => void | Promise<void>;
  addAction?: { label: string; onClick: () => void };
  searchLabel: string;
  emptyMessage: string;
  /** A persistent, proactive explanation — e.g. the last-playable-item guard — shown above the list regardless of any action. */
  noticeMessage?: string | null;
}

export function ContentItemList({
  rows,
  disabledRows = [],
  onRestoreOne,
  onRestoreAll,
  restoreAllLabel = 'Obnoviť všetko',
  onAfterRecordSaved,
  onAfterDeleteAudio,
  addAction,
  searchLabel,
  emptyMessage,
  noticeMessage,
}: ContentItemListProps) {
  const recorder = useRecorder();
  const [overrideKeys, setOverrideKeys] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [query, setQuery] = useState('');
  const [disabledOpen, setDisabledOpen] = useState(false);
  const savedFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeIdRef = useRef(activeId);
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);
  const discardRef = useRef(false);
  const disabledSectionId = useId();

  const rowsKey = rows.map(row => row.storeKey).join('|');
  const disabledRowsKey = disabledRows.map(row => row.storeKey).join('|');

  useEffect(() => {
    audioOverrideStore.listKeys().then(keys => setOverrideKeys(new Set(keys)));
  }, [rowsKey, disabledRowsKey]);

  const findRow = useCallback(
    (id: string) => rows.find(row => row.id === id) ?? disabledRows.find(row => row.id === id) ?? null,
    [rows, disabledRows],
  );

  useEffect(() => {
    if (!recorder.blobPromise) return;
    recorder.blobPromise.then(async blob => {
      if (discardRef.current) { discardRef.current = false; return; }
      const id = activeIdRef.current;
      if (!id) return;
      const row = findRow(id);
      if (!row) return;
      await audioOverrideStore.set(row.storeKey, blob);
      await onAfterRecordSaved?.(row);
      const keys = await audioOverrideStore.listKeys();
      setOverrideKeys(new Set(keys));
      setSavedFlash(true);
      savedFlashTimerRef.current = setTimeout(() => {
        setSavedFlash(false);
        setActiveId(null);
      }, SAVED_FLASH_MS);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recorder.blobPromise]);

  useEffect(() => () => {
    if (savedFlashTimerRef.current) clearTimeout(savedFlashTimerRef.current);
  }, []);

  const handleRecord = useCallback((id: string) => {
    if (activeId !== null && recorder.state !== 'idle') return;
    discardRef.current = false;
    audioManager.stop();
    setActiveId(id);
    setSavedFlash(false);
    void recorder.start();
  }, [activeId, recorder]);

  const handleStop = useCallback(() => {
    discardRef.current = true;
    if (savedFlashTimerRef.current) clearTimeout(savedFlashTimerRef.current);
    setActiveId(null);
    setSavedFlash(false);
    recorder.stop();
  }, [recorder]);

  const handleDeleteAudio = useCallback(async (row: ContentRow) => {
    await audioOverrideStore.delete(row.storeKey);
    await onAfterDeleteAudio?.(row);
    const keys = await audioOverrideStore.listKeys();
    setOverrideKeys(new Set(keys));
  }, [onAfterDeleteAudio]);

  const normalizedQuery = normalizeComparableText(query);
  const matches = useCallback(
    (row: ContentRow) => normalizedQuery.length === 0 || normalizeComparableText(row.searchText).includes(normalizedQuery),
    [normalizedQuery],
  );
  const visibleRows = rows.filter(matches);
  const visibleDisabledRows = disabledRows.filter(matches);
  const searchedWithNoResults = normalizedQuery.length > 0 && visibleRows.length === 0 && rows.length > 0;

  return (
    <div className="space-y-3">
      <SearchInput
        aria-label={searchLabel}
        placeholder={searchLabel}
        value={query}
        onChange={event => setQuery(event.target.value)}
        onClear={() => setQuery('')}
      />

      {addAction && (
        <Button tone="primary" size="parent" fullWidth onClick={addAction.onClick} icon={<Plus size={18} aria-hidden="true" />}>
          {addAction.label}
        </Button>
      )}

      {noticeMessage && (
        <p role="status" className="rounded-2xl bg-selected-surface px-4 py-3 text-sm font-bold text-text-main">
          {noticeMessage}
        </p>
      )}

      {searchedWithNoResults && (
        <p className="px-1 text-sm font-medium text-text-muted">Nič sa nenašlo pre „{query}“.</p>
      )}
      {rows.length === 0 && disabledRows.length === 0 && (
        <p className="px-1 text-sm font-medium text-text-muted">{emptyMessage}</p>
      )}

      {visibleRows.map(row => {
        const item: AudioItem = { key: row.storeKey, label: row.label, category: 'content' };
        return (
          <RecordingListItem
            key={row.id}
            item={item}
            secondaryLabel={row.secondaryLabel}
            menuActions={row.menuActions}
            hasCustom={overrideKeys.has(row.storeKey)}
            isActive={row.id === activeId}
            recorderState={recorder.state}
            speaking={recorder.speaking}
            savedFlash={row.id === activeId && savedFlash}
            statusLabel={row.statusLabel}
            statusTone={row.statusTone}
            allowPlay={row.allowPlay ?? true}
            recordEmphasis={row.recordEmphasis}
            onRecord={() => handleRecord(row.id)}
            onStop={handleStop}
            onPlay={() => audioManager.play({ clips: [{ path: row.storeKey, fallbackText: row.label }] })}
            onDelete={() => void handleDeleteAudio(row)}
          />
        );
      })}

      {disabledRows.length > 0 && (
        <div className="rounded-2xl border-2 border-border-subtle bg-bg-light/40">
          <div className="flex items-center justify-between gap-2 px-3 py-2">
            <button
              type="button"
              aria-expanded={disabledOpen}
              aria-controls={disabledSectionId}
              onClick={() => setDisabledOpen(open => !open)}
              className="flex min-h-11 flex-1 items-center gap-2 rounded-xl px-2 text-left text-sm font-bold text-text-muted focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-focus"
            >
              <ChevronDown
                size={18}
                aria-hidden="true"
                className={disabledOpen ? 'rotate-180 transition-transform' : 'transition-transform'}
              />
              {`Vypnuté (${disabledRows.length})`}
            </button>
            {disabledRows.length > 1 && onRestoreAll && (
              <Button tone="quiet" size="parent" density="compact" onClick={onRestoreAll}>
                {restoreAllLabel}
              </Button>
            )}
          </div>
          {disabledOpen && (
            <div id={disabledSectionId} className="space-y-2 px-3 pb-3">
              {visibleDisabledRows.length === 0 && (
                <p className="px-1 text-sm font-medium text-text-muted">Nič sa nenašlo.</p>
              )}
              {visibleDisabledRows.map(row => (
                <div
                  key={row.id}
                  className="flex items-center gap-3 rounded-2xl border-2 border-transparent bg-white/70 px-4 py-3"
                >
                  <span className="min-w-0 flex-1 truncate text-base font-medium text-text-muted">
                    {row.label}
                    {row.secondaryLabel && (
                      <span className="ml-2 text-xs font-bold uppercase tracking-normal text-text-muted/80">
                        {row.secondaryLabel}
                      </span>
                    )}
                  </span>
                  <Button
                    tone="neutral"
                    size="parent"
                    density="compact"
                    onClick={() => onRestoreOne?.(row)}
                    icon={<RotateCcw size={16} aria-hidden="true" />}
                  >
                    Obnoviť
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
