/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
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
 * mode, a measured edge-fade cue so a scrollable tab strip never looks like a
 * dead end on a narrow screen.
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
          ? 'flex-nowrap overflow-x-auto no-scrollbar scroll-px-2'
          : 'flex-col items-stretch gap-1'
      }
      listOverlay={
        isHorizontal ? (
          <>
            <div
              aria-hidden="true"
              data-testid="content-tabs-fade-start"
              className={cn(
                'pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-canvas to-transparent transition-opacity',
                canScrollStart ? 'opacity-100' : 'opacity-0',
              )}
            />
            <div
              aria-hidden="true"
              data-testid="content-tabs-fade-end"
              className={cn(
                'pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-canvas to-transparent transition-opacity',
                canScrollEnd ? 'opacity-100' : 'opacity-0',
              )}
            />
          </>
        ) : undefined
      }
    >
      {children}
    </Tabs>
  );
}
