/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useRef, useState } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Download, Printer, RefreshCw } from 'lucide-react';
import {
  AppScreen,
  BackButton,
  Button,
  Card,
  PageHeader,
  RadioGroupControl,
  SegmentedChoice,
  SwitchControl,
  TopBar,
} from '../shared/ui';
import { useContent } from '../shared/contexts/ContentContext';
import { GAME_DEFINITIONS_BY_ID } from '../shared/gameCatalog';
import { useT } from '../shared/hooks/useT';
import type { GameSettings } from '../shared/types';
import { getUiCopy } from '../shared/uiCopy';
import { createWorksheetSeed } from './seededRandom';
import {
  buildWorksheet,
  getWorksheetUnavailableReason,
  PAGES_PER_GAME_OPTIONS,
  WORKSHEET_GAME_IDS,
  type PagesPerGame,
  type WorksheetAnswerMode,
  type WorksheetContent,
  type WorksheetGameId,
} from './worksheetLogic';
import { worksheetFileBaseName, takeNextWorksheetFileNumber } from './worksheetFile';
import { downloadBlob, renderSheetsToPdf } from './worksheetPdfExport';
import { WorksheetDocument } from './WorksheetSheets';
import './worksheet.css';

function readSeed(value: string | null): number | null {
  if (value === null || !/^\d{1,10}$/.test(value)) return null;
  return Number(value) >>> 0;
}

export function WorksheetScreen({ settings }: { settings: GameSettings }) {
  const navigate = useNavigate();
  const t = useT();
  const { locale, letterItems, wordItems, syllableItems } = useContent();
  const [searchParams] = useSearchParams();
  const [seed, setSeed] = useState(() => readSeed(searchParams.get('seed')) ?? createWorksheetSeed());
  const [selected, setSelected] = useState<ReadonlySet<WorksheetGameId>>(() => new Set(WORKSHEET_GAME_IDS));
  const [answerMode, setAnswerMode] = useState<WorksheetAnswerMode>('circle');
  const [pagesPerGame, setPagesPerGame] = useState<PagesPerGame>(1);
  const [pdfState, setPdfState] = useState<'idle' | 'working' | 'error'>('idle');
  const pdfRootRef = useRef<HTMLDivElement>(null);

  const content: WorksheetContent = useMemo(
    () => ({ letterItems, wordItems, syllableItems, settings }),
    [letterItems, wordItems, syllableItems, settings],
  );
  const unavailable = useMemo(
    () => new Map(WORKSHEET_GAME_IDS.map(gameId => [gameId, getWorksheetUnavailableReason(gameId, content)])),
    [content],
  );
  const pages = useMemo(
    () => buildWorksheet({ gameIds: [...selected], pagesPerGame, seed, content }),
    [selected, pagesPerGame, seed, content],
  );

  function toggleGame(gameId: WorksheetGameId, checked: boolean) {
    setSelected(current => {
      const next = new Set(current);
      if (checked) next.add(gameId);
      else next.delete(gameId);
      return next;
    });
  }

  const document = (
    <WorksheetDocument
      pages={pages}
      answerMode={answerMode}
      locale={locale}
      t={t}
    />
  );

  /** Each print or download takes a new number, so saved files never share a name. */
  function nextFileBaseName(): string {
    return worksheetFileBaseName(locale, takeNextWorksheetFileNumber());
  }

  function handlePrint() {
    // Browsers name a "Save as PDF" file after the document title.
    const previousTitle = window.document.title;
    window.document.title = nextFileBaseName();
    const restoreTitle = () => {
      window.document.title = previousTitle;
      window.removeEventListener('afterprint', restoreTitle);
    };
    window.addEventListener('afterprint', restoreTitle);
    window.print();
  }

  async function handleDownloadPdf() {
    // Lay the sheets out off screen at A4 width before capturing them.
    flushSync(() => setPdfState('working'));
    try {
      const sheets = Array.from(pdfRootRef.current?.querySelectorAll<HTMLElement>('.ws-sheet') ?? []);
      const baseName = nextFileBaseName();
      const pdf = await renderSheetsToPdf(sheets, baseName);
      downloadBlob(pdf, `${baseName}.pdf`);
      setPdfState('idle');
    } catch (error) {
      console.warn('[Worksheets] PDF export failed', error);
      setPdfState('error');
    }
  }

  const status = pages.length === 0
    ? t('Vyberte aspoň jednu hru.')
    : pdfState === 'working'
      ? t('Pripravujem PDF…')
      : pdfState === 'error'
        ? t('PDF sa nepodarilo pripraviť. Skúste to znova alebo použite Vytlačiť a Uložiť ako PDF.')
        : t('Počet strán: {count}', { count: pages.length });

  return (
    <AppScreen mode="parent" height="content" scroll="vertical" maxWidth="narrow">
      <TopBar left={<BackButton onClick={() => navigate('/settings')} />} />
      <PageHeader
        title={t('Pracovné listy')}
        description={t('Vytlačte úlohy z hier na papier, aby sa dalo hrať aj bez obrazovky. Úlohy sa riadia nastaveniami hier.')}
      />

      <Card className="mt-5 sm:mt-6">
        <h3 className="text-xl font-bold sm:text-2xl">{t('Hry')}</h3>
        <div className="mt-4 space-y-3">
          {WORKSHEET_GAME_IDS.map(gameId => {
            const reason = unavailable.get(gameId);
            return (
              <SwitchControl
                key={gameId}
                label={getUiCopy(locale, GAME_DEFINITIONS_BY_ID[gameId].titleKey)}
                description={reason ? t(reason) : undefined}
                checked={!reason && selected.has(gameId)}
                disabled={Boolean(reason)}
                onCheckedChange={checked => toggleGame(gameId, checked)}
                tone="primary"
              />
            );
          })}
        </div>
      </Card>

      <Card className="mt-5 sm:mt-6">
        <h3 className="text-xl font-bold sm:text-2xl">{t('Ako dieťa odpovedá')}</h3>
        <p className="mt-1 text-sm font-medium text-text-muted sm:text-base">
          {t('Krúžkovanie zvládne aj dieťa, ktoré ešte nepíše. Pri písaní dopĺňa odpoveď do prázdneho políčka.')}
        </p>
        <div className="mt-4">
          <RadioGroupControl<WorksheetAnswerMode>
            ariaLabel={t('Ako dieťa odpovedá')}
            tone="accent"
            value={answerMode}
            onValueChange={setAnswerMode}
            options={[
              { value: 'circle', label: t('Krúžkuje') },
              { value: 'write', label: t('Píše') },
            ]}
          />
        </div>
      </Card>

      <Card className="mt-5 sm:mt-6">
        <h3 className="text-xl font-bold sm:text-2xl">{t('Strany z každej hry')}</h3>
        <div className="mt-4">
          <SegmentedChoice<PagesPerGame>
            ariaLabel={t('Strany z každej hry')}
            options={PAGES_PER_GAME_OPTIONS}
            selected={pagesPerGame}
            onSelect={setPagesPerGame}
          />
        </div>
      </Card>

      <div className="mt-5 flex flex-wrap items-center gap-3 sm:mt-6">
        <Button tone="primary" icon={<Printer size={20} />} disabled={pages.length === 0} onClick={handlePrint}>
          {t('Vytlačiť')}
        </Button>
        <Button
          tone="neutral"
          icon={<Download size={20} />}
          disabled={pages.length === 0 || pdfState === 'working'}
          onClick={() => void handleDownloadPdf()}
        >
          {t('Stiahnuť PDF')}
        </Button>
        <Button tone="neutral" icon={<RefreshCw size={20} />} onClick={() => setSeed(createWorksheetSeed())}>
          {t('Nové úlohy')}
        </Button>
        <span role="status" className="text-sm font-bold text-text-muted sm:text-base" data-testid="worksheet-sheet-count">
          {status}
        </span>
      </div>

      {pages.length > 0 && (
        <section aria-label={t('Náhľad')} className="mt-6 space-y-5 pb-10" data-testid="worksheet-preview">
          <h3 className="text-xl font-bold sm:text-2xl">{t('Náhľad')}</h3>
          <div className="space-y-5 [&>.ws-sheet]:rounded-2xl [&>.ws-sheet]:shadow-block">{document}</div>
        </section>
      )}

      {createPortal(<div id="worksheet-print-root">{document}</div>, window.document.body)}
      {pdfState === 'working' && createPortal(
        <div id="worksheet-pdf-root" ref={pdfRootRef} aria-hidden="true">{document}</div>,
        window.document.body,
      )}
    </AppScreen>
  );
}
