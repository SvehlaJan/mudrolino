/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { cn } from './utils';
import { iconButtonVariants, type IconButtonVariantProps } from './variants';
import type { ButtonDensity } from './Button';

const ICON_DENSITY_CLASSES: Record<ButtonDensity, string> = {
  comfortable: '',
  compact: 'shadow-sm',
};

interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    IconButtonVariantProps {
  label: string;
  children: React.ReactNode;
  density?: ButtonDensity;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    label,
    children,
    className,
    density = 'comfortable',
    tone,
    size,
    type = 'button',
    ...props
  },
  ref,
) {
  return (
    <button
      {...props}
      ref={ref}
      type={type}
      aria-label={label}
      data-tone={tone ?? 'neutral'}
      className={cn(iconButtonVariants({ tone, size }), ICON_DENSITY_CLASSES[density], className)}
    >
      {children}
    </button>
  );
});

export function BackButton({ onClick, label = 'Späť' }: { onClick: () => void; label?: string }) {
  return (
    <IconButton label={label} onClick={onClick}>
      <ArrowLeft size={24} className="sm:h-7 sm:w-7" />
    </IconButton>
  );
}
