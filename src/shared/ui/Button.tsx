/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { uiTokens } from './tokens';
import { cn } from './utils';
import { buttonVariants, type ButtonVariantProps } from './variants';

export type ButtonTone = NonNullable<ButtonVariantProps['tone']>;
export type ButtonSize = NonNullable<ButtonVariantProps['size']>;
export type ButtonDensity = 'comfortable' | 'compact';

/** @deprecated Pass `tone` instead. Kept so pre-Phase-2 callers keep their exact rendering until they migrate. */
export type LegacyButtonVariant = 'primary' | 'secondary' | 'quiet' | 'danger' | 'play';
/** @deprecated Pass `size="parent" | "child" | "play"` instead. */
export type LegacyButtonSize = 'sm' | 'md' | 'lg';

interface ButtonOwnProps {
  /** Semantic color role. Presence of `tone` opts a call site into the typed variant system. */
  tone?: ButtonTone;
  size?: ButtonSize | LegacyButtonSize;
  density?: ButtonDensity;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  /** @deprecated use `tone` */
  variant?: LegacyButtonVariant;
}

export type ButtonProps = ButtonOwnProps & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'color'>;

const LEGACY_VARIANT_CLASSES: Record<LegacyButtonVariant, string> = {
  primary: 'bg-accent-blue text-text-main shadow-block',
  secondary: 'bg-soft-watermelon text-white shadow-block',
  quiet: 'bg-white text-text-main shadow-block',
  danger: 'bg-primary text-white shadow-block',
  play: 'rounded-full bg-success text-white shadow-block',
};

const LEGACY_SIZE_CLASSES: Record<LegacyButtonSize, string> = {
  sm: 'px-5 py-3 text-base sm:text-lg',
  md: 'px-6 py-4 text-xl',
  lg: 'px-8 py-5 text-2xl sm:px-10 sm:py-6 sm:text-3xl',
};

/** Nearest semantic tone per legacy variant, used only for the `data-tone` debug/test attribute. */
const LEGACY_VARIANT_TONE: Record<LegacyButtonVariant, ButtonTone> = {
  primary: 'primary',
  secondary: 'primary',
  quiet: 'quiet',
  danger: 'danger',
  play: 'primary',
};

const DENSITY_CLASSES: Record<ButtonDensity, string> = {
  comfortable: '',
  compact: 'px-3 py-1.5 gap-1.5',
};

function isLegacySize(size: ButtonSize | LegacyButtonSize | undefined): size is LegacyButtonSize {
  return size === 'sm' || size === 'md' || size === 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    children,
    className,
    density = 'comfortable',
    disabled,
    fullWidth = false,
    icon,
    size,
    tone,
    type = 'button',
    variant,
    ...props
  },
  ref,
) {
  const usesTypedApi = tone !== undefined || (size !== undefined && !isLegacySize(size));
  const displayTone: ButtonTone = tone ?? (usesTypedApi ? 'neutral' : LEGACY_VARIANT_TONE[variant ?? 'primary']);

  const visualClassName = usesTypedApi
    ? cn(buttonVariants({ tone, size: isLegacySize(size) ? undefined : size }), 'gap-2', DENSITY_CLASSES[density])
    : cn(
        'inline-flex items-center justify-center gap-3 rounded-2xl font-bold',
        uiTokens.pressable,
        LEGACY_VARIANT_CLASSES[variant ?? 'primary'],
        (variant ?? 'primary') === 'play'
          ? 'h-28 w-28 sm:h-36 sm:w-36 md:h-44 md:w-44'
          : LEGACY_SIZE_CLASSES[isLegacySize(size) ? size : 'md'],
        disabled && 'opacity-40 cursor-not-allowed',
      );

  return (
    <button
      {...props}
      ref={ref}
      disabled={disabled}
      type={type}
      data-tone={displayTone}
      className={cn(visualClassName, fullWidth && 'w-full', className)}
    >
      {icon}
      {children}
    </button>
  );
});
