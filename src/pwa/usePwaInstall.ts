import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

declare global {
  interface Navigator {
    standalone?: boolean;
  }
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export type PwaInstallPlatform = 'chromium' | 'ios' | 'unsupported';

export interface PwaInstallState {
  canInstall: boolean;
  isStandalone: boolean;
  isIos: boolean;
  platform: PwaInstallPlatform;
  offlineReady: boolean;
  needRefresh: boolean;
  registrationError: string | null;
  promptInstall(): Promise<void>;
  updateApp(): Promise<void>;
  dismissOfflineReady(): void;
  dismissUpdate(): void;
}

function isStandaloneDisplay(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.matchMedia('(display-mode: fullscreen)').matches
    || window.navigator.standalone === true;
}

function isIosLike(): boolean {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
    || (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
}

function hasServiceWorkerSupport(): boolean {
  return 'serviceWorker' in navigator;
}

export function usePwaInstall(): PwaInstallState {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(() => isStandaloneDisplay());
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  const isIos = useMemo(() => isIosLike(), []);

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error) {
      setRegistrationError(error instanceof Error ? error.message : 'Registrácia offline režimu zlyhala.');
    },
  });

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setInstallPrompt(null);
      setIsStandalone(true);
    };

    const handleDisplayModeChange = () => {
      setIsStandalone(isStandaloneDisplay());
    };

    const standaloneQuery = window.matchMedia('(display-mode: standalone)');
    const fullscreenQuery = window.matchMedia('(display-mode: fullscreen)');
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    standaloneQuery.addEventListener('change', handleDisplayModeChange);
    fullscreenQuery.addEventListener('change', handleDisplayModeChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      standaloneQuery.removeEventListener('change', handleDisplayModeChange);
      fullscreenQuery.removeEventListener('change', handleDisplayModeChange);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!installPrompt) return;
    try {
      await installPrompt.prompt();
      await installPrompt.userChoice;
    } finally {
      setInstallPrompt(null);
    }
  }, [installPrompt]);

  const updateApp = useCallback(async () => {
    await updateServiceWorker(true);
  }, [updateServiceWorker]);

  const platform: PwaInstallPlatform = installPrompt
    ? 'chromium'
    : isIos && !isStandalone
      ? 'ios'
      : 'unsupported';

  return {
    canInstall: Boolean(installPrompt) || (isIos && !isStandalone),
    isStandalone,
    isIos,
    platform,
    offlineReady: hasServiceWorkerSupport() && offlineReady,
    needRefresh: hasServiceWorkerSupport() && needRefresh,
    registrationError,
    promptInstall,
    updateApp,
    dismissOfflineReady: () => setOfflineReady(false),
    dismissUpdate: () => setNeedRefresh(false),
  };
}
