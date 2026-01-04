import { create } from "zustand";
import { getMe, getMeProgress, type MeResponse } from "../api";
import { useXpStore } from "../xp/useXpStore";

export type AuthStatus = "unknown" | "authed" | "guest";

type AuthState = {
  status: AuthStatus;
  me: MeResponse["user"] | null;
  needsOnboarding: boolean;
  deferOnboardingThisSession: boolean;
  setDeferOnboardingThisSession: (v: boolean) => void;
  setNeedsOnboarding: (v: boolean) => void;
  error?: string;
  init: () => Promise<void>;
  setGuest: () => void;
  setAuthed: (user: MeResponse["user"]) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  status: "unknown",
  me: null,
  needsOnboarding: false,
  deferOnboardingThisSession: false,
  error: undefined,
  init: async () => {
    try {
      const data = await getMe();
      if (data.logged_in && data.user?.id) {
        // Hydrate XP state from the server so progression is synced across devices.
        let prog: any = null;
        try {
          prog = await getMeProgress();
          if (prog?.xpState) {
            useXpStore.getState().setState(prog.xpState as any);
          }
        } catch {
          // If hydration fails, keep local XP cache (localStorage) so the app remains usable.
        }
        set({
          status: "authed",
          me: data.user,
          error: undefined,
          // Prefer progress endpoint flag; fall back to /me flag if progress hydration fails.
          needsOnboarding: typeof prog?.needsOnboarding === "boolean" ? prog.needsOnboarding : !!data.needsOnboarding,
          deferOnboardingThisSession: false,
        });
      } else {
        set({ status: "guest", me: null, error: undefined, needsOnboarding: false, deferOnboardingThisSession: false });
      }
    } catch (e: any) {
      // If the request fails, treat as guest but surface error for debugging.
      set({ status: "guest", me: null, error: e?.message || String(e) });
    }
  },
  setGuest: () => set({ status: "guest", me: null, error: undefined, needsOnboarding: false, deferOnboardingThisSession: false }),
  setAuthed: (user) => set({ status: "authed", me: user, error: undefined }),
  setDeferOnboardingThisSession: (v) => set({ deferOnboardingThisSession: v }),
  setNeedsOnboarding: (v) => set({ needsOnboarding: v }),
}));
