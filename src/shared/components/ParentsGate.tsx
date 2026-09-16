/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { Button, Card, DialogShell, IconButton } from '../ui';
import { exposeParentGateE2E } from '../services/e2eState';

interface ParentsGateProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
const ERROR_DISPLAY_MS = 500;

function generateQuestion(): { a: number; b: number; op: '+' | '-'; answer: number } {
  if (Math.random() > 0.5) {
    const a = Math.floor(Math.random() * 9) + 1;
    const b = Math.floor(Math.random() * 9) + 1;
    return { a, b, op: '+', answer: a + b };
  } else {
    const diff = Math.floor(Math.random() * 9) + 1;
    const b = Math.floor(Math.random() * 9) + 1;
    const a = b + diff;
    return { a, b, op: '-', answer: diff };
  }
}

export function ParentsGate({ onSuccess, onCancel }: ParentsGateProps) {
  const [question, setQuestion] = useState(generateQuestion);
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorRecoveriesRef = useRef(0);
  const firstDigitRef = useRef<HTMLButtonElement>(null);
  // Captured once, at mount: whichever control (e.g. a lobby's "Nastavenia" button) was
  // focused right before this gate opened. See DialogShell's `restoreFocusRef` doc comment
  // for why Radix can't infer this on its own without a `Dialog.Trigger`.
  const restoreFocusRef = useRef<HTMLElement | null>(
    typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null,
  );

  useEffect(() => exposeParentGateE2E({
    answer: question.answer,
    unlock: onSuccess,
    errorRecoveries: errorRecoveriesRef.current,
  }), [
    question.answer,
    onSuccess,
  ]);

  useEffect(() => {
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, []);

  const handleDigit = useCallback((digit: string) => {
    if (error) return;
    setInput(prev => (prev.length < 2 ? prev + digit : prev));
  }, [error]);

  const handleBackspace = useCallback(() => {
    if (error) return;
    setInput(prev => prev.slice(0, -1));
  }, [error]);

  const handleConfirm = useCallback(() => {
    if (!input || error) return;
    if (parseInt(input, 10) === question.answer) {
      onSuccess();
      return;
    }
    setError(true);
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    errorTimerRef.current = setTimeout(() => {
      errorRecoveriesRef.current += 1;
      setError(false);
      setQuestion(generateQuestion());
      setInput('');
    }, ERROR_DISPLAY_MS);
  }, [input, error, question.answer, onSuccess]);

  // Digits/Backspace/Enter need a global listener because the dialog has no text
  // input to hold key focus. Escape is left to Dialog.Content's own onEscapeKeyDown,
  // which already routes through onOpenChange below — handling it twice would
  // invoke onCancel twice.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDigit, handleBackspace, handleConfirm]);

  return (
    <DialogShell
      open
      onOpenChange={open => {
        if (!open) onCancel();
      }}
      title="Pre rodičov"
      titleClassName="text-xl landscape:text-lg sm:portrait:text-3xl"
      description="Vyriešte príklad pre vstup."
      descriptionClassName="text-sm landscape:text-xs sm:portrait:text-base"
      initialFocusRef={firstDigitRef}
      restoreFocusRef={restoreFocusRef}
      className="portrait:max-w-sm landscape:max-w-2xl landscape:p-3"
    >
      <div className="mt-1 flex justify-start landscape:mt-0.5">
        <IconButton label="Späť" tone="neutral" size="parent" onClick={onCancel}>
          <ArrowLeft size={20} />
        </IconButton>
      </div>

      <div className="flex flex-col items-center gap-3 landscape:flex-row landscape:items-center landscape:gap-4">
        <div className="w-full landscape:flex-1 flex flex-col items-center gap-2 landscape:gap-1.5">
          <Card
            variant="panel"
            data-testid="parent-gate-equation"
            className={`w-full py-3 landscape:py-1.5 text-center text-2xl landscape:text-lg font-bold text-text-main sm:portrait:py-4 sm:portrait:text-4xl ${error && !prefersReducedMotion ? 'animate-shake' : ''}`}
          >
            {question.a} {question.op} {question.b} = ?
          </Card>

          <Card
            role="status"
            aria-live="polite"
            className="w-full rounded-2xl py-2 landscape:py-1 min-h-[40px] landscape:min-h-[32px] flex items-center justify-center text-xl landscape:text-lg font-bold text-text-main sm:portrait:min-h-[56px] sm:portrait:text-3xl"
          >
            {input || <span className="opacity-30">—</span>}
          </Card>

          {error && (
            <p role="alert" className="text-xs landscape:text-[10px] font-bold text-action-danger sm:portrait:text-sm">
              Skús to ešte raz
            </p>
          )}
        </div>

        <div className="w-full landscape:flex-1 max-w-[280px]">
          <div className="grid grid-cols-3 gap-1.5 landscape:gap-1 w-full sm:portrait:gap-3">
            {DIGITS.map((d, index) => (
              <Button
                key={d}
                ref={index === 0 ? firstDigitRef : undefined}
                tone="neutral"
                size="parent"
                onClick={() => handleDigit(d)}
                className="py-1.5 landscape:py-1 text-lg landscape:text-base sm:portrait:py-4 sm:portrait:text-2xl"
              >
                {d}
              </Button>
            ))}
            <Button
              tone="neutral"
              size="parent"
              onClick={handleBackspace}
              aria-label="Zmazať"
              className="py-1.5 landscape:py-1 text-lg landscape:text-base opacity-70 sm:portrait:py-4 sm:portrait:text-2xl"
            >
              ⌫
            </Button>
            <Button
              tone="neutral"
              size="parent"
              onClick={() => handleDigit('0')}
              className="py-1.5 landscape:py-1 text-lg landscape:text-base sm:portrait:py-4 sm:portrait:text-2xl"
            >
              0
            </Button>
            <Button
              tone="primary"
              size="parent"
              onClick={handleConfirm}
              disabled={!input || error}
              aria-label="Potvrdiť"
              className="py-1.5 landscape:py-1 text-lg landscape:text-base font-black sm:portrait:py-4 sm:portrait:text-2xl"
            >
              ✓
            </Button>
          </div>
        </div>
      </div>
    </DialogShell>
  );
}
