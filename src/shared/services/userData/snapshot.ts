/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { UserPraise, UserWord } from '../../types';
import { mergeRecords, mergeStamped, type Stamped, type Tombstones } from './merge';

export interface AudioRecord {
  /** `${locale}/${category}/${audioKey}`, the same key audio playback looks up. */
  key: string;
  updatedAt: number;
  blob: Blob;
}

export interface LocaleUserContent {
  words: UserWord[];
  praises: UserPraise[];
  deletedWords: Tombstones;
  deletedPraises: Tombstones;
}

/**
 * Everything a family stores on one device, in one shape. Backups serialize it
 * today; a cross-device sync can later exchange and merge the same shape.
 * Settings values stay as stored JSON and are validated when written back.
 */
export interface UserDataSnapshot {
  gameSettings: Stamped<unknown> | null;
  appSettings: Stamped<unknown> | null;
  content: Record<string, LocaleUserContent>;
  audio: { records: AudioRecord[]; deleted: Tombstones };
}

const emptyLocale = (): LocaleUserContent => ({ words: [], praises: [], deletedWords: {}, deletedPraises: {} });

export function mergeSnapshots(local: UserDataSnapshot, incoming: UserDataSnapshot): UserDataSnapshot {
  const content: Record<string, LocaleUserContent> = {};
  for (const locale of new Set([...Object.keys(local.content), ...Object.keys(incoming.content)])) {
    const mine = local.content[locale] ?? emptyLocale();
    const theirs = incoming.content[locale] ?? emptyLocale();
    const words = mergeRecords(
      { items: mine.words, deleted: mine.deletedWords },
      { items: theirs.words, deleted: theirs.deletedWords },
      word => word.id,
      word => word.updatedAt,
    );
    const praises = mergeRecords(
      { items: mine.praises, deleted: mine.deletedPraises },
      { items: theirs.praises, deleted: theirs.deletedPraises },
      praise => praise.id,
      praise => praise.updatedAt,
    );
    content[locale] = {
      words: [...words.items].sort(byOrder),
      praises: [...praises.items].sort(byOrder),
      deletedWords: words.deleted,
      deletedPraises: praises.deleted,
    };
  }
  const audio = mergeRecords(
    { items: local.audio.records, deleted: local.audio.deleted },
    { items: incoming.audio.records, deleted: incoming.audio.deleted },
    record => record.key,
    record => record.updatedAt,
  );
  return {
    gameSettings: mergeStamped(local.gameSettings, incoming.gameSettings),
    appSettings: mergeStamped(local.appSettings, incoming.appSettings),
    content,
    audio: { records: audio.items, deleted: audio.deleted },
  };
}

function byOrder(a: { order: number; id: string }, b: { order: number; id: string }) {
  return a.order - b.order || a.id.localeCompare(b.id);
}

export interface SnapshotSummary {
  recordings: number;
  customWords: number;
  customPraises: number;
}

/** What a parent recognizes in a backup before restoring it. */
export function summarizeSnapshot(snapshot: UserDataSnapshot): SnapshotSummary {
  const locales = Object.values(snapshot.content);
  return {
    recordings: snapshot.audio.records.length,
    customWords: locales.reduce((sum, locale) => sum + locale.words.filter(word => !word.isDefault).length, 0),
    customPraises: locales.reduce((sum, locale) => sum + locale.praises.filter(praise => !praise.isDefault).length, 0),
  };
}
