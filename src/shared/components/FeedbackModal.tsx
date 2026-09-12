import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import {
  FeedbackCategory,
  FeedbackPayload,
  submitFeedback,
} from '../services/feedbackService';
import { AppScreen, BackButton, Button, Card, ChoiceTile, TextAreaControl, TopBar } from '../ui';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  screen: string;
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

export function FeedbackModal({ isOpen, onClose, screen }: FeedbackModalProps) {
  const [category, setCategory] = useState<FeedbackCategory | null>(null);
  const [message, setMessage] = useState('');
  const [formState, setFormState] = useState<FormState>('idle');

  const resetAndClose = useCallback(() => {
    setCategory(null);
    setMessage('');
    setFormState('idle');
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (formState !== 'success') return;
    const id = setTimeout(() => {
      resetAndClose();
    }, 3000);
    return () => clearTimeout(id);
  }, [formState, resetAndClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        resetAndClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, resetAndClose]);

  if (!isOpen) return null;

  async function handleSubmit() {
    if (!category) return;
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
  const canSubmit = category !== null && (formState === 'idle' || formState === 'error');

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="feedback-modal-title">
      <AppScreen maxWidth="narrow">
        <TopBar left={<BackButton onClick={resetAndClose} />} className="landscape:pb-1" />

        <div className="mb-3 sm:mb-6 text-center landscape:mb-2">
          <h2 id="feedback-modal-title" className="text-2xl font-bold sm:text-5xl landscape:text-xl">Spätná väzba</h2>
          <p className="mt-1 text-sm font-medium opacity-60 sm:text-xl landscape:text-xs">
            Vaša správa nám pomôže zlepšiť Hravé Učenie
          </p>
        </div>

        {formState === 'success' ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center landscape:gap-2">
            <span className="text-6xl landscape:text-4xl">🎉</span>
            <h3 className="text-2xl font-bold sm:text-3xl landscape:text-xl">Ďakujeme!</h3>
            <p className="max-w-xs text-base font-medium opacity-60 sm:text-lg landscape:text-sm">
              Vaša správa bola odoslaná. Snažíme sa odpovedať do 48 hodín.
            </p>
            <Button onClick={resetAndClose} className="mt-2 landscape:py-2">
              Zavrieť
            </Button>
          </div>
        ) : (
          <div className="flex-1 space-y-4 landscape:space-y-2 overflow-y-auto">
            <Card className="landscape:p-3">
              <h3 className="text-xl font-bold sm:text-2xl landscape:text-base">Typ správy</h3>
              <div className="mt-4 landscape:mt-2 grid grid-cols-2 gap-3 landscape:gap-2">
                {CATEGORIES.map(({ value, label, emoji }) => (
                  <ChoiceTile
                    key={value}
                    shape="option"
                    state={category === value ? 'selected' : 'neutral'}
                    aria-pressed={category === value}
                    disabled={formState === 'submitting'}
                    className="landscape:py-2 text-sm sm:text-lg"
                    onClick={() => setCategory(value)}
                  >
                    {emoji} {label}
                  </ChoiceTile>
                ))}
              </div>
            </Card>

            <Card className="landscape:p-3">
              <h3 className="text-xl font-bold sm:text-2xl landscape:text-base">Vaša správa</h3>
              <p className="mt-1 text-sm font-medium opacity-55 sm:text-base landscape:text-xs">Voliteľné</p>
              <TextAreaControl
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, MAX_LENGTH))}
                disabled={formState === 'submitting'}
                placeholder="Opíšte čo sa stalo, čo vám chýba, alebo čo by ste chceli vylepšiť…"
                rows={3}
                className="mt-2 sm:mt-4 landscape:mt-2"
                aria-label="Vaša správa"
              />
              <div className="mt-2 flex items-center justify-between text-sm font-medium opacity-55 landscape:text-xs">
                <span>
                  Pre snímku obrazovky napíšte na{' '}
                  <span className="text-text-main">jan.svehla@pm.me</span>
                </span>
                {remaining < COUNTER_THRESHOLD && (
                  <span className={remaining <= 20 ? 'text-red-500 opacity-100' : ''}>
                    {remaining}
                  </span>
                )}
              </div>
            </Card>

            <Button
              onClick={handleSubmit}
              disabled={!canSubmit}
              fullWidth
              className="landscape:py-2"
              icon={formState === 'submitting' ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
            >
              {formState === 'submitting' ? 'Odosielam' : 'Odoslať'}
            </Button>

            {formState === 'error' && (
              <p className="text-center text-sm font-medium text-red-500">
                Odosielanie zlyhalo. Skúste znova.
              </p>
            )}
          </div>
        )}
      </AppScreen>
    </div>
  );
}
