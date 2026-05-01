/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { useContent } from '../shared/contexts/ContentContext';
import { getLocaleContent } from '../shared/contentRegistry';
import { audioOverrideStore } from '../shared/services/audioOverrideStore';
import { audioManager } from '../shared/services/audioManager';
import { useRecorder } from '../shared/hooks/useRecorder';
import { RecordingListItem } from '../recordings/RecordingListItem';
import type { AudioItem } from '../recordings/RecordingListItem';
import { AppScreen, BackButton, TopBar } from '../shared/ui';
import type { UserWord, UserPraise } from '../shared/types';

type Section = 'letters' | 'numbers' | 'phrases' | 'words' | 'praise';

const SECTION_LABELS: Record<Section, string> = {
  letters: 'Písmená',
  numbers: 'Čísla',
  phrases: 'Frázy',
  words: 'Slová',
  praise: 'Pochvaly',
};

const SECTIONS: Section[] = ['letters', 'numbers', 'phrases', 'words', 'praise'];
const SAVED_FLASH_MS = 800;

function buildSystemItems(locale: string, section: 'letters' | 'numbers' | 'phrases'): AudioItem[] {
  const content = getLocaleContent(locale);
  if (section === 'letters') {
    return content.letterItems.map((l) => ({
      key: `${locale}/letters/${l.audioKey}`,
      label: l.label ? `${l.symbol} — ${l.label} ${l.emoji}` : `${l.symbol} ${l.emoji}`,
      category: 'letters',
    }));
  }
  if (section === 'numbers') {
    return content.numberItems.map((n) => ({
      key: `${locale}/numbers/${n.audioKey}`,
      label: String(n.value),
      category: 'numbers',
    }));
  }
  return Object.entries(content.audioPhrases).map(([phraseKey, phrase]) => ({
    key: `${locale}/phrases/${phrase.audioKey}`,
    label: `${phraseKey}: ${phrase.text}`,
    category: 'phrases',
  }));
}

// ── System audio section (letters / numbers / phrases) ─────────────────────────

interface SystemAudioSectionProps {
  items: AudioItem[];
}

function SystemAudioSection({ items }: SystemAudioSectionProps) {
  const recorder = useRecorder();
  const [overrideKeys, setOverrideKeys] = useState<Set<string>>(new Set());
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const savedFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeKeyRef = useRef(activeKey);
  useEffect(() => { activeKeyRef.current = activeKey; }, [activeKey]);
  const discardRef = useRef(false);

  useEffect(() => {
    audioOverrideStore.listKeys().then((keys) => setOverrideKeys(new Set(keys)));
  }, []);

  useEffect(() => {
    if (!recorder.blobPromise) return;
    recorder.blobPromise.then(async (blob) => {
      if (discardRef.current) { discardRef.current = false; return; }
      if (!activeKeyRef.current) return;
      await audioOverrideStore.set(activeKeyRef.current, blob);
      const keys = await audioOverrideStore.listKeys();
      setOverrideKeys(new Set(keys));
      setSavedFlash(true);
      savedFlashTimerRef.current = setTimeout(() => {
        setSavedFlash(false);
        setActiveKey(null);
      }, SAVED_FLASH_MS);
    });
  }, [recorder.blobPromise]);

  useEffect(() => () => {
    if (savedFlashTimerRef.current) clearTimeout(savedFlashTimerRef.current);
  }, []);

  const handleRecord = useCallback((key: string) => {
    if (activeKey !== null && recorder.state !== 'idle') return;
    discardRef.current = false;
    audioManager.stop();
    setActiveKey(key);
    setSavedFlash(false);
    void recorder.start();
  }, [activeKey, recorder]);

  const handleStop = useCallback(() => {
    discardRef.current = true;
    if (savedFlashTimerRef.current) clearTimeout(savedFlashTimerRef.current);
    setActiveKey(null);
    setSavedFlash(false);
    recorder.stop();
  }, [recorder]);

  const handleDelete = useCallback(async (key: string) => {
    await audioOverrideStore.delete(key);
    const keys = await audioOverrideStore.listKeys();
    setOverrideKeys(new Set(keys));
  }, []);

  return (
    <div className="space-y-2">
      {items.map((item) => (
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
          onPlay={() => audioManager.play({ clips: [{ path: item.key, fallbackText: item.label }] })}
          onDelete={() => void handleDelete(item.key)}
        />
      ))}
    </div>
  );
}

// ── Editable word list ─────────────────────────────────────────────────────────

interface EditableWordListProps {
  locale: string;
}

function EditableWordList({ locale }: EditableWordListProps) {
  const { allUserWords, addWord, updateWord, deleteWord } = useContent();
  const recorder = useRecorder();
  const [overrideKeys, setOverrideKeys] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const savedFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeIdRef = useRef(activeId);
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);
  const discardRef = useRef(false);

  const [showAddForm, setShowAddForm] = useState(false);
  const [formWord, setFormWord] = useState('');
  const [formSyllables, setFormSyllables] = useState('');
  const [formEmoji, setFormEmoji] = useState('');

  useEffect(() => {
    audioOverrideStore.listKeys().then((keys) => setOverrideKeys(new Set(keys)));
  }, [allUserWords]);

  const getAudioKey = useCallback((id: string) => {
    return allUserWords.find((w) => w.id === id)?.audioKey ?? null;
  }, [allUserWords]);

  useEffect(() => {
    if (!recorder.blobPromise) return;
    recorder.blobPromise.then(async (blob) => {
      if (discardRef.current) { discardRef.current = false; return; }
      const id = activeIdRef.current;
      if (!id) return;
      const audioKey = getAudioKey(id);
      if (!audioKey) return;
      const storeKey = `${locale}/words/${audioKey}`;
      await audioOverrideStore.set(storeKey, blob);
      await updateWord(id, { status: 'ready' });
      const keys = await audioOverrideStore.listKeys();
      setOverrideKeys(new Set(keys));
      setSavedFlash(true);
      savedFlashTimerRef.current = setTimeout(() => {
        setSavedFlash(false);
        setActiveId(null);
      }, SAVED_FLASH_MS);
    });
  }, [recorder.blobPromise]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleDeleteAudio = useCallback(async (word: UserWord) => {
    await audioOverrideStore.delete(`${locale}/words/${word.audioKey}`);
    await updateWord(word.id, { status: 'draft' });
    const keys = await audioOverrideStore.listKeys();
    setOverrideKeys(new Set(keys));
  }, [locale, updateWord]);

  const handleAddWord = useCallback(async () => {
    if (!formWord.trim() || !formSyllables.trim() || !formEmoji.trim()) return;
    const id = crypto.randomUUID();
    await addWord({
      word: formWord.trim(),
      syllables: formSyllables.trim().toLowerCase(),
      emoji: formEmoji.trim(),
      audioKey: `custom-${id}`,
      isDefault: false,
    });
    setFormWord('');
    setFormSyllables('');
    setFormEmoji('');
    setShowAddForm(false);
  }, [addWord, formWord, formSyllables, formEmoji]);

  return (
    <div className="space-y-3">
      {allUserWords.map((word) => {
        const storeKey = `${locale}/words/${word.audioKey}`;
        const item: AudioItem = {
          key: storeKey,
          label: `${word.word} ${word.emoji}${word.status === 'draft' ? ' ·' : ''}`,
          category: 'words',
        };
        return (
          <RecordingListItem
            key={word.id}
            item={item}
            secondaryLabel={word.syllables.toUpperCase()}
            menuActions={[
              {
                label: 'Zmazať slovo',
                icon: <Trash2 size={16} />,
                tone: 'danger',
                onSelect: () => void deleteWord(word.id),
              },
            ]}
            hasCustom={overrideKeys.has(storeKey)}
            isActive={word.id === activeId}
            recorderState={recorder.state}
            speaking={recorder.speaking}
            savedFlash={word.id === activeId && savedFlash}
            onRecord={() => handleRecord(word.id)}
            onStop={handleStop}
            onPlay={() => audioManager.play({ clips: [{ path: storeKey, fallbackText: word.word }] })}
            onDelete={() => void handleDeleteAudio(word)}
          />
        );
      })}

      {showAddForm ? (
        <div className="rounded-2xl border-2 border-shadow/20 bg-white p-4 space-y-3">
          <input
            className="w-full rounded-xl border border-shadow/20 bg-bg-light px-4 py-2 text-lg font-medium outline-none"
            placeholder="Slovo (napr. Jahoda)"
            value={formWord}
            onChange={(e) => setFormWord(e.target.value)}
          />
          <input
            className="w-full rounded-xl border border-shadow/20 bg-bg-light px-4 py-2 text-lg font-medium outline-none"
            placeholder="Slabiky (napr. ja-ho-da)"
            value={formSyllables}
            onChange={(e) => setFormSyllables(e.target.value)}
          />
          <input
            className="w-full rounded-xl border border-shadow/20 bg-bg-light px-4 py-2 text-lg font-medium outline-none"
            placeholder="Emoji (napr. 🍓)"
            value={formEmoji}
            onChange={(e) => setFormEmoji(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              onClick={() => void handleAddWord()}
              className="flex-1 rounded-xl bg-primary text-white py-2 font-bold text-lg active:opacity-80"
            >
              Pridať
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="flex-1 rounded-xl bg-shadow/10 text-text-main py-2 font-bold text-lg active:opacity-80"
            >
              Zrušiť
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-shadow/25 py-3 text-lg font-semibold text-text-main/60 active:opacity-60"
        >
          <Plus size={20} />
          Pridať slovo
        </button>
      )}
    </div>
  );
}

// ── Editable praise list ───────────────────────────────────────────────────────

interface EditablePraiseListProps {
  locale: string;
}

function EditablePraiseList({ locale }: EditablePraiseListProps) {
  const { allUserPraises, addPraise, updatePraise, deletePraise } = useContent();
  const recorder = useRecorder();
  const [overrideKeys, setOverrideKeys] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const savedFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeIdRef = useRef(activeId);
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);
  const discardRef = useRef(false);

  const [showAddForm, setShowAddForm] = useState(false);
  const [formText, setFormText] = useState('');
  const [formEmoji, setFormEmoji] = useState('');

  useEffect(() => {
    audioOverrideStore.listKeys().then((keys) => setOverrideKeys(new Set(keys)));
  }, [allUserPraises]);

  const getAudioKey = useCallback((id: string) => {
    return allUserPraises.find((p) => p.id === id)?.audioKey ?? null;
  }, [allUserPraises]);

  useEffect(() => {
    if (!recorder.blobPromise) return;
    recorder.blobPromise.then(async (blob) => {
      if (discardRef.current) { discardRef.current = false; return; }
      const id = activeIdRef.current;
      if (!id) return;
      const audioKey = getAudioKey(id);
      if (!audioKey) return;
      const storeKey = `${locale}/praise/${audioKey}`;
      await audioOverrideStore.set(storeKey, blob);
      await updatePraise(id, { status: 'ready' });
      const keys = await audioOverrideStore.listKeys();
      setOverrideKeys(new Set(keys));
      setSavedFlash(true);
      savedFlashTimerRef.current = setTimeout(() => {
        setSavedFlash(false);
        setActiveId(null);
      }, SAVED_FLASH_MS);
    });
  }, [recorder.blobPromise]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleDeleteAudio = useCallback(async (praise: UserPraise) => {
    await audioOverrideStore.delete(`${locale}/praise/${praise.audioKey}`);
    await updatePraise(praise.id, { status: 'draft' });
    const keys = await audioOverrideStore.listKeys();
    setOverrideKeys(new Set(keys));
  }, [locale, updatePraise]);

  const handleAddPraise = useCallback(async () => {
    if (!formText.trim() || !formEmoji.trim()) return;
    const id = crypto.randomUUID();
    await addPraise({
      text: formText.trim(),
      emoji: formEmoji.trim(),
      audioKey: `custom-${id}`,
      isDefault: false,
    });
    setFormText('');
    setFormEmoji('');
    setShowAddForm(false);
  }, [addPraise, formText, formEmoji]);

  return (
    <div className="space-y-3">
      {allUserPraises.map((praise) => {
        const storeKey = `${locale}/praise/${praise.audioKey}`;
        const item: AudioItem = {
          key: storeKey,
          label: `${praise.emoji} ${praise.text}${praise.status === 'draft' ? ' ·' : ''}`,
          category: 'praise',
        };
        return (
          <RecordingListItem
            key={praise.id}
            item={item}
            menuActions={[
              {
                label: 'Zmazať pochvalu',
                icon: <Trash2 size={16} />,
                tone: 'danger',
                onSelect: () => void deletePraise(praise.id),
              },
            ]}
            hasCustom={overrideKeys.has(storeKey)}
            isActive={praise.id === activeId}
            recorderState={recorder.state}
            speaking={recorder.speaking}
            savedFlash={praise.id === activeId && savedFlash}
            onRecord={() => handleRecord(praise.id)}
            onStop={handleStop}
            onPlay={() => audioManager.play({ clips: [{ path: storeKey, fallbackText: praise.text }] })}
            onDelete={() => void handleDeleteAudio(praise)}
          />
        );
      })}

      {showAddForm ? (
        <div className="rounded-2xl border-2 border-shadow/20 bg-white p-4 space-y-3">
          <input
            className="w-full rounded-xl border border-shadow/20 bg-bg-light px-4 py-2 text-lg font-medium outline-none"
            placeholder="Text (napr. Výborne!)"
            value={formText}
            onChange={(e) => setFormText(e.target.value)}
          />
          <input
            className="w-full rounded-xl border border-shadow/20 bg-bg-light px-4 py-2 text-lg font-medium outline-none"
            placeholder="Emoji (napr. 🌟)"
            value={formEmoji}
            onChange={(e) => setFormEmoji(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              onClick={() => void handleAddPraise()}
              className="flex-1 rounded-xl bg-primary text-white py-2 font-bold text-lg active:opacity-80"
            >
              Pridať
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="flex-1 rounded-xl bg-shadow/10 text-text-main py-2 font-bold text-lg active:opacity-80"
            >
              Zrušiť
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-shadow/25 py-3 text-lg font-semibold text-text-main/60 active:opacity-60"
        >
          <Plus size={20} />
          Pridať pochvalu
        </button>
      )}
    </div>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────────

export function CustomContentScreen() {
  const { locale } = useContent();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<Section>('letters');

  const systemItems = useMemo(() => {
    if (activeSection === 'letters' || activeSection === 'numbers' || activeSection === 'phrases') {
      return buildSystemItems(locale, activeSection);
    }
    return [];
  }, [locale, activeSection]);

  return (
    <AppScreen maxWidth="narrow">
      <TopBar left={<BackButton onClick={() => navigate(-1)} />} />

      <div className="mb-2 shrink-0 border-b-2 border-shadow/30 pb-4">
        <h2 className="mb-4 text-3xl font-bold">Vlastný obsah</h2>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {SECTIONS.map((section) => (
            <button
              key={section}
              onClick={() => setActiveSection(section)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-base font-semibold transition-colors ${
                activeSection === section
                  ? 'bg-primary text-white'
                  : 'bg-shadow/10 text-text-main'
              }`}
            >
              {SECTION_LABELS[section]}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto py-2">
        {(activeSection === 'letters' || activeSection === 'numbers' || activeSection === 'phrases') && (
          <SystemAudioSection items={systemItems} />
        )}
        {activeSection === 'words' && <EditableWordList locale={locale} />}
        {activeSection === 'praise' && <EditablePraiseList locale={locale} />}
      </div>
    </AppScreen>
  );
}
