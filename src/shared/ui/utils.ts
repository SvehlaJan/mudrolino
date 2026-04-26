/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ClassValue = string | false | null | undefined;

export function cx(...classes: ClassValue[]) {
  return classes.filter(Boolean).join(' ');
}
