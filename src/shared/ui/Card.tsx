/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { uiTokens } from './tokens';
import { cx } from './utils';

type CardVariant = 'card' | 'panel' | 'inset' | 'row' | 'modal';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
}

const variantClasses: Record<CardVariant, string> = {
  card: uiTokens.card,
  panel: uiTokens.panel,
  inset: uiTokens.insetPanel,
  row: 'rounded-2xl border-2 border-transparent bg-white px-4 py-3',
  modal: 'rounded-[32px] border-4 border-white bg-white shadow-block sm:rounded-[40px]',
};

export const Card = React.forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, variant = 'card', ...props },
  ref,
) {
  return <div ref={ref} className={cx(variantClasses[variant], className)} {...props} />;
});
