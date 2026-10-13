/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { UserPraise, UserWord } from '../../types';
import type { Stamped, Tombstones } from './merge';
import type { AudioRecord, LocaleUserContent, UserDataSnapshot } from './snapshot';

export const BACKUP_FORMAT = 'mudrolino-backup';
export const BACKUP_VERSION = 1;

interface BackupAudioRecord {
  key: string;
  updatedAt: number;
  type: string;
  data: string;
}

/** The backup file: a snapshot as JSON, with recordings base64-encoded. */
export interface BackupFileV1 {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  appVersion: string;
  gameSettings: Stamped<unknown> | null;
  appSettings: Stamped<unknown> | null;
  content: Record<string, LocaleUserContent>;
  audio: { records: BackupAudioRecord[]; deleted: Tombstones };
}

export class BackupFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupFormatError';
  }
}

// Audio keys are `${locale}/${category}/${audioKey}`; anything else is not ours.
const AUDIO_KEY = /^[a-z]{2,3}\/[a-z-]+\/[^/]{1,120}$/;
const LOCALE = /^[a-z]{2,3}$/;

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return btoa(binary);
}

function base64ToBlob(data: string, type: string): Blob {
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type });
}

export async function serializeBackup(snapshot: UserDataSnapshot, exportedAt: Date, appVersion: string): Promise<string> {
  const records: BackupAudioRecord[] = [];
  for (const record of snapshot.audio.records) {
    records.push({ key: record.key, updatedAt: record.updatedAt, type: record.blob.type || 'audio/wav', data: await blobToBase64(record.blob) });
  }
  const file: BackupFileV1 = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: exportedAt.toISOString(),
    appVersion,
    gameSettings: snapshot.gameSettings,
    appSettings: snapshot.appSettings,
    content: snapshot.content,
    audio: { records, deleted: snapshot.audio.deleted },
  };
  return JSON.stringify(file);
}

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const isStamp = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;

function parseTombstones(value: unknown): Tombstones {
  if (!isObject(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([, deletedAt]) => isStamp(deletedAt))) as Tombstones;
}

function parseStamped(value: unknown): Stamped<unknown> | null {
  if (!isObject(value) || !isObject(value.value)) return null;
  return { value: value.value, updatedAt: isStamp(value.updatedAt) ? value.updatedAt : 0 };
}

function isManaged(item: unknown): item is Record<string, unknown> {
  return isObject(item) && typeof item.id === 'string' && typeof item.audioKey === 'string'
    && typeof item.emoji === 'string' && typeof item.order === 'number' && typeof item.isDefault === 'boolean'
    && (item.status === 'draft' || item.status === 'ready');
}

function parseWords(value: unknown, locale: string): UserWord[] {
  if (!Array.isArray(value)) return [];
  return value.filter(item => isManaged(item) && typeof item.word === 'string' && typeof item.syllables === 'string')
    .map(item => ({ ...item, locale, enabled: item.enabled !== false }) as UserWord);
}

function parsePraises(value: unknown, locale: string): UserPraise[] {
  if (!Array.isArray(value)) return [];
  return value.filter(item => isManaged(item) && typeof item.text === 'string')
    .map(item => ({ ...item, locale, enabled: item.enabled !== false }) as UserPraise);
}

/** Reads a backup file, dropping anything malformed. Throws when it is not a Mudrolíno backup at all. */
export function parseBackup(text: string): { snapshot: UserDataSnapshot; exportedAt: Date | null } {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new BackupFormatError('not-json');
  }
  if (!isObject(raw) || raw.format !== BACKUP_FORMAT) throw new BackupFormatError('not-a-backup');
  if (raw.version !== BACKUP_VERSION) throw new BackupFormatError('unsupported-version');

  const content: Record<string, LocaleUserContent> = {};
  if (isObject(raw.content)) {
    for (const [locale, data] of Object.entries(raw.content)) {
      if (!LOCALE.test(locale) || !isObject(data)) continue;
      content[locale] = {
        words: parseWords(data.words, locale),
        praises: parsePraises(data.praises, locale),
        deletedWords: parseTombstones(data.deletedWords),
        deletedPraises: parseTombstones(data.deletedPraises),
      };
    }
  }

  const records: AudioRecord[] = [];
  const audio = isObject(raw.audio) ? raw.audio : {};
  if (Array.isArray(audio.records)) {
    for (const record of audio.records) {
      if (!isObject(record) || typeof record.key !== 'string' || !AUDIO_KEY.test(record.key) || record.key.includes('..')) continue;
      if (typeof record.data !== 'string' || typeof record.type !== 'string' || !record.type.startsWith('audio/')) continue;
      try {
        records.push({ key: record.key, updatedAt: isStamp(record.updatedAt) ? record.updatedAt : 0, blob: base64ToBlob(record.data, record.type) });
      } catch {
        // A damaged recording is skipped rather than failing the whole restore.
      }
    }
  }

  const exportedAt = typeof raw.exportedAt === 'string' && !Number.isNaN(Date.parse(raw.exportedAt)) ? new Date(raw.exportedAt) : null;
  return {
    snapshot: {
      gameSettings: parseStamped(raw.gameSettings),
      appSettings: parseStamped(raw.appSettings),
      content,
      audio: { records, deleted: parseTombstones(audio.deleted) },
    },
    exportedAt,
  };
}

export function backupFileName(date: Date): string {
  return `mudrolino-zaloha-${date.toISOString().slice(0, 10)}.json`;
}
