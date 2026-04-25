/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLocaleContent } from '../shared/contentRegistry';
import { audioOverrideStore } from '../shared/services/audioOverrideStore';
import { audioManager } from '../shared/services/audioManager';
import { useRecorder } from '../shared/hooks/useRecorder';
import { RecordingListItem } from './RecordingListItem';
import type { AudioItem } from './RecordingListItem';
import { AppScreen, BackButton, ChoiceTile, SearchInput, ToggleControl, TopBar } from '../shared/ui';

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
  const activeKeyRef = useRef(activeKey);
  useEffect(() => { activeKeyRef.current = activeKey; }, [activeKey]);
  const recorderStartRef = useRef(recorder.start);
  useEffect(() => { recorderStartRef.current = recorder.start; }, [recorder.start]);
  const discardRef = useRef(false);

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
      if (discardRef.current) {
        discardRef.current = false;
        return;
      }
      if (!activeKeyRef.current) return;
      await audioOverrideStore.set(activeKeyRef.current, blob);
      await refreshOverrides();

      setSavedFlash(true);
      savedFlashTimerRef.current = setTimeout(() => {
        setSavedFlash(false);
        if (autoProgressRef.current) {
          const list = filteredAtStartRef.current;
          const idx = list.findIndex((i) => i.key === activeKeyRef.current);
          const next = idx >= 0 && idx < list.length - 1 ? list[idx + 1] : null;
          if (next) {
            setActiveKey(next.key);
            void audioManager.stop();
            void recorderStartRef.current();
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
      discardRef.current = false;
      audioManager.stop();
      setActiveKey(key);
      setSavedFlash(false);
      filteredAtStartRef.current = filteredItems;
      void recorder.start();
    },
    [activeKey, recorder, filteredItems],
  );

  const handleStop = useCallback(() => {
    discardRef.current = true;
    if (savedFlashTimerRef.current) clearTimeout(savedFlashTimerRef.current);
    setActiveKey(null);
    setSavedFlash(false);
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
    <AppScreen maxWidth="narrow">
      <TopBar left={<BackButton onClick={() => navigate(-1)} />} />

      <div className="mb-2 shrink-0 border-b-2 border-shadow/30 pb-4">
        <div className="mb-4 flex items-center gap-4">
          <h2 className="flex-1 text-3xl font-bold">Vlastné nahrávky</h2>

          <ToggleControl
            label="Auto"
            checked={autoProgress}
            onToggle={() => setAutoProgress((value) => !value)}
            iconBackgroundClassName="bg-accent-blue/35"
            activeColorClassName="bg-accent-blue"
            className="shrink-0"
          />
        </div>

        <SearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClear={() => setSearch('')}
          placeholder="Hľadať…"
        />

        {!search && (
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <ChoiceTile
                key={cat}
                shape="pill"
                state={activeCategory === cat ? 'selected' : 'neutral'}
                className="whitespace-nowrap text-base font-semibold"
                onClick={() => setActiveCategory(cat)}
              >
                {CATEGORY_LABELS[cat]}
              </ChoiceTile>
            ))}
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto py-2">
        {filteredItems.length === 0 && (
          <p className="mt-8 text-center text-lg opacity-40">Žiadne položky</p>
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
    </AppScreen>
  );
}
