/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mic, Trash2, Search, X } from 'lucide-react';
import { getLocaleContent } from '../shared/contentRegistry';
import { audioOverrideStore } from '../shared/services/audioOverrideStore';
import { useRecorder } from '../shared/hooks/useRecorder';

interface AudioItem {
  key: string;        // full locale-prefixed path, e.g. 'sk/letters/a'
  label: string;      // display text
  category: Category;
}

type Category = 'letters' | 'words' | 'syllables' | 'numbers' | 'phrases' | 'praise';

const CATEGORY_LABELS: Record<Category, string> = {
  letters:   'Písmená',
  words:     'Slová',
  syllables: 'Slabiky',
  numbers:   'Čísla',
  phrases:   'Frázy',
  praise:    'Pochvaly',
};

const CATEGORIES: Category[] = ['letters', 'words', 'syllables', 'numbers', 'phrases', 'praise'];

function buildAudioItems(locale: string): AudioItem[] {
  const content = getLocaleContent(locale);
  const items: AudioItem[] = [];

  for (const l of content.letterItems) {
    items.push({ key: `${locale}/letters/${l.audioKey}`, label: `${l.symbol} — ${l.label}`, category: 'letters' });
  }
  for (const w of content.wordItems) {
    items.push({ key: `${locale}/words/${w.audioKey}`, label: `${w.word} ${w.emoji}`, category: 'words' });
  }
  for (const s of content.syllableItems) {
    items.push({ key: `${locale}/syllables/${s.audioKey}`, label: s.symbol, category: 'syllables' });
  }
  for (const n of content.numberItems) {
    items.push({ key: `${locale}/numbers/${n.audioKey}`, label: String(n.value), category: 'numbers' });
  }
  // Phrases
  for (const [phraseKey, phrase] of Object.entries(content.audioPhrases)) {
    items.push({ key: `${locale}/phrases/${phrase.audioKey}`, label: `${phraseKey}: ${phrase.text}`, category: 'phrases' });
  }
  // Praise
  for (const p of content.praiseEntries) {
    items.push({ key: `${locale}/praise/${p.audioKey}`, label: `${p.emoji} ${p.text}`, category: 'praise' });
  }
  return items;
}

// ---------------------------------------------------------------------------
// Recording sub-screen
// ---------------------------------------------------------------------------

interface RecordingSubScreenProps {
  item: AudioItem;
  hasOverride: boolean;
  batchMode: boolean;
  onBatchToggle: () => void;
  onBack: () => void;
  /** Called after blob is saved — refreshes badge state only, does NOT advance. */
  onSaved: () => void;
  /** Called after the 1s countdown completes in batch mode — advances to next item. */
  onAdvance: () => void;
}

function RecordingSubScreen({
  item,
  hasOverride,
  batchMode,
  onBatchToggle,
  onBack,
  onSaved,
  onAdvance,
}: RecordingSubScreenProps) {
  const { state, level, speaking, start, stop, blobPromise } = useRecorder();
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = useRef(false);

  const handleDelete = async () => {
    await audioOverrideStore.delete(item.key);
    onSaved(); // refresh badge state in parent
  };

  // When processing finishes and blob is ready, save it and optionally start countdown
  useEffect(() => {
    if (!blobPromise) return;
    blobPromise.then(async (blob) => {
      await audioOverrideStore.set(item.key, blob);
      onSaved(); // refresh badge state only — does NOT advance to next item
      if (batchMode && !cancelledRef.current) {
        // Start 1s countdown; onAdvance() is called only when the countdown completes
        let t = 10; // 10 × 100ms = 1s
        setCountdown(t);
        countdownRef.current = setInterval(() => {
          t -= 1;
          setCountdown(t);
          if (t <= 0) {
            clearInterval(countdownRef.current!);
            setCountdown(null);
            if (!cancelledRef.current) onAdvance(); // advance AFTER countdown
          }
        }, 100);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blobPromise]);

  const cancelCountdown = useCallback(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setCountdown(null);
    cancelledRef.current = true;
  }, []);

  const levelPercent = Math.round(level * 100);

  return (
    <div className="flex flex-col h-full" onClick={countdown !== null ? cancelCountdown : undefined}>
      {/* Header */}
      <div className="p-6 border-b-2 border-shadow/30 bg-bg-light/50 flex items-center gap-4 shrink-0">
        <button onClick={onBack} className="w-12 h-12 bg-bg-light rounded-full flex items-center justify-center">
          <ArrowLeft size={20} />
        </button>
        <span className="text-2xl font-bold truncate">{item.label}</span>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8 p-8">
        {/* VU meter */}
        <div className="w-full max-w-xs h-6 bg-shadow/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-accent-blue rounded-full transition-all duration-75"
            style={{ width: `${levelPercent}%` }}
          />
        </div>

        {/* Record / Stop button */}
        {countdown !== null ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-24 h-24 rounded-full bg-bg-light flex items-center justify-center text-4xl font-bold">
              {(countdown / 10).toFixed(1)}s
            </div>
            <p className="text-base opacity-60">Klepni pre zrušenie</p>
          </div>
        ) : (
          <div className="relative flex items-center justify-center">
            {/* Voice-active ring — pulses when voice is detected */}
            {state === 'recording' && speaking && (
              <span className="absolute w-32 h-32 rounded-full bg-soft-watermelon/30 animate-ping" />
            )}
            <button
              onClick={state === 'idle' ? start : stop}
              disabled={state === 'processing'}
              className={`relative w-24 h-24 rounded-full flex items-center justify-center shadow-block active:translate-y-1 active:shadow-block-pressed transition-all ${
                state === 'recording'
                  ? 'bg-soft-watermelon'
                  : state === 'processing'
                  ? 'bg-shadow/20'
                  : 'bg-accent-blue'
              }`}
            >
              {state === 'recording' ? (
                <span className="w-8 h-8 bg-white rounded-sm" />
              ) : state === 'processing' ? (
                <span className="text-2xl animate-spin">⏳</span>
              ) : (
                <Mic size={36} className="text-white" />
              )}
            </button>
          </div>
        )}

        <p className="text-lg opacity-60 font-medium">
          {state === 'idle' && countdown === null && 'Klepni pre nahrávanie'}
          {state === 'recording' && !speaking && 'Hovor…'}
          {state === 'recording' && speaking && 'Počúvam…'}
          {state === 'processing' && 'Spracovávam…'}
        </p>

        {/* Batch toggle */}
        <div className="flex items-center gap-3">
          <span className="text-lg font-medium opacity-70">Auto-pokračovať</span>
          <button
            onClick={onBatchToggle}
            className={`w-14 h-8 rounded-full transition-colors ${batchMode ? 'bg-accent-blue' : 'bg-shadow/20'}`}
          >
            <span
              className={`block w-6 h-6 rounded-full bg-white shadow transition-transform mx-1 ${batchMode ? 'translate-x-6' : ''}`}
            />
          </button>
        </div>

        {/* Delete button — only if override exists */}
        {hasOverride && (
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 text-soft-watermelon font-semibold text-lg py-3 px-6 rounded-2xl border-2 border-soft-watermelon/40 active:bg-soft-watermelon/10"
          >
            <Trash2 size={20} />
            Zmazať nahrávku
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// List view
// ---------------------------------------------------------------------------

interface AudioRecordingScreenProps {
  locale: string;
}

export function AudioRecordingScreen({ locale }: AudioRecordingScreenProps) {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<Category>('letters');
  const [search, setSearch] = useState('');
  const [overrideKeys, setOverrideKeys] = useState<Set<string>>(new Set());
  const [selectedItem, setSelectedItem] = useState<AudioItem | null>(null);
  const [batchMode, setBatchMode] = useState(false);
  const allItems = buildAudioItems(locale);

  const refreshOverrides = useCallback(async () => {
    const keys = await audioOverrideStore.listKeys();
    setOverrideKeys(new Set(keys));
  }, []);

  useEffect(() => {
    void (async () => {
      const keys = await audioOverrideStore.listKeys();
      setOverrideKeys(new Set(keys));
    })();
  }, []);

  const filteredItems = search.trim()
    ? allItems.filter((item) =>
        item.label.toLowerCase().includes(search.toLowerCase()) ||
        item.key.toLowerCase().includes(search.toLowerCase()),
      )
    : allItems.filter((item) => item.category === activeCategory);

  // Refreshes badge state only — called immediately after each recording is saved.
  const handleSaved = useCallback(() => {
    refreshOverrides();
  }, [refreshOverrides]);

  // Advances to the next item in the current list — called by RecordingSubScreen
  // after the 1s countdown completes in batch mode.
  const handleAdvance = useCallback(() => {
    if (!selectedItem) return;
    const idx = filteredItems.findIndex((i) => i.key === selectedItem.key);
    if (idx >= 0 && idx < filteredItems.length - 1) {
      setSelectedItem(filteredItems[idx + 1]);
    } else {
      setSelectedItem(null); // Reached end of list
    }
  }, [filteredItems, selectedItem]);

  if (selectedItem) {
    return (
      <div className="fixed inset-0 z-50 bg-bg-light flex flex-col">
        <RecordingSubScreen
          item={selectedItem}
          hasOverride={overrideKeys.has(selectedItem.key)}
          batchMode={batchMode}
          onBatchToggle={() => setBatchMode((b) => !b)}
          onBack={() => setSelectedItem(null)}
          onSaved={handleSaved}
          onAdvance={handleAdvance}
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-bg-light flex flex-col">
      {/* Header */}
      <div className="p-6 border-b-2 border-shadow/30 bg-bg-light/50 shrink-0">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-3xl font-bold">Vlastné nahrávky</h2>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Hľadať…"
            className="w-full pl-11 pr-10 py-3 bg-white rounded-2xl border-2 border-shadow/10 text-lg font-medium focus:outline-none focus:border-accent-blue/50"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 opacity-40"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Category tabs — hidden when searching */}
        {!search && (
          <div className="flex gap-2 mt-4 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-full text-base font-semibold whitespace-nowrap transition-all ${
                  activeCategory === cat
                    ? 'bg-accent-blue text-white'
                    : 'bg-white text-text-main opacity-60'
                }`}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Item list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filteredItems.length === 0 && (
          <p className="text-center text-lg opacity-40 mt-8">Žiadne položky</p>
        )}
        {filteredItems.map((item) => (
          <button
            key={item.key}
            onClick={() => setSelectedItem(item)}
            className="w-full flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm active:bg-bg-light transition-colors"
          >
            <span className="text-xl font-medium">{item.label}</span>
            {overrideKeys.has(item.key) && (
              <Mic size={18} className="text-accent-blue shrink-0" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
