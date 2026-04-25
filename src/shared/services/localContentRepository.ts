// src/shared/services/localContentRepository.ts
import type { UserWord, UserPraise } from '../types';
import type { ContentRepository } from './contentRepository';

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
}
