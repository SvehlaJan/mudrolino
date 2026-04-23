import React, { useEffect, useState } from 'react';
import { Send, X } from 'lucide-react';
import {
  FeedbackCategory,
  FeedbackPayload,
  submitFeedback,
} from '../services/feedbackService';

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

  useEffect(() => {
    if (formState !== 'success') return;
    const id = setTimeout(() => {
      resetAndClose();
    }, 3000);
    return () => clearTimeout(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formState]);

  if (!isOpen) return null;

  function resetAndClose() {
    setCategory(null);
    setMessage('');
    setFormState('idle');
    onClose();
  }

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
  const canSubmit = category !== null && formState === 'idle';

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg-light px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-5">
      <div className="mx-auto flex w-full max-w-2xl flex-1 min-h-0 flex-col">

        {/* Top bar */}
        <div className="mb-4 flex items-center">
          <button
            onClick={resetAndClose}
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/90 shadow-sm active:scale-95"
          >
            <X size={20} />
          </button>
        </div>

        {/* Title */}
        <div className="mb-6 text-center">
          <h2 className="text-3xl font-bold sm:text-5xl">Spätná väzba</h2>
          <p className="mt-2 text-base font-medium opacity-60 sm:text-xl">
            Vaša správa nám pomôže zlepšiť Hravé Učenie
          </p>
        </div>

        {formState === 'success' ? (
          /* ── Success state ── */
          <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
            <span className="text-6xl">🎉</span>
            <h3 className="text-2xl font-bold sm:text-3xl">Ďakujeme!</h3>
            <p className="max-w-xs text-base font-medium opacity-60 sm:text-lg">
              Vaša správa bola odoslaná. Snažíme sa odpovedať do 48 hodín.
            </p>
            <button
              onClick={resetAndClose}
              className="mt-2 rounded-2xl bg-[#8b5cf6] px-8 py-4 text-xl font-bold text-white shadow-block active:translate-y-2 active:shadow-block-pressed"
            >
              Zavrieť
            </button>
          </div>
        ) : (
          /* ── Form state ── */
          <div className="flex-1 space-y-4 overflow-y-auto">

            {/* Category selector */}
            <section className="rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_12px_28px_rgba(93,69,62,0.06)] sm:rounded-[32px] sm:p-6">
              <h3 className="text-xl font-bold sm:text-2xl">Typ správy</h3>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {CATEGORIES.map(({ value, label, emoji }) => (
                  <button
                    key={value}
                    onClick={() => setCategory(value)}
                    disabled={formState === 'submitting'}
                    className={`rounded-2xl py-4 text-base font-bold transition-all sm:text-lg ${
                      category === value
                        ? 'scale-105 bg-[#8b5cf6] text-white shadow-block'
                        : 'bg-bg-light text-text-main opacity-70'
                    }`}
                  >
                    {emoji} {label}
                  </button>
                ))}
              </div>
            </section>

            {/* Message textarea */}
            <section className="rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_12px_28px_rgba(93,69,62,0.06)] sm:rounded-[32px] sm:p-6">
              <h3 className="text-xl font-bold sm:text-2xl">Vaša správa</h3>
              <p className="mt-1 text-sm font-medium opacity-55 sm:text-base">Voliteľné</p>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, MAX_LENGTH))}
                disabled={formState === 'submitting'}
                placeholder="Opíšte čo sa stalo, čo vám chýba, alebo čo by ste chceli vylepšiť…"
                rows={4}
                className="mt-4 w-full resize-none rounded-2xl border border-shadow/15 bg-bg-light/35 p-4 text-base font-medium placeholder:opacity-40 focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]/40"
              />
              <div className="mt-2 flex items-center justify-between text-sm font-medium opacity-55">
                <span>
                  Pre snímku obrazovky napíšte na{' '}
                  <span className="text-[#8b5cf6]">jan.svehla@pm.me</span>
                </span>
                {remaining <= COUNTER_THRESHOLD && (
                  <span className={remaining <= 20 ? 'text-red-500 opacity-100' : ''}>
                    {remaining}
                  </span>
                )}
              </div>
            </section>

            {/* Submit button */}
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={`flex w-full items-center justify-center gap-3 rounded-2xl py-4 text-xl font-bold text-white transition-all ${
                canSubmit
                  ? 'bg-[#8b5cf6] shadow-block active:translate-y-2 active:shadow-block-pressed'
                  : 'bg-[#8b5cf6]/40'
              }`}
            >
              {formState === 'submitting' ? (
                <span className="animate-spin inline-block">⏳</span>
              ) : (
                <>
                  <Send size={20} />
                  Odoslať
                </>
              )}
            </button>

            {formState === 'error' && (
              <p className="text-center text-sm font-medium text-red-500">
                Odosielanie zlyhalo. Skúste znova.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
