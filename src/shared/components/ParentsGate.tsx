/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { AppScreen, BackButton, Button, Card, TopBar } from '../ui';

interface ParentsGateProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

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
  const [shaking, setShaking] = useState(false);
  const shakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDigit = useCallback((digit: string) => {
    setInput(prev => prev.length < 2 ? prev + digit : prev);
  }, []);

  const handleBackspace = useCallback(() => {
    setInput(prev => prev.slice(0, -1));
  }, []);

  useEffect(() => {
    return () => {
      if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
    };
  }, []);

  const handleConfirm = useCallback(() => {
    if (!input || shaking) return;
    if (parseInt(input, 10) === question.answer) {
      onSuccess();
    } else {
      setShaking(true);
      shakeTimerRef.current = setTimeout(() => {
        setShaking(false);
        setQuestion(generateQuestion());
        setInput('');
      }, 500);
    }
  }, [input, shaking, question.answer, onSuccess]);

  return (
    <AppScreen
      className="fixed inset-0 z-50 bg-bg-light/95 backdrop-blur-md"
      contentClassName="max-w-sm"
    >
      <TopBar left={<BackButton onClick={onCancel} />} />

      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="w-full px-6 flex flex-col items-center gap-6">
          <div className="text-center">
            <h2 className="text-4xl font-bold text-text-main">Pre rodičov</h2>
            <p className="text-lg opacity-60 font-medium mt-1">Vyriešte príklad pre vstup</p>
          </div>

          <Card
            variant="panel"
            className={`w-full py-6 text-center text-5xl font-bold text-text-main ${shaking ? 'animate-shake' : ''}`}
          >
            {question.a} {question.op} {question.b} = ?
          </Card>

          <Card className="w-full rounded-2xl py-4 min-h-[72px] flex items-center justify-center text-4xl font-bold text-text-main">
            {input || <span className="opacity-30">—</span>}
          </Card>

          <div className="grid grid-cols-3 gap-3 w-full">
            {DIGITS.map(d => (
              <Button
                key={d}
                variant="quiet"
                onClick={() => handleDigit(d)}
                className="py-5 text-2xl"
              >
                {d}
              </Button>
            ))}
            <Button
              variant="quiet"
              onClick={handleBackspace}
              className="!bg-bg-light py-5 text-xl opacity-70"
            >
              ⌫
            </Button>
            <Button
              variant="quiet"
              onClick={() => handleDigit('0')}
              className="py-5 text-2xl"
            >
              0
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirm}
              disabled={!input || shaking}
              className="bg-success py-5 text-2xl text-text-main shadow-block-correct"
            >
              ✓
            </Button>
          </div>
        </div>
      </div>
    </AppScreen>
  );
}
