import { Page } from '@playwright/test';

interface FixtureWordItem {
  id?: string;
  word: string;
  syllables?: string | string[];
  emoji?: string;
  audioKey?: string;
}

interface FixturePraiseItem {
  id?: string;
  text: string;
  emoji?: string;
  audioKey?: string;
}

interface CustomContentFixture {
  words?: FixtureWordItem[];
  praise?: FixturePraiseItem[];
}

export async function seedLocalStorage(page: Page, data: Record<string, unknown>) {
  await page.addInitScript((items) => {
    for (const [k, v] of Object.entries(items)) {
      window.localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
    }
    // Backward compatibility: If hrave-ucenie-custom-content-* is present without user-words, synthesize them
    for (const [k, v] of Object.entries(items)) {
      if (k.startsWith('hrave-ucenie-custom-content-')) {
        const locale = k.replace('hrave-ucenie-custom-content-', '');
        if (!window.localStorage.getItem(`hrave-ucenie-user-words-${locale}`)) {
          try {
            const parsed = (typeof v === 'string' ? JSON.parse(v) : v) as CustomContentFixture;
            if (parsed && typeof parsed === 'object') {
              if (Array.isArray(parsed.words)) {
                const words = parsed.words.map((w: FixtureWordItem, idx: number) => ({
                  id: w.id || `custom-${idx}`,
                  word: w.word,
                  syllables: Array.isArray(w.syllables) ? w.syllables.join('-') : (w.syllables || ''),
                  emoji: w.emoji || '🚗',
                  audioKey: w.audioKey || `custom-${w.id || idx}`,
                  status: 'ready',
                  isDefault: false,
                  locale,
                  order: idx,
                }));
                window.localStorage.setItem(`hrave-ucenie-user-words-${locale}`, JSON.stringify(words));
              }
              if (Array.isArray(parsed.praise)) {
                const praises = parsed.praise.map((p: FixturePraiseItem, idx: number) => ({
                  id: p.id || `custom-praise-${idx}`,
                  text: p.text,
                  emoji: p.emoji || '🌟',
                  audioKey: p.audioKey || `custom-${p.id || idx}`,
                  status: 'ready',
                  isDefault: false,
                  locale,
                  order: idx,
                }));
                window.localStorage.setItem(`hrave-ucenie-user-praises-${locale}`, JSON.stringify(praises));
              }
              window.localStorage.setItem(`hrave-ucenie-seeded-${locale}`, 'true');
            }
          } catch {
            // ignore
          }
        }
      }
    }
  }, data);
}

export async function seedIndexedDBAudio(page: Page, key: string, dummyText = 'test audio') {
  await page.evaluate(async ({ k, text }) => {
    const DB_NAME = 'hrave-ucenie-audio-overrides';
    const STORE_NAME = 'overrides';
    const DB_VERSION = 1;
    const blob = new Blob([text], { type: 'audio/webm' });

    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(blob, k);
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
      req.onerror = () => reject(req.error);
    });
  }, { k: key, text: dummyText });
}

export async function getIndexedDBAudio(page: Page, key: string): Promise<string | null> {
  return page.evaluate(async (k) => {
    const DB_NAME = 'hrave-ucenie-audio-overrides';
    const STORE_NAME = 'overrides';
    const DB_VERSION = 1;

    return new Promise<string | null>((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          resolve(null);
          return;
        }
        const tx = db.transaction(STORE_NAME, 'readonly');
        const getReq = tx.objectStore(STORE_NAME).get(k);
        getReq.onsuccess = async () => {
          const blob = getReq.result as Blob | undefined;
          if (!blob) {
            resolve(null);
            return;
          }
          const text = await blob.text();
          resolve(text);
        };
        getReq.onerror = () => reject(getReq.error);
      };
      req.onerror = () => reject(req.error);
    });
  }, key);
}
