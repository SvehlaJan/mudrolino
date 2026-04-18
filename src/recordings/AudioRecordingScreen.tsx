/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, X } from 'lucide-react';
import { getLocaleContent } from '../shared/contentRegistry';
import { audioOverrideStore } from '../shared/services/audioOverrideStore';
import { audioManager } from '../shared/services/audioManager';
import { useRecorder } from '../shared/hooks/useRecorder';
import { RecordingListItem } from './RecordingListItem';
import type { AudioItem } from './RecordingListItem';

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
    items.push({
      key: `${locale}/letters/${l.audioKey}`,
      label: l.label ? `${l.symbol} — ${l.label} ${l.emoji}` : `${l.symbol} ${l.emoji}`,
      category: 'letters',
    });
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
  for (const [phraseKey, phrase] of Object.entries(content.audioPhrases)) {
    items.push({ key: `${locale}/phrases/${phrase.audioKey}`, label: `${phraseKey}: ${phrase.text}`, category: 'phrases' });
  }
  for (const p of content.praiseEntries) {
    items.push({ key: `${locale}/praise/${p.audioKey}`, label: `${p.emoji} ${p.text}`, category: 'praise' });
  }
  return items;
}

interface AudioRecordingScreenProps {
  locale: string;
}

const SAVED_FLASH_MS = 800;

export function AudioRecordingScreen({ locale }: AudioRecordingScreenProps) {
  const navigate = useNavigate();
  const recorder = useRecorder();

  const [activeCategory, setActiveCategory] = useState<Category>('letters');
  const [search, setSearch] = useState('');
  const [overrideKeys, setOverrideKeys] = useState<Set<string>>(new Set());
  const [autoProgress, setAutoProgress] = useState(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  const savedFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const filteredAtStartRef = useRef<AudioItem[]>([]);
  const autoProgressRef = useRef(autoProgress);
  useEffect(() => { autoProgressRef.current = autoProgress; }, [autoProgress]);

  const allItems = buildAudioItems(locale);

  const filteredItems: AudioItem[] = search.trim()
    ? allItems.filter(
        (item) =>
          item.label.toLowerCase().includes(search.toLowerCase()) ||
          item.key.toLowerCase().includes(search.toLowerCase()),
      )
    : allItems.filter((item) => item.category === activeCategory);

  const refreshOverrides = useCallback(async () => {
    const keys = await audioOverrideStore.listKeys();
    setOverrideKeys(new Set(keys));
  }, []);

  useEffect(() => {
    void refreshOverrides();
  }, [refreshOverrides]);

  useEffect(() => {
    if (!recorder.blobPromise) return;
    recorder.blobPromise.then(async (blob) => {
      if (!activeKey) return;
      await audioOverrideStore.set(activeKey, blob);
      await refreshOverrides();

      setSavedFlash(true);
      savedFlashTimerRef.current = setTimeout(() => {
        setSavedFlash(false);
        if (autoProgressRef.current) {
          const list = filteredAtStartRef.current;
          const idx = list.findIndex((i) => i.key === activeKey);
          const next = idx >= 0 && idx < list.length - 1 ? list[idx + 1] : null;
          if (next) {
            setActiveKey(next.key);
            void audioManager.stop();
            void recorder.start();
            filteredAtStartRef.current = list;
          } else {
            setActiveKey(null);
          }
        } else {
          setActiveKey(null);
        }
      }, SAVED_FLASH_MS);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recorder.blobPromise]);

  useEffect(() => () => {
    if (savedFlashTimerRef.current) clearTimeout(savedFlashTimerRef.current);
  }, []);

  const handleRecord = useCallback(
    (key: string) => {
      if (activeKey !== null && recorder.state !== 'idle') return;
      audioManager.stop();
      setActiveKey(key);
      setSavedFlash(false);
      filteredAtStartRef.current = filteredItems;
      void recorder.start();
    },
    [activeKey, recorder, filteredItems],
  );

  const handleStop = useCallback(() => {
    recorder.stop();
  }, [recorder]);

  const handlePlay = useCallback(
    (item: AudioItem) => {
      void audioManager.play({ clips: [{ path: item.key, fallbackText: item.label }] });
    },
    [],
  );

  const handleDelete = useCallback(
    async (key: string) => {
      await audioOverrideStore.delete(key);
      await refreshOverrides();
    },
    [refreshOverrides],
  );

  return (
    <div className="fixed inset-0 z-50 bg-bg-light flex flex-col">
      <div className="p-6 border-b-2 border-shadow/30 bg-bg-light/50 shrink-0">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-3xl font-bold flex-1">Vlastné nahrávky</h2>

          <span className="text-base font-medium opacity-60 shrink-0">Auto</span>
          <button
            onClick={() => setAutoProgress((v) => !v)}
            className={`w-14 h-8 rounded-full transition-colors shrink-0 ${
              autoProgress ? 'bg-accent-blue' : 'bg-shadow/20'
            }`}
            aria-label="Auto-pokračovať"
          >
            <span
              className={`block w-6 h-6 rounded-full bg-white shadow transition-transform mx-1 ${
                autoProgress ? 'translate-x-6' : ''
              }`}
            />
          </button>
        </div>

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

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filteredItems.length === 0 && (
          <p className="text-center text-lg opacity-40 mt-8">Žiadne položky</p>
        )}
        {filteredItems.map((item) => (
          <RecordingListItem
            key={item.key}
            item={item}
            hasCustom={overrideKeys.has(item.key)}
            isActive={item.key === activeKey}
            recorderState={recorder.state}
            speaking={recorder.speaking}
            savedFlash={item.key === activeKey && savedFlash}
            onRecord={() => handleRecord(item.key)}
            onStop={handleStop}
            onPlay={() => handlePlay(item)}
            onDelete={() => void handleDelete(item.key)}
          />
        ))}
      </div>
    </div>
  );
}
