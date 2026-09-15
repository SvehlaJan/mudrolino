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

export const DB_NAME = 'hrave-ucenie-audio-overrides';
export const STORE_NAME = 'overrides';
export const DB_VERSION = 1;

export async function seedIndexedDBAudio(page: Page, key: string, dummyText = 'test audio') {
  await page.evaluate(
    async ({ k, text, dbName, storeName, dbVersion }) => {
      const blob = new Blob([text], { type: 'audio/webm' });

      await new Promise<void>((resolve, reject) => {
        const req = indexedDB.open(dbName, dbVersion);
        req.onupgradeneeded = (e) => {
          const db = (e.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName);
          }
        };
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction(storeName, 'readwrite');
          tx.objectStore(storeName).put(blob, k);
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => {
            db.close();
            reject(tx.error);
          };
        };
        req.onerror = () => reject(req.error);
      });
    },
    { k: key, text: dummyText, dbName: DB_NAME, storeName: STORE_NAME, dbVersion: DB_VERSION },
  );
}

export async function getIndexedDBAudio(page: Page, key: string): Promise<string | null> {
  return page.evaluate(
    async ({ k, dbName, storeName, dbVersion }) => {
      return new Promise<string | null>((resolve, reject) => {
        const req = indexedDB.open(dbName, dbVersion);
        req.onsuccess = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(storeName)) {
            db.close();
            resolve(null);
            return;
          }
          const tx = db.transaction(storeName, 'readonly');
          const getReq = tx.objectStore(storeName).get(k);
          getReq.onsuccess = async () => {
            const blob = getReq.result as Blob | undefined;
            db.close();
            if (!blob) {
              resolve(null);
              return;
            }
            try {
              const text = await blob.text();
              resolve(text);
            } catch (err) {
              reject(err);
            }
          };
          getReq.onerror = () => {
            db.close();
            reject(getReq.error);
          };
          tx.onerror = () => {
            db.close();
            reject(tx.error);
          };
        };
        req.onerror = () => reject(req.error);
      });
    },
    { k: key, dbName: DB_NAME, storeName: STORE_NAME, dbVersion: DB_VERSION },
  );
}
