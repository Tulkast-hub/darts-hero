type Payload = any;

declare global {
  interface Window {
    DTAPP?: { root: string; nonce: string; user: number };
  }
}
const W = window as any;

function apiRoot() {
  return (W.DTAPP?.root || "/wp-json/darts/v1/").replace(/\/+$/, "/");
}

function getNonce() {
  return W.DTAPP?.nonce || "";
}

function setAuthGlobals(next: { user?: number; nonce?: string }) {
  if (!W.DTAPP) W.DTAPP = { root: apiRoot(), nonce: "", user: 0 };
  if (typeof next.user === "number") W.DTAPP.user = next.user;
  if (typeof next.nonce === "string") W.DTAPP.nonce = next.nonce;
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers || {});
  const nonce = getNonce();
  if (nonce) headers.set("X-WP-Nonce", nonce);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${apiRoot()}${path.replace(/^\//, "")}`, {
    credentials: "include",
    ...init,
    headers
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data as T;
}

export type MeResponse = {
  logged_in: boolean;
  nonce: string;
  user: { id: number; login?: string; display_name?: string; email?: string };
  needsOnboarding?: boolean;
};

// XP snapshot returned from the server (compatible with src/xp/store.ts XpState).
export type XpState = {
  totalXp: number;
  categoryXp: Record<string, number>;
  drillXp: Record<string, number>;
};

export type MeProgressResponse = {
  ok: boolean;
  nonce: string;
  xpState: XpState;
  needsOnboarding?: boolean;
};

export async function getMe() {
  const data = await apiFetch<MeResponse>("me", { method: "GET" });
  setAuthGlobals({ user: data.user?.id || 0, nonce: data.nonce });
  return data;
}

export async function login(username: string, password: string, remember = true) {
  const data = await apiFetch<{ ok: boolean; user: { id: number }; nonce: string }>("login", {
    method: "POST",
    body: JSON.stringify({ username, password, remember })
  });
  setAuthGlobals({ user: data.user?.id || 0, nonce: data.nonce });
  return data;
}

export async function logout() {
  const data = await apiFetch<{ ok: boolean; user: { id: number }; nonce: string }>("logout", {
    method: "POST"
  });
  setAuthGlobals({ user: 0, nonce: data.nonce });
  return data;
}

export async function getMeProgress() {
  const data = await apiFetch<MeProgressResponse>("me/progress", { method: "GET" });
  setAuthGlobals({ nonce: data.nonce });
  return data;
}


export async function submitOnboardingChoice(choice: "new_player" | "advanced_player") {
  const data = await apiFetch<MeProgressResponse>("onboarding", {
    method: "POST",
    body: JSON.stringify({ choice }),
  });
  setAuthGlobals({ user: W.DTAPP?.user || 0, nonce: data.nonce });
  return data;
}

export async function startSession(game_key: string) {
  return apiFetch<{ id: number }>("session", {
    method: "POST",
    body: JSON.stringify({ game_key })
  });
}

export type EndSessionResponse = {
  ok: boolean;
  xp: number;
  xpState: XpState;
  nonce: string;
};

export async function endSession(id: number, game_key: string, payload: Payload, result?: any) {
  const data = await apiFetch<EndSessionResponse>(`session/${id}`, {
    method: "POST",
    body: JSON.stringify({ game_key, payload, result })
  });
  setAuthGlobals({ nonce: data.nonce });
  return data;
}
