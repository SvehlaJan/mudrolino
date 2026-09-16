/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useId } from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cn } from './utils';

export interface FieldControlProps {
  id: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  required?: boolean;
  'aria-required'?: boolean;
}

export interface FieldProps {
  label: string;
  children: (controlProps: FieldControlProps) => React.ReactNode;
  helpText?: string;
  errorText?: string;
  required?: boolean;
  className?: string;
}

export function Field({ label, children, helpText, errorText, required, className }: FieldProps) {
  const id = useId();
  const helpId = helpText ? `${id}-help` : undefined;
  const errorId = errorText ? `${id}-error` : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('space-y-1.5', className)}>
      <LabelPrimitive.Root htmlFor={id} className="block text-sm font-bold text-text-main">
        {label}
        {required && (
          <span aria-hidden="true" className="text-action-danger">
            {' '}*
          </span>
        )}
      </LabelPrimitive.Root>
      {children({
        id,
        'aria-describedby': describedBy,
        'aria-invalid': errorText ? true : undefined,
        required: required || undefined,
        'aria-required': required || undefined,
      })}
      {helpText && (
        <p id={helpId} className="text-sm text-text-muted">
          {helpText}
        </p>
      )}
      {errorText && (
        <p id={errorId} role="alert" className="text-sm font-bold text-action-danger">
          {errorText}
        </p>
      )}
    </div>
  );
}
