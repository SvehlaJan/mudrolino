/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Button, Field } from '../shared/ui';
import { cn } from '../shared/ui';
import { validatePraiseForm } from './customContentValidation';
import type { PraiseFormErrors, PraiseFormValues } from './customContentValidation';
import type { UserPraise } from '../shared/types';

const INPUT_BASE = 'w-full rounded-xl border-2 bg-bg-light px-4 py-2 text-lg font-medium outline-none focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-focus';

interface PraiseEditorProps {
  mode: 'add' | 'edit';
  initialValues?: { text: string; emoji: string };
  existingPraises: UserPraise[];
  editingId?: string;
  onSubmit: (values: PraiseFormValues) => void | Promise<void>;
  onCancel: () => void;
}

export function PraiseEditor({ mode, initialValues, existingPraises, editingId, onSubmit, onCancel }: PraiseEditorProps) {
  const [text, setText] = useState(initialValues?.text ?? '');
  const [emoji, setEmoji] = useState(initialValues?.emoji ?? '');
  const [errors, setErrors] = useState<PraiseFormErrors>({});
  const [failedSubmitCount, setFailedSubmitCount] = useState(0);
  const summaryRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => { firstFieldRef.current?.focus(); }, []);
  useEffect(() => {
    if (failedSubmitCount > 0) summaryRef.current?.focus();
  }, [failedSubmitCount]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const validation = validatePraiseForm({ text, emoji }, existingPraises, editingId);
    setErrors(validation.errors);
    if (!validation.valid) {
      setFailedSubmitCount(count => count + 1);
      return;
    }
    void onSubmit(validation.values);
  };

  const errorMessages = Object.values(errors).filter((message): message is string => Boolean(message));
  const showSummary = failedSubmitCount > 0 && errorMessages.length > 0;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {showSummary && (
        <div
          ref={summaryRef}
          role="alert"
          tabIndex={-1}
          className="rounded-2xl border-2 border-action-danger/40 bg-action-danger/10 p-4 focus-visible:outline-none"
        >
          <p className="font-bold text-action-danger">Opravte, prosím, tieto polia:</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-action-danger">
            {errorMessages.map((message, index) => (
              <li key={index}>{message}</li>
            ))}
          </ul>
        </div>
      )}

      <Field label="Text pochvaly" errorText={errors.text} helpText="Napríklad Výborne!" required>
        {controlProps => (
          <input
            {...controlProps}
            ref={firstFieldRef}
            value={text}
            onChange={event => setText(event.target.value)}
            className={cn(INPUT_BASE, errors.text ? 'border-action-danger' : 'border-shadow/20')}
          />
        )}
      </Field>

      <Field label="Emoji" errorText={errors.emoji} helpText="Napríklad 🌟." required>
        {controlProps => (
          <input
            {...controlProps}
            value={emoji}
            onChange={event => setEmoji(event.target.value)}
            className={cn(INPUT_BASE, errors.emoji ? 'border-action-danger' : 'border-shadow/20')}
          />
        )}
      </Field>

      <div className="flex gap-2 pt-1">
        <Button type="submit" tone="primary" size="parent" fullWidth>
          {mode === 'edit' ? 'Uložiť' : 'Pridať'}
        </Button>
        <Button type="button" tone="neutral" size="parent" fullWidth onClick={onCancel}>
          Zrušiť
        </Button>
      </div>
    </form>
  );
}
