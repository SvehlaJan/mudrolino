/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit3, EyeOff, Trash2 } from 'lucide-react';
import { useContent } from '../shared/contexts/ContentContext';
import { getLocaleContent } from '../shared/contentRegistry';
import { audioOverrideStore } from '../shared/services/audioOverrideStore';
import { useAppScreenLayout } from '../shared/ui/appScreenLayout';
import {
  AlertDialogShell,
  AppScreen,
  BackButton,
  Button,
  Card,
  DialogShell,
  PageHeader,
  TabPanel,
  TopBar,
  cn,
} from '../shared/ui';
import type { IconMenuAction } from '../shared/ui';
import { ContentCategoryNav } from './ContentCategoryNav';
import { ContentItemList } from './ContentItemList';
import type { ContentRow } from './ContentItemList';
import { WordEditor } from './WordEditor';
import { PraiseEditor } from './PraiseEditor';
import { canDisableOrDelete, LAST_PLAYABLE_MESSAGE } from './contentState';
import type { UserPraise, UserWord } from '../shared/types';

type Section = 'letters' | 'numbers' | 'phrases' | 'words' | 'praise';

const SECTION_LABELS: Record<Section, string> = {
  letters: 'Písmená',
  numbers: 'Čísla',
  phrases: 'Frázy',
  words: 'Slová',
  praise: 'Pochvaly',
};

const SECTIONS: Section[] = ['letters', 'numbers', 'phrases', 'words', 'praise'];

const FULLSCREEN_DIALOG_CLASS =
  'left-0 top-0 h-[100svh] max-h-[100svh] w-screen max-w-none translate-x-0 translate-y-0 rounded-none';

type EditorTarget =
  | { kind: 'word'; mode: 'add' }
  | { kind: 'word'; mode: 'edit'; id: string }
  | { kind: 'praise'; mode: 'add' }
  | { kind: 'praise'; mode: 'edit'; id: string };

type PendingDelete =
  | { kind: 'word'; item: UserWord }
  | { kind: 'praise'; item: UserPraise };

interface UndoNotice {
  message: string;
  onUndo: () => void;
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => (
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false
  ));
  useEffect(() => {
    const mql = window.matchMedia(query);
    const handleChange = () => setMatches(mql.matches);
    handleChange();
    mql.addEventListener('change', handleChange);
    return () => mql.removeEventListener('change', handleChange);
  }, [query]);
  return matches;
}

function buildSystemRows(locale: string, section: 'letters' | 'numbers' | 'phrases'): ContentRow[] {
  const content = getLocaleContent(locale);
  if (section === 'letters') {
    return content.letterItems.map(letter => ({
      id: `letter:${letter.audioKey}`,
      storeKey: `${locale}/letters/${letter.audioKey}`,
      label: letter.label ? `${letter.symbol} — ${letter.label} ${letter.emoji}` : `${letter.symbol} ${letter.emoji}`,
      searchText: `${letter.symbol} ${letter.label}`,
    }));
  }
  if (section === 'numbers') {
    return content.numberItems.map(number => ({
      id: `number:${number.audioKey}`,
      storeKey: `${locale}/numbers/${number.audioKey}`,
      label: String(number.value),
      searchText: String(number.value),
    }));
  }
  return Object.entries(content.audioPhrases).map(([phraseKey, phrase]) => ({
    id: `phrase:${phrase.audioKey}`,
    storeKey: `${locale}/phrases/${phrase.audioKey}`,
    label: `${phraseKey}: ${phrase.text}`,
    searchText: `${phraseKey} ${phrase.text}`,
  }));
}

function describePendingDelete(pending: PendingDelete): string {
  const label = pending.kind === 'word' ? pending.item.word : pending.item.text;
  return `„${label}“ sa odstráni zo zoznamu aj s nahraným zvukom. Túto akciu môžeš hneď potom vrátiť späť.`;
}

function currentMenuTrigger(): HTMLElement | null {
  return document.querySelector<HTMLElement>('button[aria-label="Ďalšie možnosti"][data-state="open"]')
    ?? document.activeElement as HTMLElement | null;
}

export function CustomContentScreen() {
  const {
    locale,
    allUserWords,
    allUserPraises,
    addWord,
    updateWord,
    deleteWord,
    setDefaultWordEnabled,
    restoreAllDefaultWords,
    addPraise,
    updatePraise,
    deletePraise,
    setDefaultPraiseEnabled,
    restoreAllDefaultPraises,
  } = useContent();
  const navigate = useNavigate();
  const { layout } = useAppScreenLayout();
  const isSpaciousWidth = useMediaQuery('(min-width: 1280px)');
  const isMediumWidth = useMediaQuery('(min-width: 768px)');
  const layoutMode: 'spacious' | 'medium' | 'compact' =
    layout === 'short' ? 'compact' : isSpaciousWidth ? 'spacious' : isMediumWidth ? 'medium' : 'compact';
  const navOrientation = layoutMode === 'compact' ? 'horizontal' : 'vertical';

  const [activeSection, setActiveSection] = useState<Section>('letters');
  const [editor, setEditor] = useState<EditorTarget | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [undoNotice, setUndoNotice] = useState<UndoNotice | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorRestoreFocusRef = useRef<HTMLElement | null>(null);
  const deleteRestoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => () => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
  }, []);

  const scheduleUndo = useCallback((message: string, onUndo: () => void) => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndoNotice({ message, onUndo });
    undoTimerRef.current = setTimeout(() => setUndoNotice(null), 6000);
  }, []);

  const dismissUndo = useCallback(() => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndoNotice(null);
  }, []);

  // ── Words ────────────────────────────────────────────────────────────────
  const enabledWords = allUserWords.filter(word => word.enabled);
  const disabledWords = allUserWords.filter(word => word.isDefault && !word.enabled);
  const readyWordCount = allUserWords.filter(word => word.enabled && word.status === 'ready').length;

  const requestDisableWord = useCallback(async (word: UserWord) => {
    try {
      await setDefaultWordEnabled(word.id, false);
      setActionNotice(`Slovo „${word.word}“ je vypnuté.`);
    } catch {
      setActionNotice('Slovo sa nepodarilo vypnúť. Skúste to znova.');
    }
  }, [setDefaultWordEnabled]);

  const requestRestoreWord = useCallback(async (id: string) => {
    try {
      await setDefaultWordEnabled(id, true);
      setActionNotice(null);
    } catch {
      setActionNotice('Slovo sa nepodarilo obnoviť. Skúste to znova.');
    }
  }, [setDefaultWordEnabled]);

  const requestRestoreAllWords = useCallback(async () => {
    try {
      await restoreAllDefaultWords();
      setActionNotice('Predvolené slová boli obnovené.');
    } catch {
      setActionNotice('Predvolené slová sa nepodarilo obnoviť. Skúste to znova.');
    }
  }, [restoreAllDefaultWords]);

  const requestDeleteWord = useCallback((word: UserWord) => {
    deleteRestoreFocusRef.current = currentMenuTrigger();
    setPendingDelete({ kind: 'word', item: word });
  }, []);

  const requestEditWord = useCallback((word: UserWord) => {
    editorRestoreFocusRef.current = currentMenuTrigger();
    setEditor({ kind: 'word', mode: 'edit', id: word.id });
  }, []);

  const buildWordRow = useCallback((word: UserWord): ContentRow => {
    const canRemove = canDisableOrDelete(allUserWords, word.id);
    const menuActions: IconMenuAction[] = word.isDefault
      ? [{
          label: 'Vypnúť',
          icon: <EyeOff size={16} />,
          tone: 'danger',
          disabled: !canRemove,
          onSelect: () => void requestDisableWord(word),
        }]
      : [
          { label: 'Upraviť', icon: <Edit3 size={16} />, onSelect: () => requestEditWord(word) },
          {
            label: 'Zmazať',
            icon: <Trash2 size={16} />,
            tone: 'danger',
            disabled: !canRemove,
            onSelect: () => requestDeleteWord(word),
          },
        ];
    return {
      id: word.id,
      storeKey: `${locale}/words/${word.audioKey}`,
      label: `${word.word} ${word.emoji}${word.status === 'draft' ? ' ·' : ''}`,
      secondaryLabel: word.syllables.toUpperCase(),
      statusLabel: word.isDefault ? 'Predvolené' : word.status === 'draft' ? 'Koncept' : 'Vlastné',
      statusTone: word.status === 'draft' ? 'draft' : word.isDefault ? 'default' : 'ready',
      allowPlay: word.status === 'ready',
      recordEmphasis: word.status === 'draft',
      menuActions,
      searchText: `${word.word} ${word.syllables}`,
    };
  }, [allUserWords, locale, requestDisableWord, requestEditWord, requestDeleteWord]);

  const wordRows = enabledWords.map(buildWordRow);
  const disabledWordRows: ContentRow[] = disabledWords.map(word => ({
    id: word.id,
    storeKey: `${locale}/words/${word.audioKey}`,
    label: `${word.word} ${word.emoji}`,
    secondaryLabel: word.syllables.toUpperCase(),
    searchText: `${word.word} ${word.syllables}`,
  }));

  // ── Praise ───────────────────────────────────────────────────────────────
  const enabledPraises = allUserPraises.filter(praise => praise.enabled);
  const disabledPraises = allUserPraises.filter(praise => praise.isDefault && !praise.enabled);
  const readyPraiseCount = allUserPraises.filter(praise => praise.enabled && praise.status === 'ready').length;

  const requestDisablePraise = useCallback(async (praise: UserPraise) => {
    try {
      await setDefaultPraiseEnabled(praise.id, false);
      setActionNotice(`Pochvala „${praise.text}“ je vypnutá.`);
    } catch {
      setActionNotice('Pochvalu sa nepodarilo vypnúť. Skúste to znova.');
    }
  }, [setDefaultPraiseEnabled]);

  const requestRestorePraise = useCallback(async (id: string) => {
    try {
      await setDefaultPraiseEnabled(id, true);
      setActionNotice(null);
    } catch {
      setActionNotice('Pochvalu sa nepodarilo obnoviť. Skúste to znova.');
    }
  }, [setDefaultPraiseEnabled]);

  const requestRestoreAllPraises = useCallback(async () => {
    try {
      await restoreAllDefaultPraises();
      setActionNotice('Predvolené pochvaly boli obnovené.');
    } catch {
      setActionNotice('Predvolené pochvaly sa nepodarilo obnoviť. Skúste to znova.');
    }
  }, [restoreAllDefaultPraises]);

  const requestDeletePraise = useCallback((praise: UserPraise) => {
    deleteRestoreFocusRef.current = currentMenuTrigger();
    setPendingDelete({ kind: 'praise', item: praise });
  }, []);

  const requestEditPraise = useCallback((praise: UserPraise) => {
    editorRestoreFocusRef.current = currentMenuTrigger();
    setEditor({ kind: 'praise', mode: 'edit', id: praise.id });
  }, []);

  const buildPraiseRow = useCallback((praise: UserPraise): ContentRow => {
    const canRemove = canDisableOrDelete(allUserPraises, praise.id);
    const menuActions: IconMenuAction[] = praise.isDefault
      ? [{
          label: 'Vypnúť',
          icon: <EyeOff size={16} />,
          tone: 'danger',
          disabled: !canRemove,
          onSelect: () => void requestDisablePraise(praise),
        }]
      : [
          { label: 'Upraviť', icon: <Edit3 size={16} />, onSelect: () => requestEditPraise(praise) },
          {
            label: 'Zmazať',
            icon: <Trash2 size={16} />,
            tone: 'danger',
            disabled: !canRemove,
            onSelect: () => requestDeletePraise(praise),
          },
        ];
    return {
      id: praise.id,
      storeKey: `${locale}/praise/${praise.audioKey}`,
      label: `${praise.emoji} ${praise.text}${praise.status === 'draft' ? ' ·' : ''}`,
      statusLabel: praise.isDefault ? 'Predvolené' : praise.status === 'draft' ? 'Koncept' : 'Vlastné',
      statusTone: praise.status === 'draft' ? 'draft' : praise.isDefault ? 'default' : 'ready',
      allowPlay: praise.status === 'ready',
      recordEmphasis: praise.status === 'draft',
      menuActions,
      searchText: praise.text,
    };
  }, [allUserPraises, locale, requestDisablePraise, requestEditPraise, requestDeletePraise]);

  const praiseRows = enabledPraises.map(buildPraiseRow);
  const disabledPraiseRows: ContentRow[] = disabledPraises.map(praise => ({
    id: praise.id,
    storeKey: `${locale}/praise/${praise.audioKey}`,
    label: `${praise.emoji} ${praise.text}`,
    searchText: praise.text,
  }));

  const restoreUndoWord = useCallback(async (word: UserWord, audioBlob: Blob | null) => {
    let restored: UserWord | null = null;
    const audioKey = `custom-${crypto.randomUUID()}`;
    try {
      restored = await addWord({ word: word.word, syllables: word.syllables, emoji: word.emoji, audioKey, isDefault: false });
      if (audioBlob) {
        await audioOverrideStore.set(`${locale}/words/${audioKey}`, audioBlob);
        await updateWord(restored.id, { status: 'ready' });
      }
    } catch {
      if (restored) {
        await audioOverrideStore.delete(`${locale}/words/${audioKey}`).catch(() => undefined);
        await deleteWord(restored.id).catch(() => undefined);
      }
      setActionNotice('Obnovenie položky sa nepodarilo dokončiť. Skúste to znova.');
    }
  }, [addWord, deleteWord, locale, updateWord]);

  const restoreUndoPraise = useCallback(async (praise: UserPraise, audioBlob: Blob | null) => {
    let restored: UserPraise | null = null;
    const audioKey = `custom-${crypto.randomUUID()}`;
    try {
      restored = await addPraise({ text: praise.text, emoji: praise.emoji, audioKey, isDefault: false });
      if (audioBlob) {
        await audioOverrideStore.set(`${locale}/praise/${audioKey}`, audioBlob);
        await updatePraise(restored.id, { status: 'ready' });
      }
    } catch {
      if (restored) {
        await audioOverrideStore.delete(`${locale}/praise/${audioKey}`).catch(() => undefined);
        await deletePraise(restored.id).catch(() => undefined);
      }
      setActionNotice('Obnovenie položky sa nepodarilo dokončiť. Skúste to znova.');
    }
  }, [addPraise, deletePraise, locale, updatePraise]);

  // ── Deletion confirm + undo ─────────────────────────────────────────────
  const confirmPendingDelete = useCallback(async () => {
    if (!pendingDelete) return;
    const pending = pendingDelete;
    setPendingDelete(null);
    if (pending.kind === 'word') {
      const word = pending.item;
      const storeKey = `${locale}/words/${word.audioKey}`;
      try {
        const audioBlob = await audioOverrideStore.get(storeKey);
        await deleteWord(word.id);
        scheduleUndo(`Slovo „${word.word}“ bolo zmazané.`, () => { void restoreUndoWord(word, audioBlob); });
      } catch {
        setActionNotice('Položku sa nepodarilo zmazať. Skúste to znova.');
        return;
      }
    } else {
      const praise = pending.item;
      const storeKey = `${locale}/praise/${praise.audioKey}`;
      try {
        const audioBlob = await audioOverrideStore.get(storeKey);
        await deletePraise(praise.id);
        scheduleUndo(`Pochvala „${praise.text}“ bola zmazaná.`, () => { void restoreUndoPraise(praise, audioBlob); });
      } catch {
        setActionNotice('Položku sa nepodarilo zmazať. Skúste to znova.');
        return;
      }
    }
  }, [pendingDelete, locale, deleteWord, deletePraise, restoreUndoWord, restoreUndoPraise, scheduleUndo]);

  // ── Editor ───────────────────────────────────────────────────────────────
  const editingWord = editor?.kind === 'word' && editor.mode === 'edit'
    ? allUserWords.find(word => word.id === editor.id)
    : undefined;
  const editingPraise = editor?.kind === 'praise' && editor.mode === 'edit'
    ? allUserPraises.find(praise => praise.id === editor.id)
    : undefined;

  const editorTitle = !editor
    ? ''
    : editor.kind === 'word'
      ? (editor.mode === 'edit' ? 'Upraviť slovo' : 'Pridať slovo')
      : (editor.mode === 'edit' ? 'Upraviť pochvalu' : 'Pridať pochvalu');

  function renderEditor() {
    if (!editor) return null;
    if (editor.kind === 'word') {
      return (
        <WordEditor
          key={editor.mode === 'edit' ? editor.id : 'add-word'}
          mode={editor.mode}
          initialValues={editingWord ? { word: editingWord.word, syllables: editingWord.syllables, emoji: editingWord.emoji } : undefined}
          existingWords={allUserWords}
          editingId={editor.mode === 'edit' ? editor.id : undefined}
          onCancel={() => setEditor(null)}
          onSubmit={async values => {
            try {
              if (editor.mode === 'edit') {
                await updateWord(editor.id, values);
              } else {
                const audioKey = `custom-${crypto.randomUUID()}`;
                await addWord({ ...values, audioKey, isDefault: false });
              }
              setEditor(null);
              setActionNotice(null);
            } catch {
              setActionNotice('Slovo sa nepodarilo uložiť. Skúste to znova.');
            }
          }}
        />
      );
    }
    return (
      <PraiseEditor
        key={editor.mode === 'edit' ? editor.id : 'add-praise'}
        mode={editor.mode}
        initialValues={editingPraise ? { text: editingPraise.text, emoji: editingPraise.emoji } : undefined}
        existingPraises={allUserPraises}
        editingId={editor.mode === 'edit' ? editor.id : undefined}
        onCancel={() => setEditor(null)}
        onSubmit={async values => {
          try {
            if (editor.mode === 'edit') {
              await updatePraise(editor.id, values);
            } else {
              const audioKey = `custom-${crypto.randomUUID()}`;
              await addPraise({ ...values, audioKey, isDefault: false });
            }
            setEditor(null);
            setActionNotice(null);
          } catch {
            setActionNotice('Pochvalu sa nepodarilo uložiť. Skúste to znova.');
          }
        }}
      />
    );
  }

  // ── Category nav ─────────────────────────────────────────────────────────
  const content = getLocaleContent(locale);
  const sections = SECTIONS.map(id => ({
    id,
    label: SECTION_LABELS[id],
    count: id === 'letters' ? content.letterItems.length
      : id === 'numbers' ? content.numberItems.length
      : id === 'phrases' ? Object.keys(content.audioPhrases).length
      : id === 'words' ? wordRows.length
      : praiseRows.length,
  }));
  const showEditorColumn = activeSection === 'words' || activeSection === 'praise';

  return (
    <AppScreen mode="parent" height="content" scroll="vertical" maxWidth="wide">
      <TopBar left={<BackButton onClick={() => navigate(-1)} />} />
      <PageHeader title="Vlastný obsah" description="Nahraj vlastný hlas a uprav slová a pochvaly." />

      {actionNotice && (
        <p role="status" className="mt-3 rounded-2xl bg-selected-surface px-4 py-3 text-sm font-bold text-text-main">
          {actionNotice}
        </p>
      )}

      <div
        className={cn(
          'mt-5 sm:mt-6',
          layoutMode === 'spacious' && showEditorColumn && 'grid grid-cols-[220px_minmax(280px,1fr)_minmax(320px,1fr)] items-start gap-6',
          layoutMode === 'spacious' && !showEditorColumn && 'grid grid-cols-[220px_minmax(0,1fr)] items-start gap-6',
          layoutMode === 'medium' && 'grid grid-cols-[220px_minmax(0,1fr)] items-start gap-6',
        )}
      >
        <ContentCategoryNav items={sections} value={activeSection} onValueChange={setActiveSection} orientation={navOrientation}>
          <TabPanel value="letters">
            <ContentItemList rows={buildSystemRows(locale, 'letters')} searchLabel="Hľadať písmeno" emptyMessage="Žiadne písmená." />
          </TabPanel>
          <TabPanel value="numbers">
            <ContentItemList rows={buildSystemRows(locale, 'numbers')} searchLabel="Hľadať číslo" emptyMessage="Žiadne čísla." />
          </TabPanel>
          <TabPanel value="phrases">
            <ContentItemList rows={buildSystemRows(locale, 'phrases')} searchLabel="Hľadať frázu" emptyMessage="Žiadne frázy." />
          </TabPanel>
          <TabPanel value="words">
            <ContentItemList
              rows={wordRows}
              disabledRows={disabledWordRows}
              onRestoreOne={row => void requestRestoreWord(row.id)}
              onRestoreAll={() => void requestRestoreAllWords()}
              onAfterRecordSaved={row => updateWord(row.id, { status: 'ready' })}
              onAfterDeleteAudio={row => {
                const word = allUserWords.find(item => item.id === row.id);
                return word ? updateWord(row.id, { status: word.isDefault ? 'ready' : 'draft' }) : undefined;
              }}
              addAction={{ label: 'Pridať slovo', onClick: () => { editorRestoreFocusRef.current = document.activeElement as HTMLElement | null; setEditor({ kind: 'word', mode: 'add' }); } }}
              searchLabel="Hľadať slovo"
              emptyMessage="Zatiaľ žiadne slová."
              noticeMessage={readyWordCount <= 1 ? LAST_PLAYABLE_MESSAGE : null}
            />
          </TabPanel>
          <TabPanel value="praise">
            <ContentItemList
              rows={praiseRows}
              disabledRows={disabledPraiseRows}
              onRestoreOne={row => void requestRestorePraise(row.id)}
              onRestoreAll={() => void requestRestoreAllPraises()}
              onAfterRecordSaved={row => updatePraise(row.id, { status: 'ready' })}
              onAfterDeleteAudio={row => {
                const praise = allUserPraises.find(item => item.id === row.id);
                return praise ? updatePraise(row.id, { status: praise.isDefault ? 'ready' : 'draft' }) : undefined;
              }}
              addAction={{ label: 'Pridať pochvalu', onClick: () => { editorRestoreFocusRef.current = document.activeElement as HTMLElement | null; setEditor({ kind: 'praise', mode: 'add' }); } }}
              searchLabel="Hľadať pochvalu"
              emptyMessage="Zatiaľ žiadne pochvaly."
              noticeMessage={readyPraiseCount <= 1 ? LAST_PLAYABLE_MESSAGE : null}
            />
          </TabPanel>
        </ContentCategoryNav>

        {layoutMode === 'spacious' && showEditorColumn && (
          <div className="sticky top-4">
            {editor ? (
              <Card variant="panel">
                <PageHeader headingLevel="h2" title={editorTitle} />
                <div className="mt-4">{renderEditor()}</div>
              </Card>
            ) : (
              <div className="rounded-[32px] border-2 border-dashed border-border-subtle p-8 text-center text-sm font-medium text-text-muted">
                Vyber položku na úpravu alebo pridaj novú.
              </div>
            )}
          </div>
        )}
      </div>

      {layoutMode !== 'spacious' && (
        <DialogShell
          open={editor !== null}
          onOpenChange={open => { if (!open) setEditor(null); }}
          title={editorTitle}
          restoreFocusRef={editorRestoreFocusRef}
          className={layoutMode === 'compact' ? FULLSCREEN_DIALOG_CLASS : undefined}
        >
          <div className="mt-4">{renderEditor()}</div>
        </DialogShell>
      )}

      <AlertDialogShell
        open={pendingDelete !== null}
        onOpenChange={open => { if (!open) setPendingDelete(null); }}
        title={pendingDelete?.kind === 'word' ? 'Zmazať slovo?' : 'Zmazať pochvalu?'}
        description={pendingDelete ? describePendingDelete(pendingDelete) : undefined}
        cancelLabel="Zrušiť"
        actionLabel="Zmazať"
        actionTone="danger"
        onAction={() => void confirmPendingDelete()}
        restoreFocusRef={deleteRestoreFocusRef}
      />

      {undoNotice && (
        <div
          role="status"
          className="fixed inset-x-4 bottom-4 z-30 mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl bg-text-main px-4 py-3 text-white shadow-modal sm:inset-x-auto sm:right-6"
        >
          <span className="text-sm font-medium">{undoNotice.message}</span>
          <Button
            tone="neutral"
            size="parent"
            density="compact"
            onClick={() => { undoNotice.onUndo(); dismissUndo(); }}
          >
            Vrátiť späť
          </Button>
        </div>
      )}
    </AppScreen>
  );
}
