/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { pwaBrand } from '../pwa/pwaConfig';
import { GAME_DEFINITIONS_BY_ID } from '../shared/gameCatalog';
import { msg, type Translate } from '../shared/i18n';
import { getUiCopy } from '../shared/uiCopy';
import {
  type AdditionTask,
  type CompareTask,
  type CompleteLetterTask,
  type CompleteSyllableTask,
  type CountingTask,
  type FirstLetterTask,
  type WorksheetAnswerMode,
  type WorksheetGameId,
  type WorksheetPage,
  type WorksheetRepresentation,
  type WorksheetTask,
} from './worksheetLogic';

const INSTRUCTIONS: Record<WorksheetGameId, Record<WorksheetAnswerMode, string>> = {
  COUNTING_ITEMS: {
    circle: msg('Spočítaj obrázky a zakrúžkuj správne číslo.'),
    write: msg('Spočítaj obrázky a napíš, koľko ich je.'),
  },
  COMPARE_QUANTITIES: {
    circle: msg('Zakrúžkuj stranu, kde je viac.'),
    write: msg('Zakrúžkuj stranu, kde je viac.'),
  },
  ADDITION: {
    circle: msg('Spočítaj a zakrúžkuj výsledok.'),
    write: msg('Spočítaj a napíš výsledok.'),
  },
  FIRST_LETTER: {
    circle: msg('Pomenuj obrázok a zakrúžkuj jeho prvé písmeno.'),
    write: msg('Pomenuj obrázok a napíš jeho prvé písmeno.'),
  },
  COMPLETE_SYLLABLE: {
    circle: msg('Zakrúžkuj slabiku, ktorá chýba.'),
    write: msg('Doplň slabiku, ktorá chýba.'),
  },
  COMPLETE_LETTER: {
    circle: msg('Zakrúžkuj písmená, ktoré chýbajú.'),
    write: msg('Doplň písmená, ktoré chýbajú.'),
  },
};

/** Two-column tiles fit pictures; one wide row per task fits words and side-by-side groups. */
const ROW_LAYOUT_GAMES: ReadonlySet<WorksheetGameId> = new Set(['COMPARE_QUANTITIES', 'ADDITION', 'COMPLETE_SYLLABLE', 'COMPLETE_LETTER']);

interface SheetContext {
  answerMode: WorksheetAnswerMode;
  representation: WorksheetRepresentation;
}

type EmojiSetVariant = 'counting' | 'compare' | 'addition' | 'addition-dense';

/** Pictures per row: five keeps ten objects to two rows; small sums show four larger ones. */
const EMOJI_COLUMNS: Record<EmojiSetVariant, number> = { counting: 5, compare: 5, addition: 4, 'addition-dense': 5 };

function EmojiSet({ emoji, count, variant }: { emoji: string; count: number; variant: EmojiSetVariant }) {
  const variantClass = variant === 'addition-dense' ? 'ws-emoji-set--addition ws-emoji-set--addition-dense' : `ws-emoji-set--${variant}`;
  const columns = Math.max(1, Math.min(count, EMOJI_COLUMNS[variant]));
  return (
    <span
      className={`ws-emoji-set ${variantClass}`}
      style={{ '--ws-cols': columns } as React.CSSProperties}
      aria-label={String(count)}
    >
      {Array.from({ length: count }, (_, index) => <span key={index} aria-hidden="true">{emoji}</span>)}
    </span>
  );
}

function Choices({ values }: { values: readonly (string | number)[] }) {
  return (
    <span className="ws-choices">
      {values.map(value => <span key={value} className="ws-choice">{value}</span>)}
    </span>
  );
}

function Answer({ mode, choices }: { mode: WorksheetAnswerMode; choices: readonly (string | number)[] }) {
  return mode === 'circle' ? <Choices values={choices} /> : <span className="ws-write-box" data-testid="ws-write-box" />;
}

function CountingTaskView({ task, context }: { task: CountingTask; context: SheetContext }) {
  return (
    <>
      <EmojiSet emoji={task.emoji} count={task.count} variant="counting" />
      <Answer mode={context.answerMode} choices={task.choices} />
    </>
  );
}

function CompareSide({ value, emoji, representation }: { value: number; emoji: string; representation: WorksheetRepresentation }) {
  return (
    <span className="ws-compare-side">
      {representation === 'numerals'
        ? <span className="ws-numeral">{value}</span>
        : <EmojiSet emoji={emoji} count={value} variant="compare" />}
    </span>
  );
}

function CompareTaskView({ task, context }: { task: CompareTask; context: SheetContext }) {
  return (
    <>
      <CompareSide value={task.left} emoji={task.emoji} representation={context.representation} />
      <span className="ws-compare-divider" aria-hidden="true" />
      <CompareSide value={task.right} emoji={task.emoji} representation={context.representation} />
    </>
  );
}

function AdditionTaskView({ task, context }: { task: AdditionTask; context: SheetContext }) {
  // More than four objects wrap to a second row, so they shrink to keep the row height.
  const variant = Math.max(task.a, task.b) > 4 ? 'addition-dense' : 'addition';
  const addend = (value: number) => (context.representation === 'numerals'
    ? <span className="ws-numeral">{value}</span>
    : <EmojiSet emoji={task.emoji} count={value} variant={variant} />);
  return (
    <>
      {addend(task.a)}
      <span className="ws-operator">+</span>
      {addend(task.b)}
      <span className="ws-operator">=</span>
      <Answer mode={context.answerMode} choices={task.choices} />
    </>
  );
}

function FirstLetterTaskView({ task, context }: { task: FirstLetterTask; context: SheetContext }) {
  return (
    <>
      <span className="ws-picture" role="img" aria-label={task.word.word}>{task.word.emoji}</span>
      <Answer mode={context.answerMode} choices={task.choices} />
    </>
  );
}

function WordTaskView({ task, context }: { task: CompleteSyllableTask | CompleteLetterTask; context: SheetContext }) {
  const isSyllable = task.kind === 'complete-syllable';
  const dense = !isSyllable && task.slots.length > 7;
  return (
    <span className="ws-word-task">
      <span className="ws-picture ws-picture--small" role="img" aria-label={task.word.word}>{task.word.emoji}</span>
      <span className="ws-word-body">
        <span className={`ws-slots${dense ? ' ws-slots--dense' : ''}`}>
          {task.slots.map((slot, index) => (
            <span
              key={index}
              className={`ws-slot${isSyllable ? ' ws-slot--syllable' : ''}${slot === null ? ' ws-slot--blank' : ''}`}
              data-testid={slot === null ? 'ws-blank' : undefined}
            >
              {slot ?? ''}
            </span>
          ))}
        </span>
        {context.answerMode === 'circle' && <Choices values={task.choices} />}
      </span>
    </span>
  );
}

function TaskView({ task, context }: { task: WorksheetTask; context: SheetContext }) {
  switch (task.kind) {
    case 'counting':
      return <CountingTaskView task={task} context={context} />;
    case 'compare':
      return <CompareTaskView task={task} context={context} />;
    case 'addition':
      return <AdditionTaskView task={task} context={context} />;
    case 'first-letter':
      return <FirstLetterTaskView task={task} context={context} />;
    case 'complete-syllable':
    case 'complete-letter':
      return <WordTaskView task={task} context={context} />;
  }
}

function gameTitle(locale: string, gameId: WorksheetGameId): string {
  return getUiCopy(locale, GAME_DEFINITIONS_BY_ID[gameId].titleKey);
}

interface WorksheetSheetProps {
  page: WorksheetPage;
  answerMode: WorksheetAnswerMode;
  locale: string;
  t: Translate;
}

export function WorksheetSheet({ page, answerMode, locale, t }: WorksheetSheetProps) {
  const context: SheetContext = { answerMode, representation: page.representation };
  const layout = ROW_LAYOUT_GAMES.has(page.gameId) ? 'rows' : 'grid';
  return (
    <section className="ws-sheet" data-testid="worksheet-sheet" data-game={page.gameId}>
      <header className="ws-head">
        <span>{gameTitle(locale, page.gameId)}</span>
        <span className="ws-name">{t('Meno:')}<span className="ws-name-line" /></span>
      </header>
      <h2 className="ws-instruction">{t(INSTRUCTIONS[page.gameId][answerMode])}</h2>
      <ol className={`ws-tasks ws-tasks--${layout}`}>
        {page.tasks.map((task, index) => (
          <li key={index} className={`ws-task ws-task--${task.kind}`} data-testid="worksheet-task">
            <span className="ws-task-number">{index + 1}</span>
            <TaskView task={task} context={context} />
          </li>
        ))}
      </ol>
      <footer className="ws-foot">{pwaBrand.appName}</footer>
    </section>
  );
}

interface WorksheetDocumentProps {
  pages: readonly WorksheetPage[];
  answerMode: WorksheetAnswerMode;
  locale: string;
  t: Translate;
}

export function WorksheetDocument({ pages, answerMode, locale, t }: WorksheetDocumentProps) {
  return (
    <>
      {pages.map(page => (
        <WorksheetSheet key={`${page.gameId}-${page.pageNumber}`} page={page} answerMode={answerMode} locale={locale} t={t} />
      ))}
    </>
  );
}
