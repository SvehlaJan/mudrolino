/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export type { ClassValue };

/** Merge Tailwind class lists, resolving conflicting utilities deterministically. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** @deprecated Use `cn` instead. Kept as an alias until every legacy `cx` caller migrates. */
export const cx = cn;
