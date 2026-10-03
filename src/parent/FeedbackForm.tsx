/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { type FeedbackCategory, type FeedbackPayload, submitFeedback } from '../shared/services/feedbackService';
import { Button, Field, RadioGroupControl, TextAreaControl } from '../shared/ui';

type FormState = 'idle' | 'submitting' | 'success' | 'error';
const MAX_LENGTH = 1000;
const COUNTER_THRESHOLD = 100;
const screenshotGuidance = (
  <p className="text-sm text-text-muted">
    Snímky obrazovky pošlite e-mailom na{' '}
    <a href="mailto:jan.svehla@pm.me" className="font-bold text-text-main underline focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-focus">jan.svehla@pm.me</a>.
  </p>
);
const CATEGORIES: { value: FeedbackCategory; label: string; emoji: string }[] = [
  { value: 'bug', label: 'Chyba v hre', emoji: '🐛' },
  { value: 'suggestion', label: 'Nápad / návrh', emoji: '💡' },
  { value: 'praise', label: 'Pochvala', emoji: '⭐' },
  { value: 'other', label: 'Iné', emoji: '💬' },
];

export function FeedbackForm({ screen }: { screen: string }) {
  const [category, setCategory] = useState<FeedbackCategory | null>(null);
  const [message, setMessage] = useState('');
  const [formState, setFormState] = useState<FormState>('idle');
  const remaining = MAX_LENGTH - message.length;
  const messageRequired = category === 'bug' || category === 'suggestion';
  const hasUsefulMessage = message.trim().length > 0;
  const canSubmit = category !== null && (!messageRequired || hasUsefulMessage)
    && (formState === 'idle' || formState === 'error');

  async function handleSubmit() {
    if (!canSubmit || !category) return;
    setFormState('submitting');
    try {
      const payload: FeedbackPayload = { category, message, screen };
      await submitFeedback(payload);
      setFormState('success');
    } catch {
      setFormState('error');
    }
  }

  return formState === 'success' ? (
    <section role="status" className="mt-5 rounded-3xl bg-surface p-6 text-center">
      <h2 className="text-2xl font-bold text-text-main">Ďakujeme!</h2>
      <p className="mt-2 text-base text-text-muted">Ďakujeme za spätnú väzbu. Tento formulár neposiela e-mailovú adresu a nemôžeme odpovedať priamo.</p>
      <div className="mt-3">{screenshotGuidance}</div>
    </section>
  ) : (
    <form aria-label="Spätná väzba" className="mt-5 flex min-h-0 flex-1 flex-col rounded-3xl bg-surface p-5"
      onSubmit={event => { event.preventDefault(); void handleSubmit(); }}>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-3">
        <p className="text-sm text-text-muted">Formulár neposiela e-mailovú adresu, preto nemôžeme odpovedať priamo.</p>
        {screenshotGuidance}
        <Field label="Typ správy" helpText="Vyberte, čo chcete nahlásiť.">
          {() => (
            <RadioGroupControl<FeedbackCategory>
              ariaLabel="Typ správy"
              surface="flat"
              options={CATEGORIES.map(({ value, label, emoji }) => ({ value, label: `${emoji} ${label}` }))}
              value={category ?? ('' as FeedbackCategory)}
              onValueChange={setCategory}
              disabled={formState === 'submitting'}
              columns={2}
            />
          )}
        </Field>
        <Field label="Vaša správa"
          helpText={messageRequired ? 'Povinné pri chybe alebo návrhu.' : 'Voliteľné.'}
          required={messageRequired}>
          {controlProps => (
            <TextAreaControl {...controlProps} surface="flat" aria-label="Vaša správa"
              aria-required={messageRequired} value={message}
              onChange={event => setMessage(event.target.value.slice(0, MAX_LENGTH))}
              disabled={formState === 'submitting'}
              placeholder="Opíšte čo sa stalo, čo vám chýba, alebo čo by ste chceli vylepšiť…"
              rows={3} />
          )}
        </Field>
        <div className="flex items-center justify-between text-sm font-medium text-text-muted">
          <span aria-live="polite">{messageRequired && !hasUsefulMessage ? 'Napíšte správu pred odoslaním.' : ''}</span>
          {remaining < COUNTER_THRESHOLD && (
            <span className={remaining <= 20 ? 'text-action-danger' : ''}>{remaining}</span>
          )}
        </div>
      </div>
      <div className="sticky bottom-0 z-10 shrink-0 bg-surface pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button type="submit" tone="primary" size="parent" fullWidth disabled={!canSubmit}
          icon={formState === 'submitting' ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}>
          {formState === 'submitting' ? 'Odosielam…' : 'Odoslať'}
        </Button>
        {formState === 'error' && <p role="alert" className="text-center text-sm font-bold text-action-danger">Odosielanie zlyhalo. Skúste znova.</p>}
      </div>
    </form>
  );
}
