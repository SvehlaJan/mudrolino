// src/shared/contexts/ContentContext.tsx
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type {
  AudioPhrase,
  AudioPhraseKey,
  Letter,
  NumberItem,
  PraiseEntry,
  Syllable,
  UserPraise,
  UserWord,
  Word,
} from '../types';
import { deriveSyllableItems, getLocaleContent } from '../contentRegistry';
import type { ContentRepository } from '../services/contentRepository';
import { LocalContentRepository } from '../services/localContentRepository';
import { audioOverrideStore } from '../services/audioOverrideStore';

export interface ContentContextValue {
  locale: string;

  // System content — from locale registry, static per locale
  letterItems: Letter[];
  numberItems: NumberItem[];
  audioPhrases: Record<AudioPhraseKey, AudioPhrase>;

  // User-managed — reactive, only enabled ready items
  wordItems: Word[];
  syllableItems: Syllable[];
  praiseEntries: PraiseEntry[];

  // Full lists including drafts — for management screen only
  allUserWords: UserWord[];
  allUserPraises: UserPraise[];

  isLoading: boolean;

  addWord(data: Omit<UserWord, 'id' | 'status' | 'enabled' | 'order' | 'locale'>): Promise<void>;
  updateWord(
    id: string,
    changes: Partial<Pick<UserWord, 'word' | 'syllables' | 'emoji' | 'imageUrl' | 'status' | 'order'>>,
  ): Promise<void>;
  deleteWord(id: string): Promise<void>;
  setDefaultWordEnabled(id: string, enabled: boolean): Promise<void>;
  restoreAllDefaultWords(): Promise<void>;
  addPraise(data: Omit<UserPraise, 'id' | 'status' | 'enabled' | 'order' | 'locale'>): Promise<void>;
  updatePraise(
    id: string,
    changes: Partial<Pick<UserPraise, 'text' | 'emoji' | 'imageUrl' | 'status' | 'order'>>,
  ): Promise<void>;
  deletePraise(id: string): Promise<void>;
  setDefaultPraiseEnabled(id: string, enabled: boolean): Promise<void>;
  restoreAllDefaultPraises(): Promise<void>;
}

const ContentContext = createContext<ContentContextValue | null>(null);

export function useContent(): ContentContextValue {
  const ctx = useContext(ContentContext);
  if (!ctx) throw new Error('useContent must be used within ContentProvider');
  return ctx;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useContentLocale(): string {
  const ctx = useContext(ContentContext);
  return ctx?.locale ?? 'sk';
}

interface ContentProviderProps {
  locale: string;
  children: React.ReactNode;
}

function buildDefaultWords(locale: string): UserWord[] {
  return getLocaleContent(locale).wordItems.map((word, index) => ({
    id: `default:word:${locale}:${word.audioKey}`,
    word: word.word,
    syllables: word.syllables,
    emoji: word.emoji,
    audioKey: word.audioKey,
    status: 'ready' as const,
    enabled: true,
    isDefault: true,
    locale,
    order: index,
  }));
}

function buildDefaultPraises(locale: string): UserPraise[] {
  return getLocaleContent(locale).praiseEntries.map((praise, index) => ({
    id: `default:praise:${locale}:${praise.audioKey}`,
    text: praise.text,
    emoji: praise.emoji,
    audioKey: praise.audioKey,
    status: 'ready' as const,
    enabled: true,
    isDefault: true,
    locale,
    order: index,
  }));
}

export function ContentProvider({ locale, children }: ContentProviderProps) {
  const repoRef = useRef<ContentRepository>(new LocalContentRepository(locale));
  const [allUserWords, setAllUserWords] = useState<UserWord[]>([]);
  const [allUserPraises, setAllUserPraises] = useState<UserPraise[]>([]);
  const [loadedLocale, setLoadedLocale] = useState<string | null>(null);
  const isLoading = loadedLocale !== locale;

  useEffect(() => {
    const repo = new LocalContentRepository(locale);
    repoRef.current = repo;
    let active = true;

    const seedWords = buildDefaultWords(locale);
    const seedPraises = buildDefaultPraises(locale);

    void repo
      .seed(seedWords, seedPraises)
      .then(() => Promise.all([repo.getWords(), repo.getPraises()]))
      .then(([words, praises]) => {
        if (!active) return;
        setAllUserWords(words);
        setAllUserPraises(praises);
        setLoadedLocale(locale);
      });
    return () => { active = false; };
  }, [locale]);

  const reload = useCallback(async () => {
    const [words, praises] = await Promise.all([
      repoRef.current.getWords(),
      repoRef.current.getPraises(),
    ]);
    setAllUserWords(words);
    setAllUserPraises(praises);
  }, []);

  const addWord = useCallback(
    async (data: Omit<UserWord, 'id' | 'status' | 'enabled' | 'order' | 'locale'>) => {
      await repoRef.current.addWord(data);
      await reload();
    },
    [reload],
  );

  const updateWord = useCallback(
    async (
      id: string,
      changes: Partial<Pick<UserWord, 'word' | 'syllables' | 'emoji' | 'imageUrl' | 'status' | 'order'>>,
    ) => {
      await repoRef.current.updateWord(id, changes);
      await reload();
    },
    [reload],
  );

  const deleteWord = useCallback(
    async (id: string) => {
      const word = allUserWords.find((w) => w.id === id);
      await repoRef.current.deleteWord(id);
      if (word) {
        await audioOverrideStore.delete(`${locale}/words/${word.audioKey}`);
      }
      await reload();
    },
    [allUserWords, locale, reload],
  );

  const setDefaultWordEnabled = useCallback(
    async (id: string, enabled: boolean) => {
      await repoRef.current.setDefaultWordEnabled(id, enabled);
      await reload();
    },
    [reload],
  );

  const restoreAllDefaultWords = useCallback(async () => {
    await repoRef.current.restoreAllDefaultWords();
    await reload();
  }, [reload]);

  const addPraise = useCallback(
    async (data: Omit<UserPraise, 'id' | 'status' | 'enabled' | 'order' | 'locale'>) => {
      await repoRef.current.addPraise(data);
      await reload();
    },
    [reload],
  );

  const updatePraise = useCallback(
    async (
      id: string,
      changes: Partial<Pick<UserPraise, 'text' | 'emoji' | 'imageUrl' | 'status' | 'order'>>,
    ) => {
      await repoRef.current.updatePraise(id, changes);
      await reload();
    },
    [reload],
  );

  const deletePraise = useCallback(
    async (id: string) => {
      const praise = allUserPraises.find((p) => p.id === id);
      await repoRef.current.deletePraise(id);
      if (praise) {
        await audioOverrideStore.delete(`${locale}/praise/${praise.audioKey}`);
      }
      await reload();
    },
    [allUserPraises, locale, reload],
  );

  const setDefaultPraiseEnabled = useCallback(
    async (id: string, enabled: boolean) => {
      await repoRef.current.setDefaultPraiseEnabled(id, enabled);
      await reload();
    },
    [reload],
  );

  const restoreAllDefaultPraises = useCallback(async () => {
    await repoRef.current.restoreAllDefaultPraises();
    await reload();
  }, [reload]);

  const localeData = getLocaleContent(locale);
  const readyWords = allUserWords.filter((w) => w.enabled && w.status === 'ready');
  const wordItems: Word[] = readyWords.map((w) => ({
    word: w.word,
    syllables: w.syllables,
    emoji: w.emoji,
    audioKey: w.audioKey,
  }));
  const syllableItems = deriveSyllableItems(wordItems);
  const praiseEntries: PraiseEntry[] = allUserPraises
    .filter((p) => p.enabled && p.status === 'ready')
    .map((p) => ({ text: p.text, emoji: p.emoji, audioKey: p.audioKey }));

  const value: ContentContextValue = {
    locale,
    letterItems: localeData.letterItems,
    numberItems: localeData.numberItems,
    audioPhrases: localeData.audioPhrases,
    wordItems,
    syllableItems,
    praiseEntries,
    allUserWords,
    allUserPraises,
    isLoading,
    addWord,
    updateWord,
    deleteWord,
    setDefaultWordEnabled,
    restoreAllDefaultWords,
    addPraise,
    updatePraise,
    deletePraise,
    setDefaultPraiseEnabled,
    restoreAllDefaultPraises,
  };

  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}
