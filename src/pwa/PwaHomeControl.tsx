import React, { useState } from 'react';
import { CheckCircle2, Download, RefreshCw, Share2, X } from 'lucide-react';
import { Button, Card, IconButton } from '../shared/ui';
import { pwaControlCopy } from './pwaConfig';
import { usePwaInstall } from './usePwaInstall';

export interface PwaHomeControlProps {
  className?: string;
}

export function PwaHomeControl({ className }: PwaHomeControlProps) {
  const pwa = usePwaInstall();
  const [showIosHelp, setShowIosHelp] = useState(false);

  if (!pwa.canInstall && !pwa.needRefresh && !pwa.offlineReady && !pwa.registrationError && !showIosHelp) {
    return null;
  }

  const handleInstall = async () => {
    if (pwa.platform === 'chromium') {
      await pwa.promptInstall();
      return;
    }
    if (pwa.platform === 'ios') {
      setShowIosHelp((value) => !value);
    }
  };

  return (
    <div
      className={`fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] left-4 right-4 z-40 mx-auto max-w-sm space-y-2 sm:left-auto sm:right-6 sm:w-80 sm:max-w-none ${className ?? ''}`}
    >
      {pwa.needRefresh && (
        <Card className="w-full !rounded-2xl !p-3 text-left !shadow-sm">
          <div className="flex items-start gap-2">
            <RefreshCw size={18} className="mt-1 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-text-main">Nová verzia je pripravená.</p>
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="primary" onClick={() => void pwa.updateApp()}>
                  Aktualizovať
                </Button>
                <Button size="sm" variant="quiet" onClick={pwa.dismissUpdate}>
                  Neskôr
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {pwa.offlineReady && !pwa.needRefresh && (
        <Card className="w-full !rounded-2xl !p-3 text-left !shadow-sm">
          <div className="flex items-start gap-2">
            <CheckCircle2 size={18} className="mt-1 shrink-0 text-green-600" />
            <p className="min-w-0 flex-1 text-sm font-bold text-text-main">{pwaControlCopy.offlineReady}</p>
            <IconButton label="Zavrieť" onClick={pwa.dismissOfflineReady} className="!h-8 !w-8 !bg-shadow/10 !shadow-none">
              <X size={16} />
            </IconButton>
          </div>
        </Card>
      )}

      {pwa.canInstall && !pwa.needRefresh && (
        <button
          type="button"
          aria-label={pwaControlCopy.installLabel}
          className="w-full rounded-2xl bg-white/95 p-3 text-left shadow-md ring-1 ring-shadow/10 backdrop-blur transition-transform active:scale-[0.98]"
          onClick={() => void handleInstall()}
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
              {pwa.platform === 'ios' ? <Share2 size={20} /> : <Download size={20} />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold leading-tight text-text-main">{pwaControlCopy.installLabel}</span>
              <span className="mt-1 block text-xs font-semibold leading-snug text-text-main/55">
                {pwa.platform === 'ios' ? pwaControlCopy.iosInstallDescription : pwaControlCopy.installDescription}
              </span>
            </span>
          </div>
        </button>
      )}

      {showIosHelp && (
        <Card className="w-full !rounded-2xl !p-3 text-left !shadow-sm">
          <div className="flex items-start gap-2">
            <Share2 size={18} className="mt-1 shrink-0 text-accent-orange" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-text-main">{pwaControlCopy.iosHelp}</p>
              <button
                type="button"
                onClick={() => setShowIosHelp(false)}
                className="mt-2 text-sm font-bold text-text-main/60 active:opacity-60"
              >
                Rozumiem
              </button>
            </div>
            <IconButton
              label="Zavrieť"
              onClick={() => setShowIosHelp(false)}
              className="!h-8 !w-8 !bg-shadow/10 !shadow-none"
            >
              <X size={16} />
            </IconButton>
          </div>
        </Card>
      )}

      {pwa.registrationError && (
        <Card className="w-full !rounded-2xl !p-3 text-left !shadow-sm">
          <p className="text-sm font-bold text-primary">Offline režim sa nepodarilo pripraviť.</p>
        </Card>
      )}
    </div>
  );
}
