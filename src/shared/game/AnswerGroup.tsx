/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useRef, useState } from 'react';
import { cn } from '../ui';
import { useElementSize } from './useElementSize';

export interface AnswerGroupProps {
  label: string;
  disabled?: boolean;
  orientation?: 'grid' | 'horizontal';
  children: React.ReactNode;
  className?: string;
}

const MIN_TILE_SIZE = 48;

interface Geometry {
  cols: number;
  rows: number;
  tileSize: number;
  gap: number;
}

function calculateGridGeometry(itemCount: number, width: number, height: number, gap: number): Geometry {
  if (!width || !height) {
    const cols = Math.min(itemCount, 2);
    return { cols, rows: Math.ceil(itemCount / cols), tileSize: MIN_TILE_SIZE, gap };
  }

  let best: Geometry | null = null;
  for (let cols = 1; cols <= itemCount; cols += 1) {
    const rows = Math.ceil(itemCount / cols);
    const availableWidth = width - (cols - 1) * gap;
    const availableHeight = height - (rows - 1) * gap;
    const tileSize = Math.floor(Math.min(availableWidth / cols, availableHeight / rows));

    if (tileSize < MIN_TILE_SIZE) continue;

    const candidate: Geometry = { cols, rows, tileSize, gap };
    if (!best || tileSize > best.tileSize || (tileSize === best.tileSize && height < 420 && rows < best.rows)) {
      best = candidate;
    }
  }

  if (best) return best;

  // Nothing reached the minimum child target, so some overflow is unavoidable — but it should be
  // as small as possible. Stacking every tile in a single column (the previous fallback) spilled
  // hundreds of pixels out of the tray and straight over whatever the shell rendered below it.
  // Deriving the column count from the measured width instead keeps the row bounded horizontally
  // exactly as before while making the vertical overflow the smallest it can be.
  const columnsThatFit = Math.max(1, Math.floor((width + gap) / (MIN_TILE_SIZE + gap)));
  const fallbackCols = Math.min(itemCount, columnsThatFit);
  return {
    cols: fallbackCols,
    rows: Math.ceil(itemCount / fallbackCols),
    tileSize: MIN_TILE_SIZE,
    gap,
  };
}

function calculateGeometry(
  itemCount: number,
  width: number,
  height: number,
  orientation: 'grid' | 'horizontal',
): Geometry {
  const gap = height > 0 && height < 420 ? 12 : 16;
  if (itemCount <= 0) {
    return { cols: 1, rows: 1, tileSize: MIN_TILE_SIZE, gap };
  }

  if (orientation === 'horizontal') {
    const cols = itemCount;
    const rows = 1;
    const tileSize = Math.floor(Math.min((width - (cols - 1) * gap) / cols, height));
    if (tileSize >= MIN_TILE_SIZE) return { cols, rows, tileSize, gap };
    return calculateGridGeometry(itemCount, width, height, gap);
  }

  return calculateGridGeometry(itemCount, width, height, gap);
}

function isLayoutPlaceholder(child: React.ReactElement<React.ButtonHTMLAttributes<HTMLButtonElement>>): boolean {
  return (child.props as React.ButtonHTMLAttributes<HTMLButtonElement> & {
    'data-answer-layout-placeholder'?: string;
  })['data-answer-layout-placeholder'] === 'true';
}

export function AnswerGroup({
  label,
  disabled = false,
  orientation = 'grid',
  children,
  className,
}: AnswerGroupProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const { width, height } = useElementSize(outerRef);

  const options = React.Children.toArray(children).filter(
    (child): child is React.ReactElement<React.ButtonHTMLAttributes<HTMLButtonElement>> =>
      React.isValidElement(child),
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const enabledIndices = options.flatMap((child, index) =>
    disabled || child.props.disabled || child.props['aria-disabled'] === 'true'
      || isLayoutPlaceholder(child) ? [] : [index],
  );
  const rovingIndex = enabledIndices.includes(activeIndex)
    ? activeIndex
    : enabledIndices.find(index => index >= activeIndex) ?? enabledIndices[0] ?? -1;

  const geometry = useMemo(
    () => calculateGeometry(options.length || 1, width, height, orientation),
    [options.length, width, height, orientation],
  );
  const usesGrid = orientation === 'grid' || geometry.rows > 1;

  const getOptionButton = (index: number): HTMLButtonElement | null => {
    // Keep `index` in the complete child-slot space used by CSS grid. A placeholder consumes a
    // cell without producing a button, so querying all buttons into a compressed list misaligns
    // arrow-key movement with the rendered rows and columns.
    const child = options[index];
    if (!child || isLayoutPlaceholder(child) || disabled
      || child.props.disabled || child.props['aria-disabled'] === 'true') return null;
    const element = innerRef.current?.children.item(index);
    if (element instanceof HTMLButtonElement) return element;
    return element?.querySelector<HTMLButtonElement>('button') ?? null;
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const sourceIndex = options.findIndex((_, index) => getOptionButton(index) === document.activeElement);
    const resolvedSourceIndex = sourceIndex >= 0 ? sourceIndex : rovingIndex;
    if (resolvedSourceIndex < 0 || options.length === 0) return;

    let targetIndex: number | undefined;

    switch (event.key) {
      case 'ArrowRight': {
        event.preventDefault();
        for (let i = resolvedSourceIndex + 1; i < options.length; i++) {
          if (getOptionButton(i)) {
            targetIndex = i;
            break;
          }
        }
        break;
      }
      case 'ArrowLeft': {
        event.preventDefault();
        for (let i = resolvedSourceIndex - 1; i >= 0; i--) {
          if (getOptionButton(i)) {
            targetIndex = i;
            break;
          }
        }
        break;
      }
      case 'ArrowDown': {
        event.preventDefault();
        if (usesGrid) {
          const candidate = resolvedSourceIndex + geometry.cols;
          if (candidate < options.length && getOptionButton(candidate)) {
            targetIndex = candidate;
          } else if (candidate < options.length) {
            for (let i = candidate + 1; i < options.length; i++) {
              if (getOptionButton(i)) {
                targetIndex = i;
                break;
              }
            }
          }
        }
        break;
      }
      case 'ArrowUp': {
        event.preventDefault();
        if (usesGrid) {
          const candidate = resolvedSourceIndex - geometry.cols;
          if (candidate >= 0 && getOptionButton(candidate)) {
            targetIndex = candidate;
          } else if (candidate >= 0) {
            for (let i = candidate - 1; i >= 0; i--) {
              if (getOptionButton(i)) {
                targetIndex = i;
                break;
              }
            }
          }
        }
        break;
      }
      case 'Home': {
        event.preventDefault();
        for (let i = 0; i < options.length; i++) {
          if (getOptionButton(i)) {
            targetIndex = i;
            break;
          }
        }
        break;
      }
      case 'End': {
        event.preventDefault();
        for (let i = options.length - 1; i >= 0; i--) {
          if (getOptionButton(i)) {
            targetIndex = i;
            break;
          }
        }
        break;
      }
      default:
        return;
    }

    const targetButton = targetIndex === undefined ? null : getOptionButton(targetIndex);
    if (targetIndex !== undefined && targetButton) {
      setActiveIndex(targetIndex);
      targetButton.focus();
    }
  };

  return (
    <div
      ref={outerRef}
      data-testid="game-critical-controls"
      className={cn('flex min-h-0 w-full flex-1 flex-col items-center justify-center', className)}
    >
      <div
        ref={innerRef}
        role="group"
        aria-label={label}
        data-testid="game-answer-region"
        onKeyDown={handleKeyDown}
        className="w-full"
        style={
          usesGrid
            ? ({
                ['--grid-cols' as string]: String(geometry.cols),
                ['--grid-rows' as string]: String(geometry.rows),
                ['--tile-size' as string]: `${geometry.tileSize}px`,
                ['--grid-gap' as string]: `${geometry.gap}px`,
                display: 'grid',
                gridTemplateColumns: `repeat(${geometry.cols}, var(--tile-size))`,
                gridTemplateRows: `repeat(${geometry.rows}, var(--tile-size))`,
                gap: `${geometry.gap}px`,
                justifyContent: 'center',
                alignContent: 'center',
              } as React.CSSProperties)
            : ({
                ['--grid-cols' as string]: String(geometry.cols),
                ['--grid-rows' as string]: String(geometry.rows),
                ['--tile-size' as string]: `${geometry.tileSize}px`,
                ['--grid-gap' as string]: `${geometry.gap}px`,
                display: 'flex',
                flexWrap: 'nowrap',
                overflowX: 'auto',
                gap: `${geometry.gap}px`,
              } as React.CSSProperties)
        }
      >
        {options.map((child, index) => {
          if (isLayoutPlaceholder(child)) return child;
          const isOptionDisabled = disabled || child.props.disabled || child.props['aria-disabled'] === 'true';
          return React.cloneElement(child, {
            tabIndex: isOptionDisabled ? -1 : index === rovingIndex ? 0 : -1,
            disabled: isOptionDisabled,
            onFocus: (event: React.FocusEvent<HTMLButtonElement>) => {
              child.props.onFocus?.(event);
              setActiveIndex(index);
            },
            className: cn(
              child.props.className,
              'min-h-[48px] min-w-[48px]',
            ),
          });
        })}
      </div>
    </div>
  );
}
