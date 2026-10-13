/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Tombstones } from './merge';

/**
 * When each piece of family data last changed, and which records were deleted.
 * Backups merge with it today and a cross-device sync can reuse it later.
 * It lives in localStorage beside the data so the recordings database keeps
 * its schema; losing it only makes old changes count as oldest.
 */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export type SettingsDocument = 'gameSettings' | 'appSettings';
export type ContentKind = 'words' | 'praises';

const SETTINGS_STAMPS_KEY = 'hrave-ucenie-change-stamps';
const AUDIO_STAMPS_KEY = 'hrave-ucenie-audio-stamps';
export const contentDeletionsKey = (locale: string) => `hrave-ucenie-deleted-${locale}`;

function defaultStorage(): KeyValueStorage | null {
  try {
    return typeof globalThis.localStorage === 'undefined' ? null : globalThis.localStorage;
  } catch {
    return null;
  }
}

function readObject(storage: KeyValueStorage | null, key: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(storage?.getItem(key) ?? '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function stamps(value: unknown): Tombstones {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([, at]) => typeof at === 'number' && Number.isFinite(at))) as Tombstones;
}

function writeObject(storage: KeyValueStorage | null, key: string, value: object): void {
  try {
    storage?.setItem(key, JSON.stringify(value));
  } catch {
    // Metadata is advisory; the data itself is already saved.
  }
}

export function readSettingsStamp(name: SettingsDocument, storage = defaultStorage()): number {
  const at = readObject(storage, SETTINGS_STAMPS_KEY)[name];
  return typeof at === 'number' && Number.isFinite(at) ? at : 0;
}

export function writeSettingsStamp(name: SettingsDocument, at: number, storage = defaultStorage()): void {
  writeObject(storage, SETTINGS_STAMPS_KEY, { ...readObject(storage, SETTINGS_STAMPS_KEY), [name]: at });
}

export interface AudioStamps {
  updated: Tombstones;
  deleted: Tombstones;
}

export function readAudioStamps(storage = defaultStorage()): AudioStamps {
  const raw = readObject(storage, AUDIO_STAMPS_KEY);
  return { updated: stamps(raw.updated), deleted: stamps(raw.deleted) };
}

export function writeAudioStamps(value: AudioStamps, storage = defaultStorage()): void {
  writeObject(storage, AUDIO_STAMPS_KEY, value);
}

export function stampAudioSaved(key: string, at: number, storage = defaultStorage()): void {
  const current = readAudioStamps(storage);
  const deleted = { ...current.deleted };
  delete deleted[key];
  writeAudioStamps({ updated: { ...current.updated, [key]: at }, deleted }, storage);
}

export function stampAudioDeleted(key: string, at: number, storage = defaultStorage()): void {
  const current = readAudioStamps(storage);
  const updated = { ...current.updated };
  delete updated[key];
  writeAudioStamps({ updated, deleted: { ...current.deleted, [key]: at } }, storage);
}

export function readContentDeletions(locale: string, storage = defaultStorage()): Record<ContentKind, Tombstones> {
  const raw = readObject(storage, contentDeletionsKey(locale));
  return { words: stamps(raw.words), praises: stamps(raw.praises) };
}

export function writeContentDeletions(locale: string, value: Record<ContentKind, Tombstones>, storage = defaultStorage()): void {
  writeObject(storage, contentDeletionsKey(locale), value);
}

export function recordContentDeletion(locale: string, kind: ContentKind, id: string, at: number, storage = defaultStorage()): void {
  const current = readContentDeletions(locale, storage);
  writeContentDeletions(locale, { ...current, [kind]: { ...current[kind], [id]: at } }, storage);
}
