import type { UserPraise, UserWord } from '../types';
import { defaultPraiseId, defaultWordId, migratePraises, migrateWords, assertCanDisableOrDelete, assertHasPlayable, type ContentEnvelopeV2 } from '../../content/contentState';
import { getLocaleContent } from '../contentRegistry';
import type { ContentRepository } from './contentRepository';

function wordsKey(locale: string) { return `hrave-ucenie-user-words-${locale}`; }
function praisesKey(locale: string) { return `hrave-ucenie-user-praises-${locale}`; }
function seededKey(locale: string) { return `hrave-ucenie-seeded-${locale}`; }
function read(key: string): unknown { try { return localStorage.getItem(key); } catch { return null; } }
function write<T>(key: string, items: T[]): void { try { const envelope: ContentEnvelopeV2<T> = { version: 2, items }; localStorage.setItem(key, JSON.stringify(envelope)); } catch { /* storage is unavailable */ } }
function nextOrder(items: Array<{ order: number }>) { return items.length ? Math.max(...items.map((item) => item.order)) + 1 : 0; }
function defaultsWords(locale: string): UserWord[] { return getLocaleContent(locale).wordItems.map((word, order) => ({ ...word, id: defaultWordId(locale, word.audioKey), status: 'ready', enabled: true, isDefault: true, locale, order })); }
function defaultsPraises(locale: string): UserPraise[] { return getLocaleContent(locale).praiseEntries.map((praise, order) => ({ ...praise, id: defaultPraiseId(locale, praise.audioKey), status: 'ready', enabled: true, isDefault: true, locale, order })); }

export class LocalContentRepository implements ContentRepository {
  private static queues = new Map<string, Promise<void>>();
  constructor(readonly locale: string) {}
  private enqueue<T>(_key: string, operation: () => Promise<T>): Promise<T> {
    const key = `content:${this.locale}`;
    const previous = LocalContentRepository.queues.get(key) ?? Promise.resolve();
    const running = previous.catch(() => undefined).then(operation);
    LocalContentRepository.queues.set(key, running.then(() => undefined, () => undefined));
    return running;
  }
  async isSeeded() { return read(seededKey(this.locale)) === 'true'; }
  async seed(words: UserWord[], praises: UserPraise[]) { return this.enqueue(seededKey(this.locale), async () => {
    if (await this.isSeeded()) return;
    const nextWords = migrateWords({ raw: read(wordsKey(this.locale)) ?? words, defaults: defaultsWords(this.locale), locale: this.locale, seeded: true }).items;
    const nextPraises = migratePraises({ raw: read(praisesKey(this.locale)) ?? praises, defaults: defaultsPraises(this.locale), locale: this.locale, seeded: true }).items;
    assertHasPlayable(nextWords);
    assertHasPlayable(nextPraises);
    write(wordsKey(this.locale), nextWords);
    write(praisesKey(this.locale), nextPraises);
    try { localStorage.setItem(seededKey(this.locale), 'true'); } catch { /* storage is unavailable */ }
  }); }
  async getWords() { return migrateWords({ raw: read(wordsKey(this.locale)), defaults: defaultsWords(this.locale), locale: this.locale, seeded: await this.isSeeded() }).items; }
  async getPraises() { return migratePraises({ raw: read(praisesKey(this.locale)), defaults: defaultsPraises(this.locale), locale: this.locale, seeded: await this.isSeeded() }).items; }
  async addWord(word: Omit<UserWord, 'id' | 'status' | 'enabled' | 'order' | 'locale'>) { return this.enqueue(wordsKey(this.locale), async () => { const words = await this.getWords(); const item: UserWord = { ...word, id: crypto.randomUUID(), status: 'draft', enabled: true, locale: this.locale, order: nextOrder(words) }; write(wordsKey(this.locale), [...words, item]); return item; }); }
  async updateWord(id: string, changes: Partial<Pick<UserWord, 'word' | 'syllables' | 'emoji' | 'imageUrl' | 'status' | 'enabled' | 'order'>>) { return this.enqueue(wordsKey(this.locale), async () => { const words = await this.getWords(); const index = words.findIndex((item) => item.id === id); if (index < 0) throw new Error(`Word ${id} not found`); const next = [...words]; next[index] = { ...next[index], ...changes }; assertHasPlayable(next); write(wordsKey(this.locale), next); return next[index]; }); }
  async deleteWord(id: string) { return this.enqueue(wordsKey(this.locale), async () => { const words = await this.getWords(); if (!words.some((item) => item.id === id)) throw new Error(`Word ${id} not found`); assertCanDisableOrDelete(words, id); write(wordsKey(this.locale), words.filter((item) => item.id !== id)); }); }
  async setDefaultWordEnabled(id: string, enabled: boolean) { const item = (await this.getWords()).find((word) => word.id === id); if (!item) throw new Error(`Word ${id} not found`); if (!item.isDefault) throw new Error(`Word ${id} is not a default word`); await this.updateWord(id, { enabled }); }
  async restoreAllDefaultWords() { return this.enqueue(wordsKey(this.locale), async () => { const next = (await this.getWords()).map((item) => item.isDefault ? { ...item, enabled: true } : item); assertHasPlayable(next); write(wordsKey(this.locale), next); }); }
  async addPraise(praise: Omit<UserPraise, 'id' | 'status' | 'enabled' | 'order' | 'locale'>) { return this.enqueue(praisesKey(this.locale), async () => { const praises = await this.getPraises(); const item: UserPraise = { ...praise, id: crypto.randomUUID(), status: 'draft', enabled: true, locale: this.locale, order: nextOrder(praises) }; write(praisesKey(this.locale), [...praises, item]); return item; }); }
  async updatePraise(id: string, changes: Partial<Pick<UserPraise, 'text' | 'emoji' | 'imageUrl' | 'status' | 'enabled' | 'order'>>) { return this.enqueue(praisesKey(this.locale), async () => { const praises = await this.getPraises(); const index = praises.findIndex((item) => item.id === id); if (index < 0) throw new Error(`Praise ${id} not found`); const next = [...praises]; next[index] = { ...next[index], ...changes }; assertHasPlayable(next); write(praisesKey(this.locale), next); return next[index]; }); }
  async deletePraise(id: string) { return this.enqueue(praisesKey(this.locale), async () => { const praises = await this.getPraises(); if (!praises.some((item) => item.id === id)) throw new Error(`Praise ${id} not found`); assertCanDisableOrDelete(praises, id); write(praisesKey(this.locale), praises.filter((item) => item.id !== id)); }); }
  async setDefaultPraiseEnabled(id: string, enabled: boolean) { const item = (await this.getPraises()).find((praise) => praise.id === id); if (!item) throw new Error(`Praise ${id} not found`); if (!item.isDefault) throw new Error(`Praise ${id} is not a default praise`); await this.updatePraise(id, { enabled }); }
  async restoreAllDefaultPraises() { return this.enqueue(praisesKey(this.locale), async () => { const next = (await this.getPraises()).map((item) => item.isDefault ? { ...item, enabled: true } : item); assertHasPlayable(next); write(praisesKey(this.locale), next); }); }
}
