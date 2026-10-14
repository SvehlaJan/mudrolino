/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { type FeedbackCategory, type FeedbackPayload, submitFeedback } from '../shared/services/feedbackService';
import { Button, Field, RadioGroupControl, TextAreaControl } from '../shared/ui';
import { useContentLocale } from '../shared/contexts/ContentContext';
import { useT } from '../shared/hooks/useT';
import { msg } from '../shared/i18n';

type FormState = 'idle' | 'submitting' | 'success' | 'error';
const MAX_LENGTH = 1000;
const COUNTER_THRESHOLD = 100;
function ScreenshotGuidance() {
  const t = useT();
  return (
    <p className="text-sm text-text-muted">
      {t('Snímky obrazovky pošlite e-mailom na')}{' '}
      <a href="mailto:mudrolino@pm.me" className="font-bold text-text-main underline focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-focus">mudrolino@pm.me</a>.
    </p>
  );
}
const CATEGORIES: { value: FeedbackCategory; label: string; emoji: string }[] = [
  { value: 'bug', label: msg('Chyba v hre'), emoji: '🐛' },
  { value: 'suggestion', label: msg('Nápad / návrh'), emoji: '💡' },
  { value: 'praise', label: msg('Pochvala'), emoji: '⭐' },
  { value: 'other', label: msg('Iné'), emoji: '💬' },
];

export function FeedbackForm({ screen }: { screen: string }) {
  const locale = useContentLocale();
  const t = useT();
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
      const payload: FeedbackPayload = { category, message, screen, locale };
      await submitFeedback(payload);
      setFormState('success');
    } catch {
      setFormState('error');
    }
  }

  return formState === 'success' ? (
    <section role="status" className="mt-5 rounded-3xl bg-surface p-6 text-center">
      <h2 className="text-2xl font-bold text-text-main">{t('Ďakujeme!')}</h2>
      <p className="mt-2 text-base text-text-muted">{t('Ďakujeme za spätnú väzbu. Tento formulár neposiela e-mailovú adresu a nemôžeme odpovedať priamo.')}</p>
      <div className="mt-3"><ScreenshotGuidance /></div>
    </section>
  ) : (
    <form aria-label={t('Spätná väzba')} className="mt-5 flex min-h-0 flex-1 flex-col rounded-3xl bg-surface p-5"
      onSubmit={event => { event.preventDefault(); void handleSubmit(); }}>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-3">
        <p className="text-sm text-text-muted">{t('Formulár neposiela e-mailovú adresu, preto nemôžeme odpovedať priamo.')}</p>
        <ScreenshotGuidance />
        <Field label={t('Typ správy')} helpText={t('Vyberte, čo chcete nahlásiť.')}>
          {() => (
            <RadioGroupControl<FeedbackCategory>
              ariaLabel={t('Typ správy')}
              surface="flat"
              options={CATEGORIES.map(({ value, label, emoji }) => ({ value, label: `${emoji} ${t(label)}` }))}
              value={category ?? ('' as FeedbackCategory)}
              onValueChange={setCategory}
              disabled={formState === 'submitting'}
              columns={2}
            />
          )}
        </Field>
        <Field label={t('Vaša správa')}
          helpText={messageRequired ? t('Povinné pri chybe alebo návrhu.') : t('Voliteľné.')}
          required={messageRequired}>
          {controlProps => (
            <TextAreaControl {...controlProps} surface="flat" aria-label={t('Vaša správa')}
              aria-required={messageRequired} value={message}
              onChange={event => setMessage(event.target.value.slice(0, MAX_LENGTH))}
              disabled={formState === 'submitting'}
              placeholder={t('Opíšte čo sa stalo, čo vám chýba, alebo čo by ste chceli vylepšiť…')}
              rows={3} />
          )}
        </Field>
        <div className="flex items-center justify-between text-sm font-medium text-text-muted">
          <span aria-live="polite">{messageRequired && !hasUsefulMessage ? t('Napíšte správu pred odoslaním.') : ''}</span>
          {remaining < COUNTER_THRESHOLD && (
            <span className={remaining <= 20 ? 'text-action-danger' : ''}>{remaining}</span>
          )}
        </div>
      </div>
      <div className="sticky bottom-0 z-10 shrink-0 bg-surface pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button type="submit" tone="primary" size="parent" fullWidth disabled={!canSubmit}
          icon={formState === 'submitting' ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}>
          {formState === 'submitting' ? t('Odosielam…') : t('Odoslať')}
        </Button>
        {formState === 'error' && <p role="alert" className="text-center text-sm font-bold text-action-danger">{t('Odosielanie zlyhalo. Skúste znova.')}</p>}
      </div>
    </form>
  );
}
