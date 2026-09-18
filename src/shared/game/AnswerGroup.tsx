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
    const availWidth = width > 0 ? width - (cols - 1) * gap : 0;
    const cellWidth = availWidth > 0 ? availWidth / cols : MIN_TILE_SIZE;
    const cellHeight = height > 0 ? height : MIN_TILE_SIZE;
    const tileSize = Math.max(MIN_TILE_SIZE, Math.floor(Math.min(cellWidth, cellHeight)));
    return { cols, rows, tileSize, gap };
  }

  // Before measurement fallback
  if (!width || !height) {
    const cols = Math.min(itemCount, 2);
    const rows = Math.ceil(itemCount / cols);
    return { cols, rows, tileSize: MIN_TILE_SIZE, gap };
  }

  let best: Geometry | null = null;

  for (let cols = 1; cols <= itemCount; cols++) {
    const rows = Math.ceil(itemCount / cols);
    const availWidth = width - (cols - 1) * gap;
    const availHeight = height - (rows - 1) * gap;
    const cellWidth = availWidth > 0 ? availWidth / cols : 0;
    const cellHeight = availHeight > 0 ? availHeight / rows : 0;
    const cellSize = Math.floor(Math.min(cellWidth, cellHeight));
    const tileSize = Math.max(MIN_TILE_SIZE, cellSize);

    const candidate: Geometry = { cols, rows, tileSize, gap };

    if (!best) {
      best = candidate;
    } else if (tileSize > best.tileSize) {
      best = candidate;
    } else if (tileSize === best.tileSize) {
      if (height < 420 && rows < best.rows) {
        best = candidate;
      } else if (rows === best.rows && cols * rows < best.cols * best.rows) {
        best = candidate;
      } else if (rows < best.rows && cols <= best.cols) {
        best = candidate;
      }
    }
  }

  return best ?? { cols: Math.min(itemCount, 2), rows: Math.ceil(itemCount / 2), tileSize: MIN_TILE_SIZE, gap };
}

function isButtonDisabled(btn: HTMLButtonElement | undefined): boolean {
  if (!btn) return true;
  return btn.disabled || btn.getAttribute('aria-disabled') === 'true';
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
    disabled || child.props.disabled || child.props['aria-disabled'] === 'true' ? [] : [index],
  );
  const rovingIndex = enabledIndices.includes(activeIndex)
    ? activeIndex
    : enabledIndices.find(index => index >= activeIndex) ?? enabledIndices[0] ?? -1;

  const geometry = useMemo(
    () => calculateGeometry(options.length || 1, width, height, orientation),
    [options.length, width, height, orientation],
  );

  const getButtons = (): HTMLButtonElement[] => {
    if (!innerRef.current) return [];
    return Array.from(innerRef.current.querySelectorAll<HTMLButtonElement>('button'));
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const buttons = getButtons();
    if (buttons.length === 0) return;

    const currentFocusIndex = buttons.findIndex((btn) => btn === document.activeElement);
    const sourceIndex = currentFocusIndex >= 0 && !isButtonDisabled(buttons[currentFocusIndex])
      ? currentFocusIndex
      : rovingIndex;
    if (sourceIndex < 0) return;

    let targetIndex: number | undefined;

    switch (event.key) {
      case 'ArrowRight': {
        for (let i = sourceIndex + 1; i < buttons.length; i++) {
          if (!isButtonDisabled(buttons[i])) {
            targetIndex = i;
            break;
          }
        }
        break;
      }
      case 'ArrowLeft': {
        for (let i = sourceIndex - 1; i >= 0; i--) {
          if (!isButtonDisabled(buttons[i])) {
            targetIndex = i;
            break;
          }
        }
        break;
      }
      case 'ArrowDown': {
        if (orientation === 'grid') {
          const candidate = sourceIndex + geometry.cols;
          if (candidate < buttons.length && !isButtonDisabled(buttons[candidate])) {
            targetIndex = candidate;
          } else if (candidate < buttons.length) {
            for (let i = candidate + 1; i < buttons.length; i++) {
              if (!isButtonDisabled(buttons[i])) {
                targetIndex = i;
                break;
              }
            }
          }
        }
        break;
      }
      case 'ArrowUp': {
        if (orientation === 'grid') {
          const candidate = sourceIndex - geometry.cols;
          if (candidate >= 0 && !isButtonDisabled(buttons[candidate])) {
            targetIndex = candidate;
          } else if (candidate >= 0) {
            for (let i = candidate - 1; i >= 0; i--) {
              if (!isButtonDisabled(buttons[i])) {
                targetIndex = i;
                break;
              }
            }
          }
        }
        break;
      }
      case 'Home': {
        for (let i = 0; i < buttons.length; i++) {
          if (!isButtonDisabled(buttons[i])) {
            targetIndex = i;
            break;
          }
        }
        break;
      }
      case 'End': {
        for (let i = buttons.length - 1; i >= 0; i--) {
          if (!isButtonDisabled(buttons[i])) {
            targetIndex = i;
            break;
          }
        }
        break;
      }
      default:
        return;
    }

    if (targetIndex !== undefined && targetIndex >= 0 && targetIndex < buttons.length) {
      event.preventDefault();
      setActiveIndex(targetIndex);
      buttons[targetIndex].focus();
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
          orientation === 'grid'
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
                flexWrap: 'wrap',
                gap: `${geometry.gap}px`,
              } as React.CSSProperties)
        }
      >
        {options.map((child, index) => {
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
