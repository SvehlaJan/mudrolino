import { describe, expect, it } from 'vitest';
import type { UserWord } from '../../types';
import { mergeRecords } from './merge';
import { mergeSnapshots, summarizeSnapshot, type UserDataSnapshot } from './snapshot';
import { BackupFormatError, parseBackup, serializeBackup } from './backupFile';

const word = (id: string, changes: Partial<UserWord> = {}): UserWord => ({
  id, word: id, syllables: id, emoji: '🍎', audioKey: `custom-${id}`, status: 'ready', enabled: true,
  isDefault: false, locale: 'sk', order: 0, ...changes,
});

const emptySnapshot = (): UserDataSnapshot => ({ gameSettings: null, appSettings: null, content: {}, audio: { records: [], deleted: {} } });

describe('mergeRecords', () => {
  const keyed = (items: UserWord[], deleted = {}) => ({ items, deleted });
  const merge = (local: ReturnType<typeof keyed>, incoming: ReturnType<typeof keyed>) =>
    mergeRecords(local, incoming, item => item.id, item => item.updatedAt);

  it('keeps records from both sides and the newer version of shared ones', () => {
    const result = merge(
      keyed([word('a', { word: 'old', updatedAt: 1 }), word('b')]),
      keyed([word('a', { word: 'new', updatedAt: 2 }), word('c')]),
    );
    expect(result.items.map(item => [item.id, item.word])).toEqual([['a', 'new'], ['b', 'b'], ['c', 'c']]);
  });

  it('keeps the local version when it is newer', () => {
    const result = merge(keyed([word('a', { word: 'mine', updatedAt: 5 })]), keyed([word('a', { word: 'theirs', updatedAt: 4 })]));
    expect(result.items[0].word).toBe('mine');
  });

  it('lets an incoming copy win a tie, so backups from before change stamps still restore', () => {
    const result = merge(keyed([word('a', { enabled: true })]), keyed([word('a', { enabled: false })]));
    expect(result.items[0].enabled).toBe(false);
  });

  it('removes records deleted on either side unless they changed after the deletion', () => {
    const result = merge(
      keyed([word('gone', { updatedAt: 3 }), word('revived', { updatedAt: 9 })]),
      keyed([], { gone: 4, revived: 5 }),
    );
    expect(result.items.map(item => item.id)).toEqual(['revived']);
    expect(result.deleted).toEqual({ gone: 4, revived: 5 });
  });

  it('keeps the latest deletion time for each record', () => {
    expect(merge(keyed([], { a: 7 }), keyed([], { a: 3, b: 1 })).deleted).toEqual({ a: 7, b: 1 });
  });
});

describe('mergeSnapshots', () => {
  it('merges content per locale, audio by key and settings by stamp', () => {
    const local = emptySnapshot();
    local.gameSettings = { value: { gridSize: 4 }, updatedAt: 10 };
    local.content.sk = { words: [word('a', { order: 2 })], praises: [], deletedWords: {}, deletedPraises: {} };
    local.audio.records = [{ key: 'sk/words/custom-a', updatedAt: 1, blob: new Blob(['a']) }];

    const incoming = emptySnapshot();
    incoming.gameSettings = { value: { gridSize: 8 }, updatedAt: 5 };
    incoming.appSettings = { value: { locale: 'cs', fontFamily: 'nunito' }, updatedAt: 1 };
    incoming.content.sk = { words: [word('b', { order: 1 })], praises: [], deletedWords: {}, deletedPraises: {} };
    incoming.content.cs = { words: [word('c', { locale: 'cs' })], praises: [], deletedWords: {}, deletedPraises: {} };
    incoming.audio.records = [{ key: 'sk/words/custom-b', updatedAt: 1, blob: new Blob(['b']) }];

    const merged = mergeSnapshots(local, incoming);
    expect(merged.gameSettings?.value).toEqual({ gridSize: 4 });
    expect(merged.appSettings?.value).toEqual({ locale: 'cs', fontFamily: 'nunito' });
    expect(merged.content.sk.words.map(item => item.id)).toEqual(['b', 'a']);
    expect(merged.content.cs.words.map(item => item.id)).toEqual(['c']);
    expect(merged.audio.records.map(record => record.key).sort()).toEqual(['sk/words/custom-a', 'sk/words/custom-b']);
  });

  it('summarizes what a parent will recognize', () => {
    const snapshot = emptySnapshot();
    snapshot.content.sk = { words: [word('a'), word('d', { isDefault: true })], praises: [], deletedWords: {}, deletedPraises: {} };
    snapshot.audio.records = [{ key: 'sk/letters/a', updatedAt: 0, blob: new Blob(['x']) }];
    expect(summarizeSnapshot(snapshot)).toEqual({ recordings: 1, customWords: 1, customPraises: 0 });
  });
});

describe('backup file', () => {
  it('round-trips settings, content and recordings byte for byte', async () => {
    const snapshot = emptySnapshot();
    snapshot.appSettings = { value: { locale: 'sk', fontFamily: 'shantell' }, updatedAt: 3 };
    snapshot.content.sk = { words: [word('a', { updatedAt: 2 })], praises: [], deletedWords: { x: 1 }, deletedPraises: {} };
    const bytes = new Uint8Array(70000).map((_, index) => index % 251);
    snapshot.audio.records = [{ key: 'sk/words/custom-a', updatedAt: 2, blob: new Blob([bytes], { type: 'audio/wav' }) }];

    const text = await serializeBackup(snapshot, new Date('2026-10-14T08:00:00Z'), 'abc1234');
    const { snapshot: restored, exportedAt } = parseBackup(text);

    expect(exportedAt?.toISOString()).toBe('2026-10-14T08:00:00.000Z');
    expect(restored.appSettings).toEqual(snapshot.appSettings);
    expect(restored.content.sk.words).toEqual(snapshot.content.sk.words);
    expect(restored.content.sk.deletedWords).toEqual({ x: 1 });
    expect(restored.audio.records[0].blob.type).toBe('audio/wav');
    expect(new Uint8Array(await restored.audio.records[0].blob.arrayBuffer())).toEqual(bytes);
  });

  it('rejects files that are not Mudrolíno backups', () => {
    expect(() => parseBackup('not json')).toThrow(BackupFormatError);
    expect(() => parseBackup(JSON.stringify({ format: 'other' }))).toThrow(BackupFormatError);
    expect(() => parseBackup(JSON.stringify({ format: 'mudrolino-backup', version: 99 }))).toThrow(BackupFormatError);
  });

  it('drops malformed records and foreign audio keys instead of restoring them', () => {
    const { snapshot } = parseBackup(JSON.stringify({
      format: 'mudrolino-backup',
      version: 1,
      content: { sk: { words: [word('ok'), { id: 'broken' }], praises: 'nope' }, '../x': { words: [word('evil')] } },
      audio: { records: [
        { key: 'sk/words/custom-ok', updatedAt: 1, type: 'audio/wav', data: btoa('ok') },
        { key: '../../etc', updatedAt: 1, type: 'audio/wav', data: btoa('x') },
        { key: 'sk/words/script', updatedAt: 1, type: 'text/html', data: btoa('<script>') },
      ], deleted: { 'sk/words/old': 4, bad: 'yesterday' } },
    }));
    expect(snapshot.content.sk.words.map(item => item.id)).toEqual(['ok']);
    expect(snapshot.content.sk.praises).toEqual([]);
    expect(Object.keys(snapshot.content)).toEqual(['sk']);
    expect(snapshot.audio.records.map(record => record.key)).toEqual(['sk/words/custom-ok']);
    expect(snapshot.audio.deleted).toEqual({ 'sk/words/old': 4 });
  });
});
