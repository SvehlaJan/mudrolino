/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/** Record id (or audio key) → time it was deleted, in epoch milliseconds. */
export type Tombstones = Record<string, number>;

/** A stored value with the time it last changed; legacy values without a stamp count as 0. */
export interface Stamped<T> {
  value: T;
  updatedAt: number;
}

/** True when the incoming version should replace the local one. Ties go to incoming,
 * so restoring a backup made before stamps existed still restores it. */
export function incomingWins(localUpdatedAt: number | undefined, incomingUpdatedAt: number | undefined): boolean {
  return (incomingUpdatedAt ?? 0) >= (localUpdatedAt ?? 0);
}

export function mergeTombstones(local: Tombstones, incoming: Tombstones): Tombstones {
  const merged: Tombstones = { ...local };
  for (const [id, deletedAt] of Object.entries(incoming)) {
    if (!(id in merged) || deletedAt > merged[id]) merged[id] = deletedAt;
  }
  return merged;
}

/**
 * Merges two copies of a keyed collection: the newer version of each record
 * wins, and a deletion removes every version that is not newer than it. This is
 * the rule a future cross-device sync applies too, so backups and sync agree.
 */
export function mergeRecords<T>(
  local: { items: T[]; deleted: Tombstones },
  incoming: { items: T[]; deleted: Tombstones },
  keyOf: (item: T) => string,
  updatedAtOf: (item: T) => number | undefined,
): { items: T[]; deleted: Tombstones } {
  const deleted = mergeTombstones(local.deleted, incoming.deleted);
  const byKey = new Map<string, T>();
  for (const item of local.items) byKey.set(keyOf(item), item);
  for (const item of incoming.items) {
    const current = byKey.get(keyOf(item));
    if (!current || incomingWins(updatedAtOf(current), updatedAtOf(item))) byKey.set(keyOf(item), item);
  }
  const items = [...byKey.values()].filter(item => {
    const deletedAt = deleted[keyOf(item)];
    return deletedAt === undefined || deletedAt < (updatedAtOf(item) ?? 0);
  });
  return { items, deleted };
}

export function mergeStamped<T>(local: Stamped<T> | null, incoming: Stamped<T> | null): Stamped<T> | null {
  if (!incoming) return local;
  if (!local) return incoming;
  return incomingWins(local.updatedAt, incoming.updatedAt) ? incoming : local;
}
