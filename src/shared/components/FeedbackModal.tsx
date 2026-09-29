import React, { useCallback, useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import {
  FeedbackCategory,
  FeedbackPayload,
  submitFeedback,
} from '../services/feedbackService';
import { Button, DialogShell, Field, RadioGroupControl, TextAreaControl } from '../ui';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  screen: string;
  /** Element to restore focus to on close, when the opener lives outside the dialog. */
  restoreFocusRef?: React.RefObject<HTMLElement | null>;
}

type FormState = 'idle' | 'submitting' | 'success' | 'error';

const MAX_LENGTH = 1000;
const COUNTER_THRESHOLD = 100;

const CATEGORIES: { value: FeedbackCategory; label: string; emoji: string }[] = [
  { value: 'bug',        label: 'Chyba v hre',   emoji: '🐛' },
  { value: 'suggestion', label: 'Nápad / návrh',  emoji: '💡' },
  { value: 'praise',     label: 'Pochvala',        emoji: '⭐' },
  { value: 'other',      label: 'Iné',             emoji: '💬' },
];

export function FeedbackModal({ isOpen, onClose, screen, restoreFocusRef }: FeedbackModalProps) {
  const [category, setCategory] = useState<FeedbackCategory | null>(null);
  const [message, setMessage] = useState('');
  const [formState, setFormState] = useState<FormState>('idle');

  const resetAndClose = useCallback(() => {
    if (formState === 'submitting') return;
    setCategory(null);
    setMessage('');
    setFormState('idle');
    onClose();
  }, [formState, onClose]);

  async function handleSubmit() {
    if (!category || ((category === 'bug' || category === 'suggestion') && !message.trim())
      || formState === 'submitting' || formState === 'success') return;
    setFormState('submitting');
    try {
      const payload: FeedbackPayload = { category, message, screen };
      await submitFeedback(payload);
      setFormState('success');
    } catch {
      setFormState('error');
    }
  }

  const remaining = MAX_LENGTH - message.length;
  const messageRequired = category === 'bug' || category === 'suggestion';
  const hasUsefulMessage = message.trim().length > 0;
  const canSubmit = category !== null && (!messageRequired || hasUsefulMessage)
    && (formState === 'idle' || formState === 'error');

  return (
    <DialogShell
      open={isOpen}
      onOpenChange={open => { if (!open) resetAndClose(); }}
      title="Spätná väzba"
      description="Vaša správa nám pomôže zlepšiť Hravé Učenie."
      showCloseButton
      restoreFocusRef={restoreFocusRef}
      className="flex max-h-[calc(100svh-1rem)] flex-col overflow-hidden p-5"
    >
      {formState === 'success' ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex flex-col items-center gap-4 py-6 text-center" role="status">
            <span className="text-6xl">🎉</span>
            <h3 className="text-2xl font-bold text-text-main">Ďakujeme!</h3>
            <p className="max-w-xs text-base font-medium text-text-muted">
              Ďakujeme za spätnú väzbu. Tento formulár neposiela e-mailovú adresu a nemôžeme odpovedať priamo.
            </p>
            <Button tone="primary" size="parent" onClick={resetAndClose}>Zavrieť</Button>
          </div>
        </div>
      ) : (
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={event => {
            event.preventDefault();
            void handleSubmit();
          }}
        >
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto py-3">
            <p className="text-sm text-text-muted">Formulár neposiela e-mailovú adresu, preto nemôžeme odpovedať priamo.</p>
            <Field label="Typ správy" helpText="Vyberte, čo chcete nahlásiť.">
              {() => (
                <RadioGroupControl<FeedbackCategory>
                  ariaLabel="Typ správy"
                  options={CATEGORIES.map(({ value, label, emoji }) => ({ value, label: `${emoji} ${label}` }))}
                  value={category ?? ('' as FeedbackCategory)}
                  onValueChange={setCategory}
                  disabled={formState === 'submitting'}
                  columns={2}
                />
              )}
            </Field>

          <Field
            label="Vaša správa"
            helpText={messageRequired ? 'Povinné pri chybe alebo návrhu.' : 'Voliteľné.'}
            required={messageRequired}
          >
            {controlProps => (
              <TextAreaControl
                {...controlProps}
                aria-label="Vaša správa"
                aria-required={messageRequired}
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, MAX_LENGTH))}
                disabled={formState === 'submitting'}
                placeholder="Opíšte čo sa stalo, čo vám chýba, alebo čo by ste chceli vylepšiť…"
                rows={3}
              />
            )}
            </Field>

            <p className="text-sm text-text-muted">
              Pre snímku obrazovky napíšte na{' '}
              <a className="font-bold text-text-main underline" href="mailto:jan.svehla@pm.me">jan.svehla@pm.me</a>
            </p>

            <div className="flex items-center justify-between text-sm font-medium text-text-muted">
              <span aria-live="polite">{messageRequired && !hasUsefulMessage ? 'Napíšte správu pred odoslaním.' : ''}</span>
              {remaining < COUNTER_THRESHOLD && (
                <span className={remaining <= 20 ? 'text-action-danger' : ''}>{remaining}</span>
              )}
            </div>

          </div>

          <div className="shrink-0 border-t border-border-subtle bg-surface pt-3">
            <Button
              type="submit"
              tone="primary"
              size="parent"
              fullWidth
              disabled={!canSubmit}
              icon={formState === 'submitting' ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
            >
              {formState === 'submitting' ? 'Odosielam…' : 'Odoslať'}
            </Button>

            {formState === 'error' && (
              <p role="alert" className="text-center text-sm font-bold text-action-danger">
                Odosielanie zlyhalo. Skúste znova.
              </p>
            )}
          </div>
        </form>
      )}
    </DialogShell>
  );
}
