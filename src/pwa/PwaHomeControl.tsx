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
    <div className={`space-y-2 ${className ?? ''}`}>
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
        <div className="flex justify-end">
          <IconButton
            label={pwaControlCopy.installLabel}
            onClick={() => void handleInstall()}
            className="!h-12 !w-12 !bg-white/70 text-text-main !shadow-sm"
          >
            {pwa.platform === 'ios' ? <Share2 size={20} /> : <Download size={20} />}
          </IconButton>
        </div>
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
