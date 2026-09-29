/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Tabs, cn } from '../shared/ui';

export interface ContentCategoryNavItem<T extends string> {
  id: T;
  label: string;
  count: number;
}

export interface ContentCategoryNavProps<T extends string> {
  items: readonly ContentCategoryNavItem<T>[];
  value: T;
  onValueChange: (value: T) => void;
  /** Vertical renders a rail (enough width for nav + list side by side); horizontal renders scrollable tabs. */
  orientation: 'horizontal' | 'vertical';
  children: React.ReactNode;
  className?: string;
}

/**
 * Category navigation for /content. Wraps the shared Tabs primitive — its only
 * production consumer — with per-category counts and, in horizontal (compact)
 * mode, measured scroll controls so every category remains reachable on a
 * narrow screen.
 */
export function ContentCategoryNav<T extends string>({
  items,
  value,
  onValueChange,
  orientation,
  children,
  className,
}: ContentCategoryNavProps<T>) {
  const isHorizontal = orientation === 'horizontal';
  const listElRef = useRef<HTMLDivElement | null>(null);
  const [canScrollStart, setCanScrollStart] = useState(false);
  const [canScrollEnd, setCanScrollEnd] = useState(false);
  const hasOverflow = canScrollStart || canScrollEnd;

  const measure = useCallback(() => {
    const el = listElRef.current;
    if (!el) return;
    setCanScrollStart(el.scrollLeft > 1);
    setCanScrollEnd(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    if (!isHorizontal) return undefined;
    const el = listElRef.current;
    if (!el) return undefined;
    measure();
    el.addEventListener('scroll', measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => {
      el.removeEventListener('scroll', measure);
      observer.disconnect();
    };
  }, [isHorizontal, measure, items.length]);

  const setListRef = useCallback((node: HTMLDivElement | null) => {
    listElRef.current = node;
  }, []);

  const scrollList = useCallback((direction: -1 | 1) => {
    const el = listElRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth, behavior: 'smooth' });
  }, []);

  return (
    <Tabs
      items={items.map(item => ({ value: item.id, label: `${item.label} (${item.count})` }))}
      value={value}
      onValueChange={next => onValueChange(next as T)}
      ariaLabel="Kategórie vlastného obsahu"
      orientation={orientation}
      className={cn(
        'gap-3',
        // In the rail layouts, the nav/list pair must occupy the first two
        // tracks of the parent composition.  Keeping this grid here (rather
        // than inside each panel) means the same tabs preserve their Radix
        // keyboard semantics at every breakpoint.
        !isHorizontal && 'col-span-2 grid grid-cols-subgrid items-start gap-6',
        className,
      )}
      listRef={isHorizontal ? setListRef : undefined}
      listClassName={
        isHorizontal
          ? cn(
              'flex-nowrap overflow-x-auto no-scrollbar scroll-px-2 [&>[role=tab]]:shrink-0 [&>[role=tab]]:whitespace-nowrap',
              hasOverflow && 'px-12',
            )
          : 'flex-col items-stretch gap-1'
      }
      listOverlay={
        isHorizontal && hasOverflow ? (
          <>
            <button
              type="button"
              aria-label="Posunúť kategórie doľava"
              data-testid="content-tabs-scroll-left"
              disabled={!canScrollStart}
              onClick={() => scrollList(-1)}
              className="absolute inset-y-0 left-0 z-10 flex min-h-11 w-11 items-center justify-center rounded-xl border border-border-subtle bg-canvas text-text-main shadow-sm disabled:opacity-40"
            >
              <ChevronLeft aria-hidden="true" size={20} />
            </button>
            <button
              type="button"
              aria-label="Posunúť kategórie doprava"
              data-testid="content-tabs-scroll-right"
              disabled={!canScrollEnd}
              onClick={() => scrollList(1)}
              className="absolute inset-y-0 right-0 z-10 flex min-h-11 w-11 items-center justify-center rounded-xl border border-border-subtle bg-canvas text-text-main shadow-sm disabled:opacity-40"
            >
              <ChevronRight aria-hidden="true" size={20} />
            </button>
          </>
        ) : undefined
      }
    >
      {children}
    </Tabs>
  );
}
