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
  align?: 'start' | 'center';
  className?: string;
}

export function PageHeader({
  title,
  description,
  leading,
  actions,
  headingLevel = 'h1',
  align = 'start',
  className,
}: PageHeaderProps) {
  const Heading = headingLevel;
  const titleContent = (
    <div className="min-w-0 space-y-1">
      <Heading className="text-2xl font-black text-text-main sm:text-3xl">{title}</Heading>
      {description && (
        <p className="text-sm font-medium text-text-muted sm:text-base">{description}</p>
      )}
    </div>
  );

  if (align === 'center') {
    return (
      <header className={cn('grid shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2', className)}>
        <div className="col-start-1 row-start-1 justify-self-start">{leading}</div>
        <div className="col-span-3 row-start-2 min-w-0 text-center sm:col-span-1 sm:col-start-2 sm:row-start-1">
          {titleContent}
        </div>
        <div className="col-start-3 row-start-1 flex items-center gap-2 justify-self-end">{actions}</div>
      </header>
    );
  }

  return (
    <header className={cn('flex flex-wrap items-start justify-between gap-4', className)}>
      <div className="flex min-w-0 items-start gap-3">
        {leading}
        {titleContent}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}
