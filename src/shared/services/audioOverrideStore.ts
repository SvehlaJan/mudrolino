/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { requestPersistentStorage } from './storagePersistence';
import { readAudioStamps, stampAudioDeleted, stampAudioSaved, writeAudioStamps } from './userData/syncMetadata';
import type { Tombstones } from './userData/merge';
import type { AudioRecord } from './userData/snapshot';

const DB_NAME = 'hrave-ucenie-audio-overrides';
const STORE_NAME = 'overrides';
const DB_VERSION = 1;

export interface AudioOverrideStore {
  get(key: string): Promise<Blob | null>;
  set(key: string, blob: Blob): Promise<void>;
  delete(key: string): Promise<void>;
  listKeys(): Promise<string[]>;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

class IndexedDBOverrideStore implements AudioOverrideStore {
  async get(key: string): Promise<Blob | null> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = () => resolve((req.result as Blob) ?? null);
      req.onerror = () => reject(req.error);
    });
  }

  async set(key: string, blob: Blob): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const req = tx.objectStore(STORE_NAME).put(blob, key);
      req.onsuccess = () => { stampAudioSaved(key, Date.now()); void requestPersistentStorage(); resolve(); };
      req.onerror = () => reject(req.error);
    });
  }

  async delete(key: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const req = tx.objectStore(STORE_NAME).delete(key);
      req.onsuccess = () => { stampAudioDeleted(key, Date.now()); resolve(); };
      req.onerror = () => reject(req.error);
    });
  }

  async listKeys(): Promise<string[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAllKeys();
      req.onsuccess = () => resolve(req.result as string[]);
      req.onerror = () => reject(req.error);
    });
  }

  /** Every recording with its change stamp, plus deleted keys, for backups and future sync. */
  async readAll(): Promise<{ records: AudioRecord[]; deleted: Tombstones }> {
    const db = await openDB();
    const entries = await new Promise<Array<[string, Blob]>>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const keysRequest = store.getAllKeys();
      const valuesRequest = store.getAll();
      tx.oncomplete = () => resolve((keysRequest.result as string[]).map((key, index) => [key, valuesRequest.result[index] as Blob]));
      tx.onerror = () => reject(tx.error);
    });
    const stamps = readAudioStamps();
    return {
      records: entries.map(([key, blob]) => ({ key, blob, updatedAt: stamps.updated[key] ?? 0 })),
      deleted: stamps.deleted,
    };
  }

  /** Replaces every recording with an already merged set in one transaction, so a failed restore changes nothing. */
  async replaceAll(records: AudioRecord[], deleted: Tombstones): Promise<void> {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.clear();
      for (const record of records) store.put(record.blob, record.key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    writeAudioStamps({ updated: Object.fromEntries(records.map(record => [record.key, record.updatedAt])), deleted });
  }
}

export const audioOverrideStore = new IndexedDBOverrideStore();
