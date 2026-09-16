/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { cva, type VariantProps } from 'class-variance-authority';

export { cn } from './utils';

export const buttonVariants = cva(
  'inline-flex items-center justify-center font-black focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-focus disabled:pointer-events-none disabled:opacity-[.45]',
  {
    variants: {
      tone: {
        primary: 'bg-action-primary text-white',
        neutral: 'bg-surface text-text-main border border-border-subtle',
        quiet: 'bg-transparent text-text-main',
        danger: 'bg-action-danger text-white',
      },
      size: {
        parent: 'min-h-11 min-w-11 px-4 py-2 rounded-xl',
        child: 'min-h-12 min-w-12 px-5 py-3 rounded-2xl',
        play: 'h-24 w-24 rounded-full sm:h-32 sm:w-32',
      },
    },
    defaultVariants: { tone: 'neutral', size: 'parent' },
  },
);

export type ButtonVariantProps = VariantProps<typeof buttonVariants>;

export const iconButtonVariants = cva(
  'inline-flex items-center justify-center rounded-full shadow-block transition-all active:translate-y-1 active:shadow-block-pressed disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-focus',
  {
    variants: {
      tone: {
        neutral: 'bg-surface text-text-main',
        primary: 'bg-action-primary text-white',
        quiet: 'bg-transparent text-text-main shadow-none',
        danger: 'bg-action-danger text-white',
      },
      size: {
        parent: 'h-11 w-11',
        child: 'h-12 w-12 sm:h-14 sm:w-14',
      },
    },
    defaultVariants: { tone: 'neutral', size: 'child' },
  },
);

export type IconButtonVariantProps = VariantProps<typeof iconButtonVariants>;
