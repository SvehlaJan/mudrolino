/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { uiTokens } from './tokens';
import { cx } from './utils';

type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'danger' | 'play';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-accent-blue text-white shadow-block',
  secondary: 'bg-soft-watermelon text-white shadow-block',
  quiet: 'bg-white text-text-main shadow-block',
  danger: 'bg-primary text-white shadow-block',
  play: 'rounded-full bg-success text-white shadow-block',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-5 py-3 text-base sm:text-lg',
  md: 'px-6 py-4 text-xl',
  lg: 'px-8 py-5 text-2xl sm:px-10 sm:py-6 sm:text-3xl',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    children,
    className,
    disabled,
    fullWidth = false,
    icon,
    size = 'md',
    type = 'button',
    variant = 'primary',
    ...props
  },
  ref,
) {
  return (
    <button
      {...props}
      ref={ref}
      disabled={disabled}
      type={type}
      className={cx(
        'inline-flex items-center justify-center gap-3 rounded-2xl font-bold',
        uiTokens.pressable,
        variantClasses[variant],
        variant === 'play' ? 'h-28 w-28 sm:h-36 sm:w-36 md:h-44 md:w-44' : sizeClasses[size],
        fullWidth && 'w-full',
        disabled && 'opacity-40 cursor-not-allowed',
        className,
      )}
    >
      {icon}
      {children}
    </button>
  );
});
