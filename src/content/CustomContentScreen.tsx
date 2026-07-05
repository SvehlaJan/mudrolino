/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit3, EyeOff, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useContent } from '../shared/contexts/ContentContext';
import { getLocaleContent } from '../shared/contentRegistry';
import { audioOverrideStore } from '../shared/services/audioOverrideStore';
import { audioManager } from '../shared/services/audioManager';
import { useRecorder } from '../shared/hooks/useRecorder';
import { RecordingListItem } from '../recordings/RecordingListItem';
import type { AudioItem } from '../recordings/RecordingListItem';
import { AppScreen, BackButton, TopBar } from '../shared/ui';
import type { UserWord, UserPraise } from '../shared/types';
import {
  validatePraiseForm,
  validateWordForm,
} from './customContentValidation';
import type { PraiseFormErrors, WordFormErrors } from './customContentValidation';

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

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm font-bold text-red-500">{message}</p>;
}

function SectionNotice({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">
      {message}
    </div>
  );
}

function SectionSummary({
  readyCount,
  draftCount,
  hiddenDefaultCount,
}: {
  readyCount: number;
  draftCount: number;
  hiddenDefaultCount: number;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="rounded-2xl bg-green-50 px-3 py-2 text-center text-sm font-bold text-green-700">
        Hotové: {readyCount}
      </div>
      <div className="rounded-2xl bg-amber-50 px-3 py-2 text-center text-sm font-bold text-amber-700">
        Koncepty: {draftCount}
      </div>
      <div className="rounded-2xl bg-shadow/10 px-3 py-2 text-center text-sm font-bold text-text-main/65">
        Skryté: {hiddenDefaultCount}
      </div>
    </div>
  );
}

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
  const {
    allUserWords,
    addWord,
    updateWord,
    deleteWord,
    hideDefaultWord,
    restoreDefaultWords,
  } = useContent();
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
  const [formErrors, setFormErrors] = useState<WordFormErrors>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sectionNotice, setSectionNotice] = useState<string | null>(null);

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

  const defaultWordCount = getLocaleContent(locale).wordItems.length;
  const readyCount = allUserWords.filter((word) => word.status === 'ready').length;
  const draftCount = allUserWords.filter((word) => word.status === 'draft').length;
  const hiddenDefaultCount = Math.max(0, defaultWordCount - allUserWords.filter((word) => word.isDefault).length);

  const resetWordForm = useCallback(() => {
    setFormWord('');
    setFormSyllables('');
    setFormEmoji('');
    setFormErrors({});
    setEditingId(null);
    setShowAddForm(false);
  }, []);

  const populateWordForm = useCallback((word: UserWord) => {
    setFormWord(word.word);
    setFormSyllables(word.syllables);
    setFormEmoji(word.emoji);
    setFormErrors({});
    setEditingId(word.id);
    setShowAddForm(true);
  }, []);

  const handleSaveWord = useCallback(async () => {
    const validation = validateWordForm(
      { word: formWord, syllables: formSyllables, emoji: formEmoji },
      allUserWords,
      editingId ?? undefined,
    );
    setFormErrors(validation.errors);
    if (!validation.valid) return;

    try {
      if (editingId) {
        await updateWord(editingId, validation.values);
      } else {
        const id = crypto.randomUUID();
        await addWord({
          word: validation.values.word,
          syllables: validation.values.syllables,
          emoji: validation.values.emoji,
          audioKey: `custom-${id}`,
          isDefault: false,
        });
      }
      resetWordForm();
      setSectionNotice(null);
    } catch {
      setSectionNotice('Slovo sa nepodarilo uložiť. Skúste to znova.');
    }
  }, [
    addWord,
    allUserWords,
    editingId,
    formEmoji,
    formSyllables,
    formWord,
    resetWordForm,
    updateWord,
  ]);

  const handleHideDefaultWord = useCallback(async (word: UserWord) => {
    try {
      await hideDefaultWord(word.id);
      setSectionNotice(`Slovo ${word.word} je skryté.`);
    } catch {
      setSectionNotice('Slovo sa nepodarilo skryť. Skúste to znova.');
    }
  }, [hideDefaultWord]);

  const handleRestoreDefaultWords = useCallback(async () => {
    try {
      const result = await restoreDefaultWords();
      if (result.skippedDuplicates > 0) {
        setSectionNotice(`Obnovené: ${result.restored}. Preskočené duplicity: ${result.skippedDuplicates}.`);
      } else {
        setSectionNotice(`Obnovené predvolené slová: ${result.restored}.`);
      }
    } catch {
      setSectionNotice('Predvolené slová sa nepodarilo obnoviť. Skúste to znova.');
    }
  }, [restoreDefaultWords]);

  return (
    <div className="space-y-3">
      <SectionSummary
        readyCount={readyCount}
        draftCount={draftCount}
        hiddenDefaultCount={hiddenDefaultCount}
      />
      <SectionNotice message={sectionNotice} />
      {hiddenDefaultCount > 0 && (
        <button
          onClick={() => void handleRestoreDefaultWords()}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-shadow/10 py-3 text-lg font-semibold text-text-main/70 active:opacity-60"
        >
          <RotateCcw size={20} />
          Obnoviť predvolené slová
        </button>
      )}

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
              ...(!word.isDefault
                ? [
                    {
                      label: 'Upraviť slovo',
                      icon: <Edit3 size={16} />,
                      onSelect: () => populateWordForm(word),
                    },
                  ]
                : []),
              word.isDefault
                ? {
                    label: 'Skryť slovo',
                    icon: <EyeOff size={16} />,
                    tone: 'danger' as const,
                    onSelect: () => void handleHideDefaultWord(word),
                  }
                : {
                    label: 'Zmazať slovo',
                    icon: <Trash2 size={16} />,
                    tone: 'danger' as const,
                    onSelect: () => void deleteWord(word.id),
                  },
            ]}
            hasCustom={overrideKeys.has(storeKey)}
            isActive={word.id === activeId}
            recorderState={recorder.state}
            speaking={recorder.speaking}
            savedFlash={word.id === activeId && savedFlash}
            statusLabel={word.isDefault ? 'Predvolené' : word.status === 'draft' ? 'Koncept' : 'Vlastné'}
            statusTone={word.status === 'draft' ? 'draft' : word.isDefault ? 'default' : 'ready'}
            allowPlay={word.status === 'ready' || overrideKeys.has(storeKey)}
            recordEmphasis={word.status === 'draft'}
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
          <FieldError message={formErrors.word} />
          <input
            className="w-full rounded-xl border border-shadow/20 bg-bg-light px-4 py-2 text-lg font-medium outline-none"
            placeholder="Slabiky (napr. ja-ho-da)"
            value={formSyllables}
            onChange={(e) => setFormSyllables(e.target.value)}
          />
          <FieldError message={formErrors.syllables} />
          <input
            className="w-full rounded-xl border border-shadow/20 bg-bg-light px-4 py-2 text-lg font-medium outline-none"
            placeholder="Emoji (napr. 🍓)"
            value={formEmoji}
            onChange={(e) => setFormEmoji(e.target.value)}
          />
          <FieldError message={formErrors.emoji} />
          <div className="flex gap-2">
            <button
              onClick={() => void handleSaveWord()}
              className="flex-1 rounded-xl bg-primary text-white py-2 font-bold text-lg active:opacity-80"
            >
              {editingId ? 'Uložiť' : 'Pridať'}
            </button>
            <button
              onClick={resetWordForm}
              className="flex-1 rounded-xl bg-shadow/10 text-text-main py-2 font-bold text-lg active:opacity-80"
            >
              Zrušiť
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => {
            setEditingId(null);
            setShowAddForm(true);
            setFormErrors({});
          }}
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
  const {
    allUserPraises,
    addPraise,
    updatePraise,
    deletePraise,
    hideDefaultPraise,
    restoreDefaultPraises,
  } = useContent();
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
  const [formErrors, setFormErrors] = useState<PraiseFormErrors>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sectionNotice, setSectionNotice] = useState<string | null>(null);

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

  const defaultPraiseCount = getLocaleContent(locale).praiseEntries.length;
  const readyCount = allUserPraises.filter((praise) => praise.status === 'ready').length;
  const draftCount = allUserPraises.filter((praise) => praise.status === 'draft').length;
  const hiddenDefaultCount = Math.max(
    0,
    defaultPraiseCount - allUserPraises.filter((praise) => praise.isDefault).length,
  );

  const resetPraiseForm = useCallback(() => {
    setFormText('');
    setFormEmoji('');
    setFormErrors({});
    setEditingId(null);
    setShowAddForm(false);
  }, []);

  const populatePraiseForm = useCallback((praise: UserPraise) => {
    setFormText(praise.text);
    setFormEmoji(praise.emoji);
    setFormErrors({});
    setEditingId(praise.id);
    setShowAddForm(true);
  }, []);

  const handleSavePraise = useCallback(async () => {
    const validation = validatePraiseForm(
      { text: formText, emoji: formEmoji },
      allUserPraises,
      editingId ?? undefined,
    );
    setFormErrors(validation.errors);
    if (!validation.valid) return;

    try {
      if (editingId) {
        await updatePraise(editingId, validation.values);
      } else {
        const id = crypto.randomUUID();
        await addPraise({
          text: validation.values.text,
          emoji: validation.values.emoji,
          audioKey: `custom-${id}`,
          isDefault: false,
        });
      }
      resetPraiseForm();
      setSectionNotice(null);
    } catch {
      setSectionNotice('Pochvalu sa nepodarilo uložiť. Skúste to znova.');
    }
  }, [
    addPraise,
    allUserPraises,
    editingId,
    formEmoji,
    formText,
    resetPraiseForm,
    updatePraise,
  ]);

  const handleHideDefaultPraise = useCallback(async (praise: UserPraise) => {
    try {
      await hideDefaultPraise(praise.id);
      setSectionNotice(`Pochvala ${praise.text} je skrytá.`);
    } catch {
      setSectionNotice('Pochvalu sa nepodarilo skryť. Skúste to znova.');
    }
  }, [hideDefaultPraise]);

  const handleRestoreDefaultPraises = useCallback(async () => {
    try {
      const result = await restoreDefaultPraises();
      if (result.skippedDuplicates > 0) {
        setSectionNotice(`Obnovené: ${result.restored}. Preskočené duplicity: ${result.skippedDuplicates}.`);
      } else {
        setSectionNotice(`Obnovené predvolené pochvaly: ${result.restored}.`);
      }
    } catch {
      setSectionNotice('Predvolené pochvaly sa nepodarilo obnoviť. Skúste to znova.');
    }
  }, [restoreDefaultPraises]);

  return (
    <div className="space-y-3">
      <SectionSummary
        readyCount={readyCount}
        draftCount={draftCount}
        hiddenDefaultCount={hiddenDefaultCount}
      />
      <SectionNotice message={sectionNotice} />
      {hiddenDefaultCount > 0 && (
        <button
          onClick={() => void handleRestoreDefaultPraises()}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-shadow/10 py-3 text-lg font-semibold text-text-main/70 active:opacity-60"
        >
          <RotateCcw size={20} />
          Obnoviť predvolené pochvaly
        </button>
      )}

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
              ...(!praise.isDefault
                ? [
                    {
                      label: 'Upraviť pochvalu',
                      icon: <Edit3 size={16} />,
                      onSelect: () => populatePraiseForm(praise),
                    },
                  ]
                : []),
              praise.isDefault
                ? {
                    label: 'Skryť pochvalu',
                    icon: <EyeOff size={16} />,
                    tone: 'danger' as const,
                    onSelect: () => void handleHideDefaultPraise(praise),
                  }
                : {
                    label: 'Zmazať pochvalu',
                    icon: <Trash2 size={16} />,
                    tone: 'danger' as const,
                    onSelect: () => void deletePraise(praise.id),
                  },
            ]}
            hasCustom={overrideKeys.has(storeKey)}
            isActive={praise.id === activeId}
            recorderState={recorder.state}
            speaking={recorder.speaking}
            savedFlash={praise.id === activeId && savedFlash}
            statusLabel={praise.isDefault ? 'Predvolené' : praise.status === 'draft' ? 'Koncept' : 'Vlastné'}
            statusTone={praise.status === 'draft' ? 'draft' : praise.isDefault ? 'default' : 'ready'}
            allowPlay={praise.status === 'ready' || overrideKeys.has(storeKey)}
            recordEmphasis={praise.status === 'draft'}
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
          <FieldError message={formErrors.text} />
          <input
            className="w-full rounded-xl border border-shadow/20 bg-bg-light px-4 py-2 text-lg font-medium outline-none"
            placeholder="Emoji (napr. 🌟)"
            value={formEmoji}
            onChange={(e) => setFormEmoji(e.target.value)}
          />
          <FieldError message={formErrors.emoji} />
          <div className="flex gap-2">
            <button
              onClick={() => void handleSavePraise()}
              className="flex-1 rounded-xl bg-primary text-white py-2 font-bold text-lg active:opacity-80"
            >
              {editingId ? 'Uložiť' : 'Pridať'}
            </button>
            <button
              onClick={resetPraiseForm}
              className="flex-1 rounded-xl bg-shadow/10 text-text-main py-2 font-bold text-lg active:opacity-80"
            >
              Zrušiť
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => {
            setEditingId(null);
            setShowAddForm(true);
            setFormErrors({});
          }}
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
