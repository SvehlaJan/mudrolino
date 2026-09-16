/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { cn } from './utils';

export interface PageHeaderProps {
  title: string;
  description?: string;
  leading?: React.ReactNode;
  actions?: React.ReactNode;
  headingLevel?: 'h1' | 'h2';
  className?: string;
}

export function PageHeader({
  title,
  description,
  leading,
  actions,
  headingLevel = 'h1',
  className,
}: PageHeaderProps) {
  const Heading = headingLevel;

  return (
    <header className={cn('flex flex-wrap items-start justify-between gap-4', className)}>
      <div className="flex min-w-0 items-start gap-3">
        {leading}
        <div className="min-w-0 space-y-1">
          <Heading className="text-2xl font-black text-text-main sm:text-3xl">{title}</Heading>
          {description && (
            <p className="text-sm font-medium text-text-muted sm:text-base">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}
