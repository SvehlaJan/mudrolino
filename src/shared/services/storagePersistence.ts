/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

type PersistentStorage = Pick<StorageManager, 'persist' | 'persisted'>;

function storageManager(): PersistentStorage | null {
  const storage = typeof navigator === 'undefined' ? undefined : navigator.storage;
  return storage && typeof storage.persist === 'function' && typeof storage.persisted === 'function' ? storage : null;
}

let requested = false;

/**
 * Asks the browser not to evict family data under storage pressure (Safari can
 * otherwise clear a non-installed site after seven days without use). Called
 * after a parent saves something, so Firefox's one-time prompt has a reason;
 * asked at most once per session. Returns null when the browser cannot tell.
 */
export async function requestPersistentStorage(storage: PersistentStorage | null = storageManager()): Promise<boolean | null> {
  if (!storage) return null;
  try {
    if (await storage.persisted()) return true;
    if (requested) return false;
    requested = true;
    return await storage.persist();
  } catch {
    return null;
  }
}

/** Whether the browser currently protects family data from eviction; null when it cannot tell. */
export async function isStoragePersisted(storage: PersistentStorage | null = storageManager()): Promise<boolean | null> {
  if (!storage) return null;
  try {
    return await storage.persisted();
  } catch {
    return null;
  }
}
