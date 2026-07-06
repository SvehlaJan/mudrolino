// src/shared/services/localContentRepository.ts
import type { UserWord, UserPraise } from '../types';
import type { ContentRepository } from './contentRepository';
import type { RestoreDefaultsResult } from './contentRepository';
import { normalizeComparableText } from '../../content/customContentValidation';

function wordsKey(locale: string) { return `hrave-ucenie-user-words-${locale}`; }
function praisesKey(locale: string) { return `hrave-ucenie-user-praises-${locale}`; }
function seededKey(locale: string) { return `hrave-ucenie-seeded-${locale}`; }

function readJson<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function writeJson<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // Quota exceeded — silent fail, same pattern as settingsService
  }
}

function nextOrder(items: Array<{ order: number }>): number {
  return items.length === 0 ? 0 : Math.max(...items.map((item) => item.order)) + 1;
}

export class LocalContentRepository implements ContentRepository {
  constructor(readonly locale: string) {}

  async isSeeded(): Promise<boolean> {
    return localStorage.getItem(seededKey(this.locale)) === 'true';
  }

  async seed(words: UserWord[], praises: UserPraise[]): Promise<void> {
    if (await this.isSeeded()) return;
    writeJson(wordsKey(this.locale), words);
    writeJson(praisesKey(this.locale), praises);
    localStorage.setItem(seededKey(this.locale), 'true');
  }

  async getWords(): Promise<UserWord[]> {
    return readJson<UserWord>(wordsKey(this.locale));
  }

  async addWord(word: Omit<UserWord, 'id' | 'status' | 'order' | 'locale'>): Promise<UserWord> {
    const words = await this.getWords();
    const newWord: UserWord = {
      ...word,
      id: crypto.randomUUID(),
      status: 'draft',
      order: words.length,
      locale: this.locale,
    };
    writeJson(wordsKey(this.locale), [...words, newWord]);
    return newWord;
  }

  async updateWord(
    id: string,
    changes: Partial<Pick<UserWord, 'word' | 'syllables' | 'emoji' | 'imageUrl' | 'status' | 'order'>>,
  ): Promise<UserWord> {
    const words = await this.getWords();
    const index = words.findIndex((w) => w.id === id);
    if (index === -1) throw new Error(`Word ${id} not found`);
    const updated = { ...words[index], ...changes };
    const next = [...words];
    next[index] = updated;
    writeJson(wordsKey(this.locale), next);
    return updated;
  }

  async deleteWord(id: string): Promise<void> {
    const words = await this.getWords();
    writeJson(wordsKey(this.locale), words.filter((w) => w.id !== id));
  }

  async hideDefaultWord(id: string): Promise<void> {
    const words = await this.getWords();
    const word = words.find((candidate) => candidate.id === id);
    if (!word) throw new Error(`Word ${id} not found`);
    if (!word.isDefault) throw new Error(`Word ${id} is not a default word`);
    writeJson(wordsKey(this.locale), words.filter((candidate) => candidate.id !== id));
  }

  async restoreDefaultWords(defaultWords: UserWord[]): Promise<RestoreDefaultsResult> {
    const words = await this.getWords();
    const existingAudioKeys = new Set(words.filter((word) => word.isDefault).map((word) => word.audioKey));
    const customNames = new Set(
      words.filter((word) => !word.isDefault).map((word) => normalizeComparableText(word.word)),
    );
    const restored: UserWord[] = [];
    let skippedDuplicates = 0;
    let order = nextOrder(words);

    for (const defaultWord of defaultWords) {
      if (existingAudioKeys.has(defaultWord.audioKey)) continue;
      if (customNames.has(normalizeComparableText(defaultWord.word))) {
        skippedDuplicates += 1;
        continue;
      }
      restored.push({ ...defaultWord, id: crypto.randomUUID(), order });
      order += 1;
    }

    if (restored.length > 0) {
      writeJson(wordsKey(this.locale), [...words, ...restored]);
    }

    return { restored: restored.length, skippedDuplicates };
  }

  async getPraises(): Promise<UserPraise[]> {
    return readJson<UserPraise>(praisesKey(this.locale));
  }

  async addPraise(praise: Omit<UserPraise, 'id' | 'status' | 'order' | 'locale'>): Promise<UserPraise> {
    const praises = await this.getPraises();
    const newPraise: UserPraise = {
      ...praise,
      id: crypto.randomUUID(),
      status: 'draft',
      order: praises.length,
      locale: this.locale,
    };
    writeJson(praisesKey(this.locale), [...praises, newPraise]);
    return newPraise;
  }

  async updatePraise(
    id: string,
    changes: Partial<Pick<UserPraise, 'text' | 'emoji' | 'imageUrl' | 'status' | 'order'>>,
  ): Promise<UserPraise> {
    const praises = await this.getPraises();
    const index = praises.findIndex((p) => p.id === id);
    if (index === -1) throw new Error(`Praise ${id} not found`);
    const updated = { ...praises[index], ...changes };
    const next = [...praises];
    next[index] = updated;
    writeJson(praisesKey(this.locale), next);
    return updated;
  }

  async deletePraise(id: string): Promise<void> {
    const praises = await this.getPraises();
    writeJson(praisesKey(this.locale), praises.filter((p) => p.id !== id));
  }

  async hideDefaultPraise(id: string): Promise<void> {
    const praises = await this.getPraises();
    const praise = praises.find((candidate) => candidate.id === id);
    if (!praise) throw new Error(`Praise ${id} not found`);
    if (!praise.isDefault) throw new Error(`Praise ${id} is not a default praise`);
    writeJson(praisesKey(this.locale), praises.filter((candidate) => candidate.id !== id));
  }

  async restoreDefaultPraises(defaultPraises: UserPraise[]): Promise<RestoreDefaultsResult> {
    const praises = await this.getPraises();
    const existingAudioKeys = new Set(praises.filter((praise) => praise.isDefault).map((praise) => praise.audioKey));
    const customNames = new Set(
      praises.filter((praise) => !praise.isDefault).map((praise) => normalizeComparableText(praise.text)),
    );
    const restored: UserPraise[] = [];
    let skippedDuplicates = 0;
    let order = nextOrder(praises);

    for (const defaultPraise of defaultPraises) {
      if (existingAudioKeys.has(defaultPraise.audioKey)) continue;
      if (customNames.has(normalizeComparableText(defaultPraise.text))) {
        skippedDuplicates += 1;
        continue;
      }
      restored.push({ ...defaultPraise, id: crypto.randomUUID(), order });
      order += 1;
    }

    if (restored.length > 0) {
      writeJson(praisesKey(this.locale), [...praises, ...restored]);
    }

    return { restored: restored.length, skippedDuplicates };
  }
}
