/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const motionPreset = {
  press: { scale: 0.96, y: 2 },
  enter: { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 } },
  reducedEnter: { initial: { opacity: 0 }, animate: { opacity: 1 } },
  transition: { duration: 0.18, ease: 'easeOut' as const },
} as const;
