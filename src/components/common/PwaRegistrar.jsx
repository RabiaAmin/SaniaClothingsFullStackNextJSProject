'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

const INSTALL_DISMISSED_KEY = 'sania:pwa-install-dismissed';
const PwaInstallContext = createContext(null);

function isStandaloneMode() {
  if (typeof window === 'undefined') return false;

  return (
    window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
  );
}

function getIosBrowser() {
  if (typeof window === 'undefined') return { isIOS: false, isIOSSafari: false };

  const { userAgent, platform, maxTouchPoints } = window.navigator;
  const isIOS =
    /iPad|iPhone|iPod/.test(userAgent) || (platform === 'MacIntel' && Number(maxTouchPoints) > 1);
  const isIOSSafari =
    isIOS && /Safari/i.test(userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(userAgent);

  return { isIOS, isIOSSafari };
}

function wasDismissedThisSession() {
  try {
    return window.sessionStorage.getItem(INSTALL_DISMISSED_KEY) === 'true';
  } catch {
    return false;
  }
}

export function usePwaInstall() {
  const context = useContext(PwaInstallContext);
  if (!context) throw new Error('usePwaInstall must be used within PwaRegistrar');
  return context;
}

export default function PwaRegistrar({ children }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [promptDismissed, setPromptDismissed] = useState(false);
  const [isPrompting, setIsPrompting] = useState(false);
  const [iosBrowser, setIosBrowser] = useState({ isIOS: false, isIOSSafari: false });
  const installedRef = useRef(isInstalled);
  const dismissedRef = useRef(promptDismissed);
  const { isIOS, isIOSSafari } = iosBrowser;

  useEffect(() => {
    installedRef.current = isInstalled;
  }, [isInstalled]);

  useEffect(() => {
    dismissedRef.current = promptDismissed;
  }, [promptDismissed]);

  useEffect(() => {
    const displayMode = window.matchMedia('(display-mode: standalone)');
    const runningStandalone = isStandaloneMode();
    const dismissed = wasDismissedThisSession();

    installedRef.current = runningStandalone;
    dismissedRef.current = dismissed;
    setIsInstalled(runningStandalone);
    setIsStandalone(runningStandalone);
    setPromptDismissed(dismissed);
    setIosBrowser(getIosBrowser());

    function handleBeforeInstallPrompt(event) {
      event.preventDefault();
      if (!installedRef.current && !dismissedRef.current) setDeferredPrompt(event);
    }

    function handleInstalled() {
      installedRef.current = true;
      dismissedRef.current = false;
      try {
        window.sessionStorage.removeItem(INSTALL_DISMISSED_KEY);
      } catch {
        // Storage may be unavailable in privacy-restricted browser contexts.
      }
      setDeferredPrompt(null);
      setPromptDismissed(false);
      setIsInstalled(true);
    }

    function handleDisplayModeChange(event) {
      const standalone = event.matches || window.navigator.standalone === true;
      setIsStandalone(standalone);
      if (standalone) handleInstalled();
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);
    displayMode.addEventListener?.('change', handleDisplayModeChange);

    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) {
      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.removeEventListener('appinstalled', handleInstalled);
        displayMode.removeEventListener?.('change', handleDisplayModeChange);
      };
    }

    function registerServiceWorker() {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Installation support is progressive enhancement; the web app remains usable.
      });
    }

    if (document.readyState === 'complete') registerServiceWorker();
    else window.addEventListener('load', registerServiceWorker);

    return () => {
      window.removeEventListener('load', registerServiceWorker);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
      displayMode.removeEventListener?.('change', handleDisplayModeChange);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt || isInstalled || promptDismissed || isPrompting) return null;

    setIsPrompting(true);
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      setDeferredPrompt(null);

      if (choice?.outcome === 'accepted') {
        installedRef.current = true;
        setIsInstalled(true);
      } else {
        dismissedRef.current = true;
        try {
          window.sessionStorage.setItem(INSTALL_DISMISSED_KEY, 'true');
        } catch {
          // In-memory state still prevents another prompt during this page session.
        }
        setPromptDismissed(true);
      }

      return choice?.outcome ?? null;
    } catch {
      setDeferredPrompt(null);
      return null;
    } finally {
      setIsPrompting(false);
    }
  }, [deferredPrompt, isInstalled, isPrompting, promptDismissed]);

  const value = useMemo(
    () => ({
      canInstall: Boolean(deferredPrompt) && !isInstalled && !promptDismissed,
      isInstalled,
      isStandalone,
      isIOS,
      isIOSSafari,
      isPrompting,
      shouldShowManualInstall: isIOS && !isInstalled,
      install,
    }),
    [
      deferredPrompt,
      install,
      isIOS,
      isIOSSafari,
      isInstalled,
      isPrompting,
      isStandalone,
      promptDismissed,
    ]
  );

  return <PwaInstallContext.Provider value={value}>{children}</PwaInstallContext.Provider>;
}
