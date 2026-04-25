# UI Component Library Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a shared UI component library, hidden `/ui-kit` review route, and migrate repeated app UI to standardized primitives while preserving the app's current playful identity.

**Architecture:** Add focused primitives under `src/shared/ui/` and migrate existing shared/domain components to consume them. The hidden `/ui-kit` route becomes the review surface for UX and future redesign work. Standardization is allowed to change current spacing, colors, typography, and radii where one-off styling conflicts with shared components.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS v4, react-router-dom, lucide-react.

---

## File Structure

Create:

- `src/shared/ui/utils.ts` — small class-name combiner.
- `src/shared/ui/tokens.ts` — named style constants for shared classes.
- `src/shared/ui/AppScreen.tsx` — full-screen shell and centered content wrapper.
- `src/shared/ui/Button.tsx` — standard app buttons including primary, secondary, quiet, circular play, and compact variants.
- `src/shared/ui/IconButton.tsx` — circular icon action button plus `BackButton`.
- `src/shared/ui/TopBar.tsx` — standardized three-column top bar.
- `src/shared/ui/RoundCounter.tsx` — shared round counter pill.
- `src/shared/ui/Card.tsx` — shared card/panel/list-row surfaces.
- `src/shared/ui/ChoiceTile.tsx` — reusable tappable tile for games and option selectors.
- `src/shared/ui/FormControls.tsx` — toggle, segmented choice, search input, textarea.
- `src/shared/ui/OverlayFrame.tsx` — shared modal overlay shell and confetti layer.
- `src/shared/ui/UiKitScreen.tsx` — designer-reviewable component inventory.
- `src/shared/ui/index.ts` — UI library barrel exports.

Modify:

- `src/shared/components/TopBar.tsx` — compatibility re-export from `src/shared/ui`.
- `src/shared/components/SettingToggle.tsx` — compatibility wrapper or re-export around `ToggleControl`.
- `src/shared/components/GameLobby.tsx` — use `AppScreen`, `TopBar`, `BackButton`, `IconButton`, and `Button`.
- `src/shared/components/SettingsScreen.tsx` — use `AppScreen` and `TopBar` from UI.
- `src/shared/components/SettingsOverlay.tsx` — use `Card` modal variant, `Button`, and shared surface classes.
- `src/shared/components/SettingsContent.tsx` — use `Card`, `SegmentedChoice`, `ToggleControl`, `Button`.
- `src/shared/components/FeedbackModal.tsx` — use `AppScreen`, `Card`, `Button`, `ChoiceTile`, `TextAreaControl`.
- `src/recordings/AudioRecordingScreen.tsx` — use `AppScreen`, `ToggleControl`, `SearchInput`, `ChoiceTile`.
- `src/recordings/RecordingListItem.tsx` — use `Card` row variant and `IconButton`.
- `src/shared/components/FindItGame.tsx` — use `AppScreen`, `TopBar`, `BackButton`, `IconButton`, `RoundCounter`, `ChoiceTile`.
- `src/games/counting/CountingItemsGame.tsx` — use `AppScreen`, `TopBar`, `BackButton`, `IconButton`, `RoundCounter`, `Card`, `ChoiceTile`.
- `src/games/assembly/AssemblyGame.tsx` — use `AppScreen`, `TopBar`, `BackButton`, `IconButton`, `RoundCounter`, `Card`, `ChoiceTile` where the mechanic permits.
- `src/shared/components/SuccessOverlay.tsx` — use `OverlayFrame`.
- `src/shared/components/FailureOverlay.tsx` — use `OverlayFrame`.
- `src/shared/components/SessionCompleteOverlay.tsx` — use `OverlayFrame`.
- `src/shared/components/ParentsGate.tsx` — use shared screen/button/card primitives where straightforward.
- `src/shared/components/ErrorBoundary.tsx` — use shared button.
- `src/App.tsx` — add hidden `/ui-kit` route and use shared primitives for home screen where practical.
- `AGENTS.md` — add UI library instructions for Codex.
- `CLAUDE.md` — add UI library instructions for Claude Code.
- `README.md` — add UI Component Library contributor section.

No test runner is configured. Verification uses `npm run lint`, `npm run build`, and browser checks.

---

### Task 1: Add Shared UI Foundation

**Files:**
- Create: `src/shared/ui/utils.ts`
- Create: `src/shared/ui/tokens.ts`
- Create: `src/shared/ui/AppScreen.tsx`
- Create: `src/shared/ui/Button.tsx`
- Create: `src/shared/ui/IconButton.tsx`
- Create: `src/shared/ui/TopBar.tsx`
- Create: `src/shared/ui/RoundCounter.tsx`
- Create: `src/shared/ui/Card.tsx`
- Create: `src/shared/ui/ChoiceTile.tsx`
- Create: `src/shared/ui/FormControls.tsx`
- Create: `src/shared/ui/OverlayFrame.tsx`
- Create: `src/shared/ui/index.ts`
- Modify: `src/shared/components/TopBar.tsx`
- Modify: `src/shared/components/SettingToggle.tsx`

- [ ] **Step 1: Create `src/shared/ui/utils.ts`**

```ts
export type ClassValue = string | false | null | undefined;

export function cx(...classes: ClassValue[]) {
  return classes.filter(Boolean).join(' ');
}
```

- [ ] **Step 2: Create `src/shared/ui/tokens.ts`**

```ts
export const uiTokens = {
  screenPadding: 'px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-5',
  screenBg: 'bg-bg-light text-text-main font-fredoka',
  maxWidth: {
    narrow: 'max-w-2xl',
    game: 'max-w-5xl',
    wide: 'max-w-7xl',
  },
  iconButton:
    'w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white text-text-main shadow-block flex items-center justify-center transition-all active:translate-y-2 active:shadow-block-pressed disabled:opacity-40 disabled:cursor-not-allowed',
  card:
    'rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_12px_28px_rgba(93,69,62,0.06)] sm:rounded-[32px] sm:p-6',
  panel:
    'rounded-[32px] bg-white p-5 shadow-block sm:rounded-[40px] sm:p-6',
  insetPanel:
    'rounded-[24px] border border-shadow/15 bg-bg-light/35 p-4 sm:rounded-[28px] sm:p-5',
  pressable:
    'transition-all active:translate-y-2 active:shadow-block-pressed disabled:translate-y-0',
};
```

- [ ] **Step 3: Create `src/shared/ui/AppScreen.tsx`**

```tsx
import React from 'react';
import { cx } from './utils';
import { uiTokens } from './tokens';

interface AppScreenProps {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  maxWidth?: keyof typeof uiTokens.maxWidth;
  fixedHeight?: boolean;
  scrollable?: boolean;
}

export function AppScreen({
  children,
  className,
  contentClassName,
  maxWidth = 'game',
  fixedHeight = true,
  scrollable = false,
}: AppScreenProps) {
  return (
    <div
      className={cx(
        fixedHeight ? 'min-h-[100svh] h-[100svh]' : 'min-h-screen',
        scrollable ? 'overflow-y-auto overflow-x-hidden' : 'overflow-hidden',
        'relative flex flex-col',
        uiTokens.screenBg,
        uiTokens.screenPadding,
        className,
      )}
    >
      <div className={cx('mx-auto flex w-full flex-1 min-h-0 flex-col', uiTokens.maxWidth[maxWidth], contentClassName)}>
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create `src/shared/ui/Button.tsx`**

```tsx
import React from 'react';
import { cx } from './utils';
import { uiTokens } from './tokens';

type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'danger' | 'play';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

const variantClass: Record<ButtonVariant, string> = {
  primary: 'bg-accent-blue text-white shadow-block',
  secondary: 'bg-soft-watermelon text-white shadow-block',
  quiet: 'bg-white text-text-main shadow-block',
  danger: 'bg-primary text-white shadow-block',
  play: 'rounded-full bg-success text-white shadow-block',
};

const sizeClass: Record<ButtonSize, string> = {
  sm: 'px-5 py-3 text-base sm:text-lg',
  md: 'px-6 py-4 text-xl',
  lg: 'px-8 py-5 text-2xl sm:px-10 sm:py-6 sm:text-3xl',
};

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  icon,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={cx(
        'inline-flex items-center justify-center gap-3 rounded-2xl font-bold',
        variant === 'play' ? 'h-28 w-28 sm:h-36 sm:w-36 md:h-44 md:w-44' : sizeClass[size],
        variantClass[variant],
        uiTokens.pressable,
        fullWidth && 'w-full',
        disabled && 'opacity-40 cursor-not-allowed',
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
```

- [ ] **Step 5: Create `src/shared/ui/IconButton.tsx`**

```tsx
import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { cx } from './utils';
import { uiTokens } from './tokens';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: React.ReactNode;
}

export function IconButton({ label, children, className, type = 'button', ...props }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      className={cx(uiTokens.iconButton, className)}
      {...props}
    >
      {children}
    </button>
  );
}

export function BackButton({ onClick, label = 'Späť' }: { onClick: () => void; label?: string }) {
  return (
    <IconButton label={label} onClick={onClick}>
      <ArrowLeft size={24} className="sm:h-7 sm:w-7" />
    </IconButton>
  );
}
```

- [ ] **Step 6: Create `src/shared/ui/TopBar.tsx`**

```tsx
import React from 'react';
import { cx } from './utils';

interface TopBarProps {
  left?: React.ReactNode;
  center?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}

export function TopBar({ left, center, right, className }: TopBarProps) {
  return (
    <div className={cx('grid grid-cols-[auto_1fr_auto] items-start gap-3 pb-3 sm:gap-4 sm:pb-4 shrink-0', className)}>
      <div>{left ?? <div className="w-12 sm:w-14" />}</div>
      <div className="flex justify-center pt-1 sm:pt-1.5">{center}</div>
      <div>{right ?? <div className="w-12 sm:w-14" />}</div>
    </div>
  );
}
```

- [ ] **Step 7: Create `src/shared/ui/RoundCounter.tsx`**

```tsx
interface RoundCounterProps {
  completed: number;
  total: number;
  label?: string;
}

export function RoundCounter({ completed, total, label = 'kolá' }: RoundCounterProps) {
  return (
    <div className="rounded-full bg-white px-5 py-2 text-base font-bold text-text-main shadow-block sm:text-lg" aria-label={`${completed} z ${total} ${label}`}>
      ✓ {completed} / {total}
    </div>
  );
}
```

- [ ] **Step 8: Create `src/shared/ui/Card.tsx`**

```tsx
import React from 'react';
import { cx } from './utils';
import { uiTokens } from './tokens';

type CardVariant = 'card' | 'panel' | 'inset' | 'row' | 'modal';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
}

const cardVariantClass: Record<CardVariant, string> = {
  card: uiTokens.card,
  panel: uiTokens.panel,
  inset: uiTokens.insetPanel,
  row: 'rounded-2xl border-2 border-transparent bg-white px-4 py-3',
  modal: 'rounded-[32px] border-4 border-white bg-white shadow-block sm:rounded-[40px]',
};

export const Card = React.forwardRef<HTMLDivElement, CardProps>(function Card(
  { variant = 'card', className, children, ...props },
  ref,
) {
  return (
    <div ref={ref} className={cx(cardVariantClass[variant], className)} {...props}>
      {children}
    </div>
  );
});
```

- [ ] **Step 9: Create `src/shared/ui/ChoiceTile.tsx`**

```tsx
import React from 'react';
import { cx } from './utils';
import { uiTokens } from './tokens';

type ChoiceState = 'neutral' | 'selected' | 'correct' | 'wrong' | 'disabled';
type ChoiceShape = 'square' | 'option' | 'pill';

interface ChoiceTileProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  state?: ChoiceState;
  shape?: ChoiceShape;
}

const stateClass: Record<ChoiceState, string> = {
  neutral: 'bg-white text-text-main shadow-block',
  selected: 'bg-accent-blue text-white shadow-block scale-105',
  correct: 'bg-success text-primary shadow-block-correct -translate-y-1',
  wrong: 'bg-white text-text-main opacity-50 shadow-block-pressed scale-95',
  disabled: 'bg-bg-light text-text-main opacity-50',
};

const shapeClass: Record<ChoiceShape, string> = {
  square: 'aspect-square rounded-[22px] p-2 sm:rounded-[28px] sm:p-3',
  option: 'rounded-2xl px-4 py-4',
  pill: 'rounded-full px-4 py-2',
};

export function ChoiceTile({
  state = 'neutral',
  shape = 'square',
  className,
  children,
  disabled,
  type = 'button',
  ...props
}: ChoiceTileProps) {
  const effectiveState = disabled ? 'disabled' : state;

  return (
    <button
      type={type}
      disabled={disabled}
      className={cx(
        'flex items-center justify-center font-bold transition-all',
        shapeClass[shape],
        stateClass[effectiveState],
        effectiveState !== 'wrong' && effectiveState !== 'disabled' && uiTokens.pressable,
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 10: Create `src/shared/ui/FormControls.tsx`**

```tsx
import React from 'react';
import { Search, X } from 'lucide-react';
import { cx } from './utils';
import { ChoiceTile } from './ChoiceTile';

interface ToggleControlProps {
  label: string;
  icon?: React.ReactNode;
  description?: string;
  checked: boolean;
  onToggle: () => void;
  iconBackgroundClassName?: string;
  activeColorClassName?: string;
  className?: string;
}

export function ToggleControl({
  label,
  icon,
  description,
  checked,
  onToggle,
  iconBackgroundClassName = 'bg-shadow/35',
  activeColorClassName = 'bg-soft-watermelon',
  className,
}: ToggleControlProps) {
  return (
    <div className={cx('flex items-center justify-between gap-4', className)}>
      <div className="flex min-w-0 items-center gap-4">
        {icon && (
          <div className={cx('flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] text-text-main sm:h-16 sm:w-16', iconBackgroundClassName)}>
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h3 className="text-xl font-bold leading-tight sm:text-2xl">{label}</h3>
          {description && <p className="mt-1 text-sm font-medium leading-snug opacity-55 sm:text-base">{description}</p>}
        </div>
      </div>

      <button
        type="button"
        onClick={onToggle}
        aria-label={checked ? `Vypnúť ${label}` : `Zapnúť ${label}`}
        aria-pressed={checked}
        className={cx('relative h-10 w-[4.5rem] shrink-0 rounded-full px-1 transition-colors duration-300 sm:h-12 sm:w-24', checked ? activeColorClassName : 'bg-shadow')}
      >
        <span className={cx('absolute left-1 top-1 h-8 w-8 rounded-full bg-white shadow-md transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] sm:h-10 sm:w-10', checked ? 'translate-x-8 sm:translate-x-12' : 'translate-x-0')}>
          <span key={checked ? 'on' : 'off'} className="block h-full w-full rounded-full bg-white animate-toggle-pop" />
        </span>
      </button>
    </div>
  );
}

interface SegmentedChoiceProps<T extends string | number> {
  options: readonly T[];
  selected: T;
  onSelect: (value: T) => void;
  formatLabel?: (value: T) => React.ReactNode;
  activeClassName?: string;
  columns?: 2 | 3 | 4;
}

export function SegmentedChoice<T extends string | number>({
  options,
  selected,
  onSelect,
  formatLabel = String,
  activeClassName = 'bg-accent-blue',
  columns,
}: SegmentedChoiceProps<T>) {
  const gridClass = columns === 4 ? 'grid-cols-4' : columns === 2 || options.length === 2 ? 'grid-cols-2' : 'grid-cols-3';

  return (
    <div className={cx('grid gap-3', gridClass)}>
      {options.map((option) => (
        <ChoiceTile
          key={String(option)}
          shape="option"
          state={selected === option ? 'selected' : 'neutral'}
          className={selected === option ? activeClassName : 'bg-bg-light opacity-70 shadow-none'}
          onClick={() => onSelect(option)}
        >
          {formatLabel(option)}
        </ChoiceTile>
      ))}
    </div>
  );
}

interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  onClear?: () => void;
}

export function SearchInput({ value, onClear, className, ...props }: SearchInputProps) {
  const hasValue = String(value ?? '').length > 0;

  return (
    <div className="relative">
      <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40" />
      <input
        type="text"
        value={value}
        className={cx('w-full rounded-2xl border-2 border-shadow/10 bg-white py-3 pl-11 pr-10 text-lg font-medium focus:border-accent-blue/50 focus:outline-none', className)}
        {...props}
      />
      {hasValue && onClear && (
        <button type="button" onClick={onClear} className="absolute right-4 top-1/2 -translate-y-1/2 opacity-40" aria-label="Vymazať">
          <X size={18} />
        </button>
      )}
    </div>
  );
}

export function TextAreaControl({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cx('w-full resize-none rounded-2xl border border-shadow/15 bg-bg-light/35 p-4 text-base font-medium placeholder:opacity-40 focus:outline-none focus:ring-2 focus:ring-accent-blue', className)}
      {...props}
    />
  );
}
```

- [ ] **Step 11: Create `src/shared/ui/OverlayFrame.tsx`**

```tsx
import React, { useMemo } from 'react';
import { COLORS } from '../contentRegistry';
import { cx } from './utils';

interface ConfettiLayerProps {
  show?: boolean;
}

export function ConfettiLayer({ show = true }: ConfettiLayerProps) {
  const confetti = useMemo(
    () =>
      [...Array(54)].map((_, i) => ({
        x: `${Math.random() * 100}%`,
        y: `${Math.random() * 30}%`,
        rotation: Math.random() * 80 - 40,
        scale: 0.55 + Math.random() * 0.55,
        drift: `${Math.random() * 80 - 40}px`,
        spin: `${Math.random() * 140 - 70}deg`,
        opacity: 0.18 + Math.random() * 0.22,
        duration: 7 + Math.random() * 5,
        delay: Math.random() * 4,
        shape: i % 3,
      })),
    [show],
  );

  if (!show) return null;

  return (
    <>
      {confetti.map((piece, i) => (
        <div
          key={i}
          aria-hidden="true"
          className={cx(
            'overlay-confetti absolute blur-[1px]',
            piece.shape === 0 ? 'h-7 w-7 rounded-full' : piece.shape === 1 ? 'h-5 w-10 rounded-full' : 'h-10 w-5 rounded-full',
            COLORS[i % COLORS.length].replace('text-', 'bg-'),
          )}
          style={{
            left: piece.x,
            top: piece.y,
            animationDuration: `${piece.duration}s`,
            animationDelay: `-${piece.delay}s`,
            ['--confetti-rotation' as string]: `${piece.rotation}deg`,
            ['--confetti-scale' as string]: String(piece.scale),
            ['--confetti-drift' as string]: piece.drift,
            ['--confetti-spin' as string]: piece.spin,
            ['--confetti-opacity' as string]: String(piece.opacity),
          }}
        />
      ))}
    </>
  );
}

interface OverlayFrameProps {
  show: boolean;
  children: React.ReactNode;
  onBackdropClick?: () => void;
  tone?: 'success' | 'failure' | 'neutral';
  confetti?: boolean;
  panelClassName?: string;
  inline?: boolean;
}

export function OverlayFrame({
  show,
  children,
  onBackdropClick,
  tone = 'success',
  confetti = false,
  panelClassName,
  inline = false,
}: OverlayFrameProps) {
  if (!show) return null;

  const backdropClass = tone === 'failure' ? 'bg-[#1e2a4a]/70' : 'bg-bg-light/80';

  return (
    <div
      onClick={onBackdropClick}
      className={cx(
        inline ? 'relative min-h-[320px] rounded-[32px]' : 'fixed inset-0 z-50',
        'flex flex-col items-center justify-center overflow-hidden backdrop-blur-sm',
        backdropClass,
      )}
    >
      <ConfettiLayer show={confetti} />
      <div
        onClick={(event) => event.stopPropagation()}
        className={cx('relative z-10 mx-6 w-auto max-w-[90vw] rounded-[48px] border-[6px] border-white px-12 py-12 text-center sm:px-20 sm:py-16', panelClassName)}
      >
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 12: Create `src/shared/ui/index.ts`**

```ts
export * from './AppScreen';
export * from './Button';
export * from './Card';
export * from './ChoiceTile';
export * from './FormControls';
export * from './IconButton';
export * from './OverlayFrame';
export * from './RoundCounter';
export * from './TopBar';
export * from './tokens';
export * from './utils';
```

- [ ] **Step 13: Replace `src/shared/components/TopBar.tsx` with a compatibility re-export**

```tsx
export { BackButton, IconButton, TopBar } from '../ui';
```

- [ ] **Step 14: Replace `src/shared/components/SettingToggle.tsx` with a compatibility wrapper**

```tsx
import React from 'react';
import { ToggleControl } from '../ui';

interface SettingToggleProps {
  label: string;
  icon: React.ReactNode;
  description?: string;
  checked: boolean;
  onToggle: () => void;
  iconBackgroundClassName: string;
  activeColorClassName?: string;
  className?: string;
}

export function SettingToggle(props: SettingToggleProps) {
  return <ToggleControl {...props} />;
}
```

- [ ] **Step 15: Verify Task 1**

Run:

```bash
npm run lint
```

Expected: TypeScript and ESLint pass. If lint fails because `OverlayFrame.tsx` uses random values in `useMemo`, match the existing overlay approach by adding the same local `/* eslint-disable react-hooks/purity */` and `/* eslint-enable react-hooks/purity */` comments around that `useMemo`.

- [ ] **Step 16: Commit Task 1**

```bash
git add src/shared/ui src/shared/components/TopBar.tsx src/shared/components/SettingToggle.tsx
git commit -m "feat: add shared UI primitives"
```

---

### Task 2: Add Hidden UI Kit Route

**Files:**
- Create: `src/shared/ui/UiKitScreen.tsx`
- Modify: `src/shared/ui/index.ts`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create `src/shared/ui/UiKitScreen.tsx`**

```tsx
import React from 'react';
import { Loader2, Mic, Play, Settings, Volume2 } from 'lucide-react';
import { AppScreen } from './AppScreen';
import { BackButton, IconButton } from './IconButton';
import { TopBar } from './TopBar';
import { RoundCounter } from './RoundCounter';
import { Button } from './Button';
import { Card } from './Card';
import { ChoiceTile } from './ChoiceTile';
import { SearchInput, SegmentedChoice, TextAreaControl, ToggleControl } from './FormControls';
import { OverlayFrame } from './OverlayFrame';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-black sm:text-3xl">{title}</h2>
      {children}
    </section>
  );
}

export function UiKitScreen() {
  return (
    <AppScreen fixedHeight={false} scrollable maxWidth="wide" contentClassName="gap-8 pb-8">
      <TopBar
        left={<BackButton onClick={() => window.history.back()} />}
        center={<RoundCounter completed={2} total={5} />}
        right={<IconButton label="Nastavenia"><Settings size={24} /></IconButton>}
      />

      <header className="space-y-2">
        <h1 className="text-4xl font-black sm:text-6xl">UI Kit</h1>
        <p className="max-w-3xl text-lg font-medium opacity-65">
          Interná knižnica komponentov pre Hravé Učenie. Táto stránka je skrytá z detskej navigácie a slúži na kontrolu komponentov a stavov.
        </p>
      </header>

      <Section title="Actions">
        <Card className="flex flex-wrap items-center gap-4">
          <Button variant="primary" icon={<Settings size={22} />}>Primárne</Button>
          <Button variant="secondary">Sekundárne</Button>
          <Button variant="quiet">Tiché</Button>
          <Button variant="danger">Dôležité</Button>
          <Button variant="primary" disabled>Vypnuté</Button>
          <Button variant="primary" icon={<Loader2 size={20} className="animate-spin" />}>Odosielam</Button>
          <Button variant="play" aria-label="Hrať"><Play size={56} fill="currentColor" /></Button>
          <IconButton label="Prehrať"><Volume2 size={24} /></IconButton>
          <IconButton label="Nahrať"><Mic size={24} /></IconButton>
        </Card>
      </Section>

      <Section title="Surfaces">
        <div className="grid gap-4 md:grid-cols-3">
          <Card><h3 className="text-xl font-bold">Karta</h3><p className="mt-2 font-medium opacity-60">Štandardný biely povrch.</p></Card>
          <Card variant="panel"><h3 className="text-xl font-bold">Panel</h3><p className="mt-2 font-medium opacity-60">Silnejší povrch pre hru.</p></Card>
          <Card variant="inset"><h3 className="text-xl font-bold">Vnorený blok</h3><p className="mt-2 font-medium opacity-60">Používa sa v nastaveniach.</p></Card>
        </div>
      </Section>

      <Section title="Choices">
        <Card className="space-y-5">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            <ChoiceTile state="neutral"><span className="text-5xl">A</span></ChoiceTile>
            <ChoiceTile state="selected"><span className="text-5xl">B</span></ChoiceTile>
            <ChoiceTile state="correct"><span className="text-5xl">C</span></ChoiceTile>
            <ChoiceTile state="wrong"><span className="text-5xl">D</span></ChoiceTile>
            <ChoiceTile disabled><span className="text-5xl">E</span></ChoiceTile>
          </div>
          <SegmentedChoice options={[4, 6, 8]} selected={6} onSelect={() => undefined} formatLabel={(value) => `${value} kariet`} />
        </Card>
      </Section>

      <Section title="Forms">
        <Card className="space-y-5">
          <ToggleControl label="Hudba" description="Hudba na pozadí počas hrania" checked onToggle={() => undefined} icon={<Volume2 size={24} />} />
          <SearchInput value="mama" onChange={() => undefined} onClear={() => undefined} placeholder="Hľadať..." />
          <TextAreaControl value="Správa pre tím" onChange={() => undefined} rows={3} />
        </Card>
      </Section>

      <Section title="Overlay Frame">
        <OverlayFrame show inline tone="success" confetti panelClassName="bg-white shadow-block">
          <div className="text-6xl">🎉</div>
          <h3 className="mt-2 text-4xl font-black text-primary">Výborne!</h3>
          <p className="mt-3 text-2xl font-extrabold text-text-main">Ukážka panelu</p>
        </OverlayFrame>
      </Section>
    </AppScreen>
  );
}
```

- [ ] **Step 2: Export `UiKitScreen` from `src/shared/ui/index.ts`**

Add this line:

```ts
export * from './UiKitScreen';
```

- [ ] **Step 3: Add hidden route in `src/App.tsx`**

Add import:

```tsx
import { UiKitScreen } from './shared/ui';
```

Add route before the catch-all route:

```tsx
          <Route
            path="/ui-kit"
            element={
              <ErrorBoundary>
                <UiKitScreen />
              </ErrorBoundary>
            }
          />
```

- [ ] **Step 4: Verify Task 2**

Run:

```bash
npm run lint
npm run build
```

Expected: both commands pass. `npm run build` should include the UI kit route without adding any new dependency.

- [ ] **Step 5: Commit Task 2**

```bash
git add src/shared/ui/UiKitScreen.tsx src/shared/ui/index.ts src/App.tsx
git commit -m "feat: add hidden UI kit route"
```

---

### Task 3: Migrate Settings, Feedback, And Recording UI

**Files:**
- Modify: `src/shared/components/SettingsScreen.tsx`
- Modify: `src/shared/components/SettingsOverlay.tsx`
- Modify: `src/shared/components/SettingsContent.tsx`
- Modify: `src/shared/components/FeedbackModal.tsx`
- Modify: `src/recordings/AudioRecordingScreen.tsx`
- Modify: `src/recordings/RecordingListItem.tsx`
- Modify: `src/shared/ui/UiKitScreen.tsx`

- [ ] **Step 1: Migrate settings screens to `AppScreen` and shared UI imports**

In `SettingsScreen.tsx`, import from UI:

```tsx
import { AppScreen, BackButton, TopBar } from '../ui';
```

Replace the outer JSX shell with:

```tsx
    <AppScreen fixedHeight={false} scrollable maxWidth="narrow">
      <TopBar left={<BackButton onClick={() => navigate('/')} />} />

      <div className="mb-6 text-center sm:mb-8">
        <h2 className="mb-2 text-3xl font-bold sm:text-5xl">Rodičovská zóna</h2>
        <p className="text-base font-medium opacity-60 sm:text-xl">Nastavenia</p>
      </div>

      <SettingsContent
        target="home"
        settings={settings}
        onUpdate={onUpdate}
        onManageRecordings={() => navigate('/recordings')}
      />
    </AppScreen>
```

- [ ] **Step 2: Migrate settings overlay shell**

In `SettingsOverlay.tsx`, import:

```tsx
import { ArrowLeft } from 'lucide-react';
import { Button, Card } from '../ui';
```

Keep the fixed overlay wrapper, but replace the modal container and close button with:

```tsx
      <Card variant="modal" className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden p-0">
        <div className="shrink-0 border-b-2 border-shadow/30 bg-bg-light/50 p-6 text-center sm:p-10">
          <h2 className="mb-1 text-3xl font-bold sm:mb-2 sm:text-5xl">Rodičovská zóna</h2>
          <p className="text-base font-medium opacity-60 sm:text-xl">{getSettingsSubtitle(gameId)}</p>
        </div>

        <SettingsContent target={gameId} settings={settings} onUpdate={onUpdate} />

        <div className="shrink-0 border-t-2 border-shadow/30 bg-bg-light/50 p-6 sm:p-8">
          <Button onClick={onClose} variant="secondary" fullWidth icon={<ArrowLeft size={24} className="sm:h-8 sm:w-8" />}>
            Späť
          </Button>
        </div>
      </Card>
```

- [ ] **Step 3: Migrate settings content local helpers**

In `SettingsContent.tsx`, import shared primitives:

```tsx
import { Button, Card, SegmentedChoice, ToggleControl } from '../ui';
```

Change `SettingsCard` to:

```tsx
function SettingsCard({ children }: SettingsCardProps) {
  return <Card>{children}</Card>;
}
```

Change `SettingsSection` to:

```tsx
function SettingsSection({ children }: SettingsSectionProps) {
  return <Card variant="inset">{children}</Card>;
}
```

Replace each `SettingToggle` usage with `ToggleControl` using the same props.

Replace the body of `SettingsRangeCard` after the description with:

```tsx
      <div className="mt-5">
        <SegmentedChoice
          options={options}
          selected={selected}
          activeClassName={activeClassName}
          formatLabel={formatLabel}
          onSelect={onSelect}
          columns={options.length === 2 ? 2 : 3}
        />
      </div>
```

Replace the recordings and feedback action buttons with `Button`:

```tsx
          <Button onClick={onManageRecordings} fullWidth className="mt-5" icon={<Mic size={24} />}>
            Spravovať nahrávky
          </Button>
```

```tsx
          <Button onClick={() => setIsFeedbackOpen(true)} fullWidth className="mt-5" icon={<MessageSquare size={24} />}>
            Odoslať spätnú väzbu
          </Button>
```

- [ ] **Step 4: Migrate feedback modal**

In `FeedbackModal.tsx`, import:

```tsx
import { AppScreen, BackButton, Button, Card, ChoiceTile, TextAreaControl, TopBar } from '../ui';
```

Replace the outer wrapper with `AppScreen fixedHeight maxWidth="narrow"`.

Replace category buttons with:

```tsx
                  <ChoiceTile
                    key={value}
                    shape="option"
                    state={category === value ? 'selected' : 'neutral'}
                    disabled={formState === 'submitting'}
                    className="text-base sm:text-lg"
                    onClick={() => setCategory(value)}
                  >
                    {emoji} {label}
                  </ChoiceTile>
```

Replace the two form `<section>` wrappers with `<Card>...</Card>`.

Replace `textarea` with:

```tsx
              <TextAreaControl
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, MAX_LENGTH))}
                disabled={formState === 'submitting'}
                placeholder="Opíšte čo sa stalo, čo vám chýba, alebo čo by ste chceli vylepšiť…"
                rows={4}
                className="mt-4"
              />
```

Replace submit button with:

```tsx
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit}
              fullWidth
              icon={formState === 'submitting' ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
            >
              {formState === 'submitting' ? 'Odosielam' : 'Odoslať'}
            </Button>
```

- [ ] **Step 5: Migrate audio recording screen controls**

In `AudioRecordingScreen.tsx`, import from UI:

```tsx
import { AppScreen, BackButton, ChoiceTile, SearchInput, ToggleControl, TopBar } from '../shared/ui';
```

Replace the outer wrapper with:

```tsx
    <AppScreen maxWidth="narrow">
      <TopBar left={<BackButton onClick={() => navigate(-1)} />} />
      ...
    </AppScreen>
```

Replace the Auto toggle row with `ToggleControl`:

```tsx
            <ToggleControl
              label="Auto"
              checked={autoProgress}
              onToggle={() => setAutoProgress((value) => !value)}
              iconBackgroundClassName="bg-accent-blue/35"
              activeColorClassName="bg-accent-blue"
            />
```

Replace the search input with:

```tsx
            <SearchInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch('')}
              placeholder="Hľadať…"
            />
```

Replace category buttons with `ChoiceTile shape="pill"`:

```tsx
                <ChoiceTile
                  key={cat}
                  shape="pill"
                  state={activeCategory === cat ? 'selected' : 'neutral'}
                  className="whitespace-nowrap text-base font-semibold"
                  onClick={() => setActiveCategory(cat)}
                >
                  {CATEGORY_LABELS[cat]}
                </ChoiceTile>
```

- [ ] **Step 6: Migrate recording list row actions**

In `RecordingListItem.tsx`, import:

```tsx
import { Card, IconButton } from '../shared/ui';
```

Replace the root `<div className={rowClass}>` with:

```tsx
    <Card variant="row" className={rowClass.replace('flex items-center gap-2 px-4 py-3 rounded-2xl transition-colors ', 'flex items-center gap-2 transition-colors ')}>
```

Close it with `</Card>`.

Replace action class constants with:

```tsx
  const compactActionClass = 'h-9 w-9 shadow-sm active:opacity-60 active:translate-y-0';
```

Replace delete/play/record buttons with `IconButton`:

```tsx
              <IconButton onClick={onDelete} className={`${compactActionClass} bg-shadow/20 text-text-main/70`} label="Zmazať nahrávku">
                <Trash2 size={16} />
              </IconButton>
```

```tsx
            <IconButton onClick={onPlay} className={`${compactActionClass} bg-accent-blue/45 text-text-main`} label="Prehrať">
              <Play size={16} />
            </IconButton>
```

```tsx
            <IconButton onClick={onRecord} className={`${compactActionClass} bg-soft-watermelon/45 text-text-main`} label="Nahrať">
              <Mic size={16} />
            </IconButton>
```

- [ ] **Step 7: Update UI kit examples**

In `UiKitScreen.tsx`, add one example for:

```tsx
<Card variant="row" className="flex items-center gap-3">
  <Mic size={18} className="text-accent-blue" />
  <span className="flex-1 text-lg font-medium">mama 👩</span>
  <IconButton label="Prehrať" className="h-9 w-9"><Play size={16} /></IconButton>
</Card>
```

- [ ] **Step 8: Verify Task 3**

Run:

```bash
npm run lint
npm run build
```

Expected: both pass. Manually inspect `/settings`, `/recordings`, and feedback modal entry from settings for obvious layout regressions.

- [ ] **Step 9: Commit Task 3**

```bash
git add src/shared/components/SettingsScreen.tsx src/shared/components/SettingsOverlay.tsx src/shared/components/SettingsContent.tsx src/shared/components/FeedbackModal.tsx src/recordings/AudioRecordingScreen.tsx src/recordings/RecordingListItem.tsx src/shared/ui/UiKitScreen.tsx
git commit -m "refactor: standardize parent and recording UI"
```

---

### Task 4: Migrate Shared Game Shells And Tiles

**Files:**
- Modify: `src/shared/components/GameLobby.tsx`
- Modify: `src/shared/components/FindItGame.tsx`
- Modify: `src/shared/components/ParentsGate.tsx`
- Modify: `src/shared/components/ErrorBoundary.tsx`
- Modify: `src/App.tsx`
- Modify: `src/shared/ui/UiKitScreen.tsx`

- [ ] **Step 1: Migrate `GameLobby.tsx` imports**

Use:

```tsx
import { BackButton, Button, IconButton, TopBar, AppScreen } from '../ui';
```

Replace the root wrapper with:

```tsx
    <AppScreen className="items-center" contentClassName="relative">
```

Keep the title rendering and decorative elements.

Replace the settings button with:

```tsx
    <IconButton label="Nastavenia" onClick={onOpenSettings}>
      <Settings size={24} className="sm:h-7 sm:w-7" />
    </IconButton>
```

Replace the play button with:

```tsx
          <Button onClick={onPlay} aria-label="Hrať" variant="play" className={playButtonColorClassName}>
            <Play size={42} className="ml-1.5 sm:ml-3 sm:h-16 sm:w-16 md:h-20 md:w-20" fill="currentColor" />
          </Button>
```

- [ ] **Step 2: Migrate `FindItGame.tsx` to shared UI**

Update imports:

```tsx
import { BackButton, ChoiceTile, IconButton, RoundCounter, TopBar, AppScreen } from '../ui';
```

Replace replay button with:

```tsx
  const replayButton = (
    <IconButton
      label="Prehrať zvuk"
      onClick={() => targetItem && audioManager.play(
        descriptor.getReplayAudio ? descriptor.getReplayAudio(targetItem) : descriptor.getPromptAudio(targetItem)
      )}
    >
      <Volume2 size={24} className="sm:h-7 sm:w-7" />
    </IconButton>
  );
```

Replace the root shell with:

```tsx
    <AppScreen>
```

Replace the counter center with:

```tsx
            <RoundCounter completed={roundsPlayed} total={maxRounds} />
```

Replace each grid card `<button>` with:

```tsx
              <ChoiceTile
                key={descriptor.getItemId(item)}
                onClick={() => handleCardClick(item, i)}
                aria-label={descriptor.getItemId(item)}
                state={feedback[i] === 'correct' ? 'correct' : feedback[i] === 'wrong' ? 'wrong' : 'neutral'}
                className="w-full overflow-hidden"
              >
                {descriptor.renderCard(item)}
              </ChoiceTile>
```

- [ ] **Step 3: Migrate `ParentsGate.tsx` obvious button/card surfaces**

Import:

```tsx
import { AppScreen, Button, Card } from '../ui';
```

Use `AppScreen maxWidth="narrow"` for the root and `Card variant="panel"` for the challenge display and answer display. Replace keypad buttons with `Button variant="quiet"` and submit with `Button variant="primary"`.

The keypad number button shape should be:

```tsx
<Button key={number} variant="quiet" className="py-5 text-2xl" onClick={() => handleDigit(number)}>
  {number}
</Button>
```

- [ ] **Step 4: Migrate `ErrorBoundary.tsx` retry button**

Import:

```tsx
import { Button } from '../ui';
```

Replace the retry `<button>` with:

```tsx
          <Button onClick={() => window.location.reload()} variant="danger" size="lg">
            Skúsiť znova
          </Button>
```

- [ ] **Step 5: Migrate home screen obvious components in `App.tsx`**

Import:

```tsx
import { AppScreen, IconButton } from './shared/ui';
```

In `HomeLauncher`, replace the outer wrapper with `AppScreen maxWidth="wide" className="p-4 sm:p-6 lg:p-8"` and use `IconButton` for settings:

```tsx
          <IconButton
            onClick={onOpenSettings}
            label="Nastavenia"
            className="h-14 w-14 bg-shadow/20 hover:scale-105 active:scale-95 sm:h-[4.5rem] sm:w-[4.5rem] lg:h-20 lg:w-20"
          >
            <div className="absolute h-10 w-10 rounded-full bg-white/20 blur-sm sm:h-14 sm:w-14" />
            <Settings size={28} className="relative text-text-main opacity-80 sm:h-9 sm:w-9 lg:h-10 lg:w-10" />
          </IconButton>
```

Keep home game cards in this task unless extracting them is simpler than retaining them.

- [ ] **Step 6: Update UI kit with a find-it tile grid sample**

Add:

```tsx
<div className="grid max-w-md grid-cols-2 gap-4">
  <ChoiceTile><span className="text-6xl">M</span></ChoiceTile>
  <ChoiceTile state="correct"><span className="text-6xl">A</span></ChoiceTile>
  <ChoiceTile state="wrong"><span className="text-6xl">S</span></ChoiceTile>
  <ChoiceTile><span className="text-6xl">O</span></ChoiceTile>
</div>
```

- [ ] **Step 7: Verify Task 4**

Run:

```bash
npm run lint
npm run build
```

Expected: both pass. Browser-check `/`, `/alphabet`, `/syllables`, `/numbers`, `/words`, and parent gate entry from settings.

- [ ] **Step 8: Commit Task 4**

```bash
git add src/shared/components/GameLobby.tsx src/shared/components/FindItGame.tsx src/shared/components/ParentsGate.tsx src/shared/components/ErrorBoundary.tsx src/App.tsx src/shared/ui/UiKitScreen.tsx
git commit -m "refactor: standardize shared game UI"
```

---

### Task 5: Migrate Bespoke Game Surfaces

**Files:**
- Modify: `src/games/counting/CountingItemsGame.tsx`
- Modify: `src/games/assembly/AssemblyGame.tsx`
- Modify: `src/shared/ui/UiKitScreen.tsx`

- [ ] **Step 1: Migrate counting game imports**

Replace direct icon button/header imports with:

```tsx
import { AppScreen, BackButton, Card, ChoiceTile, IconButton, RoundCounter, TopBar } from '../../shared/ui';
```

Keep `Volume2` and `RefreshCw` from `lucide-react`.

- [ ] **Step 2: Replace counting game playing shell**

Replace the playing root with:

```tsx
    <AppScreen>
      <div className="flex-1 min-h-0 w-full max-w-5xl flex flex-col gap-3 sm:gap-4 md:gap-5">
```

Replace the manual header grid with:

```tsx
        <TopBar
          left={<BackButton onClick={() => setGameState('HOME')} />}
          center={<RoundCounter completed={roundsPlayed} total={MAX_ROUNDS} />}
          right={
            <IconButton label="Prehrať zvuk" onClick={() => audioManager.play({ clips: [getPhraseClip(locale, 'countItems')] })}>
              <Volume2 size={24} className="sm:h-7 sm:w-7" />
            </IconButton>
          }
        />
```

Replace the counting item area wrapper with:

```tsx
        <Card
          ref={containerRef}
          variant="inset"
          className="relative flex-1 min-h-[220px] overflow-hidden rounded-[30px] border-4 border-dashed border-shadow/20 bg-white/50 sm:rounded-[44px]"
        >
```

Close it with `</Card>`.

Replace number option buttons with:

```tsx
              <ChoiceTile
                key={i}
                onClick={() => handleOptionClick(item, i)}
                state={feedback[i] === 'correct' ? 'correct' : feedback[i] === 'wrong' ? 'wrong' : 'neutral'}
                className="aspect-[4/5] w-full text-4xl font-bold font-spline sm:aspect-square sm:text-6xl md:text-7xl"
              >
                {item.value}
              </ChoiceTile>
```

- [ ] **Step 3: Migrate assembly game imports**

Replace `ArrowLeft` usage with `BackButton` and import:

```tsx
import { AppScreen, BackButton, Card, IconButton, RoundCounter, TopBar } from '../../shared/ui';
```

Keep `Volume2` from `lucide-react`.

- [ ] **Step 4: Replace assembly manual header and panels**

Replace playing root with:

```tsx
    <AppScreen>
```

Replace the manual header grid with:

```tsx
        <TopBar
          left={<BackButton onClick={handleBackToLobby} />}
          center={<RoundCounter completed={roundsPlayed} total={MAX_ROUNDS} />}
          right={
            <IconButton label="Prehrať slovo" onClick={() => playPromptAudio(targetWord)}>
              <Volume2 size={24} className="sm:h-7 sm:w-7" />
            </IconButton>
          }
        />
```

Replace emoji display panel with:

```tsx
          <Card variant="panel" className="min-w-[180px] px-8 py-6 text-center sm:min-w-[220px] sm:px-12 sm:py-8">
```

Replace answer board wrapper with:

```tsx
        <Card variant="panel" className={`mx-auto w-full max-w-3xl bg-white/70 p-4 transition-all sm:p-6 ${wrongPulse ? 'ring-4 ring-soft-watermelon scale-[1.01]' : ''}`}>
```

Replace tray wrapper with:

```tsx
        <Card variant="panel" className="mx-auto w-full max-w-3xl p-4 sm:p-6">
```

Keep `TileButton` as a bespoke assembly component because it has fixed animation dimensions and data attributes needed by GSAP.

- [ ] **Step 5: Update UI kit with bespoke examples**

Add one counting-like panel and one assembly-like tile sample:

```tsx
<Card variant="inset" className="relative min-h-[180px] overflow-hidden border-4 border-dashed border-shadow/20 bg-white/50">
  <span className="absolute left-[30%] top-[40%] text-6xl">🍎</span>
  <span className="absolute left-[55%] top-[55%] text-6xl">🍎</span>
</Card>
```

```tsx
<div className="flex flex-wrap gap-3">
  <span className="rounded-[24px] border-2 border-white/30 bg-accent-blue px-8 py-5 text-3xl font-black uppercase tracking-wide text-white">ma</span>
  <span className="rounded-[24px] border-2 border-white/30 bg-accent-blue px-8 py-5 text-3xl font-black uppercase tracking-wide text-white">ma</span>
</div>
```

- [ ] **Step 6: Verify Task 5**

Run:

```bash
npm run lint
npm run build
```

Expected: both pass. Browser-check `/counting` and `/assembly`, including successful and wrong-answer states.

- [ ] **Step 7: Commit Task 5**

```bash
git add src/games/counting/CountingItemsGame.tsx src/games/assembly/AssemblyGame.tsx src/shared/ui/UiKitScreen.tsx
git commit -m "refactor: standardize bespoke game surfaces"
```

---

### Task 6: Migrate Overlay Shells

**Files:**
- Modify: `src/shared/components/SuccessOverlay.tsx`
- Modify: `src/shared/components/FailureOverlay.tsx`
- Modify: `src/shared/components/SessionCompleteOverlay.tsx`
- Modify: `src/shared/ui/UiKitScreen.tsx`

- [ ] **Step 1: Migrate success overlay to `OverlayFrame`**

Import:

```tsx
import { OverlayFrame, IconButton } from '../ui';
```

Remove the local confetti `useMemo` and confetti rendering block.

Replace the return wrapper with:

```tsx
  return (
    <OverlayFrame
      show={show}
      tone="success"
      confetti
      onBackdropClick={() => {
        cancelledRef.current = true;
        audioManager.stop();
        onComplete();
      }}
      panelClassName="bg-gradient-to-br from-[#fff8f0] to-[#ffecd2] shadow-[0_8px_0_#f0c99a,0_20px_60px_rgba(0,0,0,.10)]"
    >
      ...
    </OverlayFrame>
  );
```

Replace pause/close button with:

```tsx
            <IconButton
              onClick={paused ? onComplete : handlePause}
              label={paused ? 'Zavrieť' : 'Pauza'}
              className="absolute right-4 top-4 h-10 w-10 text-[#aaa] shadow-[0_2px_8px_rgba(0,0,0,.10)] hover:text-[#666] sm:h-10 sm:w-10"
            >
              {paused ? <X size={20} /> : <Pause size={20} />}
            </IconButton>
```

- [ ] **Step 2: Migrate failure overlay to `OverlayFrame`**

Import:

```tsx
import { OverlayFrame } from '../ui';
```

Replace the return wrapper with:

```tsx
  return (
    <OverlayFrame
      show={show}
      tone="failure"
      onBackdropClick={() => {
        cancelledRef.current = true;
        audioManager.stop();
        onComplete();
      }}
      panelClassName="bg-gradient-to-br from-[#eef2ff] to-[#dde6ff] shadow-[0_8px_0_#b0c0f0,0_20px_60px_rgba(0,0,0,.15)]"
    >
      ...
    </OverlayFrame>
  );
```

- [ ] **Step 3: Migrate session-complete overlay to `OverlayFrame`**

Import:

```tsx
import { OverlayFrame } from '../ui';
```

Remove local confetti `useMemo` and rendering block.

Replace the return wrapper with:

```tsx
  return (
    <OverlayFrame
      show={show}
      tone="success"
      confetti
      onBackdropClick={onComplete}
      panelClassName="bg-gradient-to-br from-[#fff8f0] to-[#ffecd2] shadow-[0_8px_0_#f0c99a,0_20px_60px_rgba(0,0,0,.10)]"
    >
      ...
    </OverlayFrame>
  );
```

- [ ] **Step 4: Update UI kit overlay examples**

Add a failure sample next to the existing success sample:

```tsx
<OverlayFrame show inline tone="failure" panelClassName="bg-gradient-to-br from-[#eef2ff] to-[#dde6ff] shadow-block">
  <div className="text-6xl">🤗</div>
  <h3 className="mt-2 text-4xl font-black text-[#3a4a8a]">Nevadí!</h3>
  <p className="mt-3 text-2xl font-extrabold text-[#3a4a8a]">Je to: M ⭐</p>
</OverlayFrame>
```

- [ ] **Step 5: Verify Task 6**

Run:

```bash
npm run lint
npm run build
```

Expected: both pass. Browser-check a success, failure, and session-complete overlay in any game.

- [ ] **Step 6: Commit Task 6**

```bash
git add src/shared/components/SuccessOverlay.tsx src/shared/components/FailureOverlay.tsx src/shared/components/SessionCompleteOverlay.tsx src/shared/ui/UiKitScreen.tsx
git commit -m "refactor: standardize overlay frames"
```

---

### Task 7: Update Project Documentation

**Files:**
- Modify: `AGENTS.md`
- Modify: `CLAUDE.md`
- Modify: `README.md`
- Modify: `docs/superpowers/specs/2026-04-25-ui-component-library-consolidation-design.md` only if the implementation intentionally changes the documented component boundaries.

- [ ] **Step 1: Add UI library guidance to `AGENTS.md`**

Add this section after `## Architecture` or before `## Audio files`:

```md
## UI Component Library

Shared UI primitives live in `src/shared/ui/`. New UI should use these primitives before adding one-off Tailwind class strings:

- `AppScreen` for full-screen shells and standard responsive padding.
- `TopBar`, `BackButton`, `IconButton`, and `RoundCounter` for game and parent-screen navigation.
- `Button`, `Card`, `ChoiceTile`, and form controls for repeated actions, surfaces, selectable tiles, and settings/feedback inputs.
- `OverlayFrame` for modal feedback shells.

The hidden `/ui-kit` route is the designer-review surface for shared UI components and states. When adding or changing a shared component, update its `/ui-kit` example in the same change. If the component API or usage contract changes, update this file and `README.md`.

This consolidation phase standardizes the current playful UI. Do not introduce a broad redesign unless the task explicitly asks for one, but prefer shared component consistency over preserving old one-off spacing, colors, typography, or radii.
```

- [ ] **Step 2: Add the same section to `CLAUDE.md`**

Use the exact same Markdown section from Step 1.

- [ ] **Step 3: Add README section**

Add this section after `## Architecture`:

```md
## UI Component Library

Reusable UI primitives live in `src/shared/ui/`. They standardize the current app shell, top bars, buttons, cards, selectable tiles, form controls, overlays, and game counters.

The hidden `/ui-kit` route shows the component inventory with real app labels and representative states for UX review. It is not linked from the child-facing home screen.

When changing shared UI, keep three things aligned:

- the primitive implementation in `src/shared/ui/`
- the matching example or state on `/ui-kit`
- this README and agent instructions if the usage contract changes
```

- [ ] **Step 4: Verify Task 7**

Run:

```bash
npm run lint
npm run build
```

Expected: both pass; docs changes do not affect runtime.

- [ ] **Step 5: Commit Task 7**

```bash
git add AGENTS.md CLAUDE.md README.md docs/superpowers/specs/2026-04-25-ui-component-library-consolidation-design.md
git commit -m "docs: document shared UI library"
```

---

### Task 8: Final Verification And Cleanup

**Files:**
- Modify only files needed to fix verification failures found in this task.

- [ ] **Step 1: Run full verification commands**

```bash
npm run lint
npm run build
```

Expected: both commands pass without TypeScript or build errors.

- [ ] **Step 2: Start dev server**

```bash
npm run dev
```

Expected: Vite starts on port 3000 and prints a local URL.

- [ ] **Step 3: Browser-check required routes**

Open these routes:

```text
http://localhost:3000/
http://localhost:3000/alphabet
http://localhost:3000/counting
http://localhost:3000/assembly
http://localhost:3000/settings
http://localhost:3000/recordings
http://localhost:3000/ui-kit
```

Expected:

- All routes render without blank screens.
- `/ui-kit` is available directly but not linked from the child-facing home screen.
- Shared button, card, tile, form, top-bar, counter, and overlay styles look consistent.
- The app still reads as the current playful preschool app, not a new redesign.
- Standardized spacing, colors, typography, and radii are accepted even where they differ from the previous one-off implementation.

- [ ] **Step 4: Check for obvious leftover duplicate patterns**

Run:

```bash
rg "grid grid-cols-\\[auto_1fr_auto\\]|✓ \\{roundsPlayed\\}|rounded-\\[48px\\].*border-\\[6px\\]|shadow-\\[0_12px_28px" src
```

Expected: no results for duplicated top-bar/counter/overlay/card patterns outside `src/shared/ui/` and intentionally bespoke assembly tile styles.

- [ ] **Step 5: Stop dev server**

Stop the `npm run dev` process with `Ctrl-C`.

- [ ] **Step 6: Commit final fixes if any were needed**

If Step 1 through Step 4 required code fixes:

```bash
git add src AGENTS.md CLAUDE.md README.md docs/superpowers/specs/2026-04-25-ui-component-library-consolidation-design.md
git commit -m "fix: complete UI library verification"
```

If no fixes were needed, do not create an empty commit.
