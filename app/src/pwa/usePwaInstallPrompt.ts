// src/pwa/usePwaInstallPrompt.ts
import { useEffect, useState } from "react";
import { getDeferredPrompt, subscribeInstallPrompt, triggerInstallPrompt } from "./installPrompt";

export function usePwaInstallPrompt() {
  const [canPrompt, setCanPrompt] = useState(() => !!getDeferredPrompt());

  useEffect(() => {
    const unsub = subscribeInstallPrompt(() => {
      setCanPrompt(!!getDeferredPrompt());
    });

    // sync once on mount
    setCanPrompt(!!getDeferredPrompt());

    return () => {
      unsub(); // returns void
    };
  }, []);

  return {
    canPrompt,
    showButton: true,
    promptInstall: triggerInstallPrompt,
  };
}
