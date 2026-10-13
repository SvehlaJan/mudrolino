/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { Button, Card } from '../shared/ui';
import { useContent } from '../shared/contexts/ContentContext';
import { formatUiCopy, getUiCopy } from '../shared/uiCopy';
import { isStoragePersisted } from '../shared/services/storagePersistence';
import { backupFileName, BackupFormatError, parseBackup, serializeBackup } from '../shared/services/userData/backupFile';
import { readLocalUserData, restoreUserData } from '../shared/services/userData/localUserData';
import { summarizeSnapshot, type UserDataSnapshot } from '../shared/services/userData/snapshot';

type BackupState =
  | { kind: 'idle' }
  | { kind: 'busy'; message: string }
  | { kind: 'prepared'; file: File }
  | { kind: 'review'; snapshot: UserDataSnapshot; summary: string }
  | { kind: 'done'; message: string }
  | { kind: 'error'; message: string };

function saveByDownload(file: File) {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

interface BackupCardProps {
  /** Called after a restore wrote settings, so the app can reload them. */
  onRestored(): void;
}

export function BackupCard({ onRestored }: BackupCardProps) {
  const { locale, reloadContent } = useContent();
  const copy = (key: Parameters<typeof getUiCopy>[1]) => getUiCopy(locale, key);
  const [state, setState] = useState<BackupState>({ kind: 'idle' });
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    void isStoragePersisted().then(value => { if (active) setPersisted(value); });
    return () => { active = false; };
  }, []);

  async function prepareBackup() {
    setState({ kind: 'busy', message: copy('parent.backup.preparing') });
    try {
      const now = new Date();
      const text = await serializeBackup(await readLocalUserData(), now, __APP_VERSION__);
      const file = new File([text], backupFileName(now), { type: 'application/json' });
      if (navigator.canShare?.({ files: [file] })) {
        // Sharing needs a fresh tap: preparing a large backup can outlast the
        // first tap's permission, so the parent confirms with a second one.
        setState({ kind: 'prepared', file });
      } else {
        saveByDownload(file);
        setState({ kind: 'done', message: copy('parent.backup.exported') });
      }
    } catch {
      setState({ kind: 'error', message: copy('parent.backup.exportFailed') });
    }
  }

  async function shareBackup(file: File) {
    try {
      await navigator.share({ files: [file], title: file.name });
      setState({ kind: 'done', message: copy('parent.backup.exported') });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      saveByDownload(file);
      setState({ kind: 'done', message: copy('parent.backup.exported') });
    }
  }

  async function reviewBackup(file: File) {
    try {
      const { snapshot, exportedAt } = parseBackup(await file.text());
      const summary = summarizeSnapshot(snapshot);
      const date = exportedAt
        ? new Intl.DateTimeFormat(locale === 'cs' ? 'cs-CZ' : 'sk-SK', { dateStyle: 'medium', timeStyle: 'short' }).format(exportedAt)
        : '—';
      setState({
        kind: 'review',
        snapshot,
        summary: formatUiCopy(locale, 'parent.backup.summary', {
          date, recordings: summary.recordings, words: summary.customWords, praises: summary.customPraises,
        }),
      });
    } catch (error) {
      setState({ kind: 'error', message: copy(error instanceof BackupFormatError ? 'parent.backup.invalid' : 'parent.backup.restoreFailed') });
    }
  }

  async function restore(snapshot: UserDataSnapshot) {
    setState({ kind: 'busy', message: copy('parent.backup.restoring') });
    try {
      await restoreUserData(snapshot);
      await reloadContent();
      onRestored();
      setState({ kind: 'done', message: copy('parent.backup.restored') });
    } catch {
      setState({ kind: 'error', message: copy('parent.backup.restoreFailed') });
    }
  }

  const busy = state.kind === 'busy';
  return (
    <Card className="mt-5 sm:mt-6">
      <h3 className="text-xl font-bold sm:text-2xl">{copy('parent.backup.title')}</h3>
      <p className="mt-1 text-sm font-medium text-text-muted sm:text-base">{copy('parent.backup.description')}</p>
      {persisted !== null && (
        <p className="mt-2 text-sm font-medium text-text-muted sm:text-base" data-testid="storage-persistence">
          {copy(persisted ? 'parent.backup.persisted' : 'parent.backup.notPersisted')}
        </p>
      )}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Button tone="primary" size="parent" fullWidth disabled={busy} icon={<Download size={18} aria-hidden="true" />}
          onClick={() => void prepareBackup()}>
          {copy('parent.backup.export')}
        </Button>
        <Button tone="neutral" size="parent" fullWidth disabled={busy} icon={<Upload size={18} aria-hidden="true" />}
          onClick={() => fileInput.current?.click()}>
          {copy('parent.backup.import')}
        </Button>
      </div>
      <input
        ref={fileInput}
        type="file"
        accept=".json,application/json"
        aria-label={copy('parent.backup.fileLabel')}
        className="sr-only"
        tabIndex={-1}
        onChange={event => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void reviewBackup(file);
        }}
      />
      {state.kind === 'prepared' && (
        <div className="mt-3">
          <Button tone="primary" size="parent" fullWidth onClick={() => void shareBackup(state.file)}>
            {copy('parent.backup.saveFile')}
          </Button>
        </div>
      )}
      {state.kind === 'review' && (
        <div className="mt-4 rounded-2xl bg-bg-light p-4" data-testid="backup-review">
          <p className="text-sm font-bold text-text-main sm:text-base">{state.summary}</p>
          <p className="mt-1 text-sm font-medium text-text-muted">{copy('parent.backup.mergeHint')}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Button tone="primary" size="parent" fullWidth onClick={() => void restore(state.snapshot)}>
              {copy('parent.backup.confirm')}
            </Button>
            <Button tone="neutral" size="parent" fullWidth onClick={() => setState({ kind: 'idle' })}>
              {copy('parent.backup.cancel')}
            </Button>
          </div>
        </div>
      )}
      <p role="status" aria-live="polite" className="mt-3 text-sm font-bold text-text-main empty:hidden">
        {(state.kind === 'busy' || state.kind === 'done') && state.message}
      </p>
      {state.kind === 'error' && (
        <p role="alert" className="mt-3 rounded-2xl bg-red-100 px-4 py-3 text-sm font-bold text-red-800">{state.message}</p>
      )}
    </Card>
  );
}
