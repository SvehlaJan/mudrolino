import { Page } from '@playwright/test';

export async function seedLocalStorage(page: Page, data: Record<string, unknown>) {
  await page.addInitScript((items) => {
    for (const [k, v] of Object.entries(items)) {
      if (k === 'indexedDBAudio') continue;
      window.localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
    }
  }, data);
}

export const DB_NAME = 'hrave-ucenie-audio-overrides';
export const STORE_NAME = 'overrides';
export const DB_VERSION = 1;

export interface IndexedDBAudioFixture {
  key: string;
  text: string;
}

export async function seedIndexedDBAudioFixture(
  page: Page,
  data: Record<string, unknown>,
): Promise<IndexedDBAudioFixture> {
  const fixture = data.indexedDBAudio;
  if (!fixture || typeof fixture !== 'object' || !('key' in fixture) || !('text' in fixture)) {
    throw new Error('Fixture is missing indexedDBAudio { key, text } descriptor');
  }
  const descriptor = fixture as IndexedDBAudioFixture;
  await seedIndexedDBAudio(page, descriptor.key, descriptor.text);
  return descriptor;
}

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
