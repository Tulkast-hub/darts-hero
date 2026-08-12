// src/pwa/installPrompt.ts
export type BIPEvent = Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  };
  
  let deferred: BIPEvent | null = null;
  const listeners = new Set<() => void>();
  
  export function initInstallPromptCapture() {
    // Only set up once
    if ((window as any).__dh_bip_inited) return;
    (window as any).__dh_bip_inited = true;
  
    window.addEventListener("beforeinstallprompt", (e: Event) => {
      // IMPORTANT: prevent default so *we* can trigger it later
      e.preventDefault();
  
      deferred = e as BIPEvent;
      listeners.forEach((fn) => fn());
    });
  
    window.addEventListener("appinstalled", () => {
      deferred = null;
      listeners.forEach((fn) => fn());
    });
  }
  
  export function getDeferredPrompt() {
    return deferred;
  }
  
// src/pwa/installPrompt.ts
export function subscribeInstallPrompt(fn: () => void) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn); // <-- do not return this value
    };
  }
  
  export async function triggerInstallPrompt() {
    if (!deferred) return null;
    const e = deferred;
    await e.prompt();
    const choice = await e.userChoice;
    // after user responds, Chrome expects the event to be discarded
    deferred = null;
    listeners.forEach((fn) => fn());
    return choice;
  }
  