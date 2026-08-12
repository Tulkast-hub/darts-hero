// app/src/api.ts

type Payload = any;

// Base URL for the standalone API (PHP).
// Example in app/.env.staging:
// VITE_API_BASE_URL=https://staging-api.federatiedarts.ro/
const RAW_BASE = import.meta.env.VITE_API_BASE_URL || "/";
const API_BASE = RAW_BASE.replace(/\/+$/, "");

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers || {});
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${API_BASE}/${path.replace(/^\//, "")}`, {
    credentials: "include",
    ...init,
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data as T;
}

/**
 * Response types (kept compatible with your previous WP endpoints).
 * Server can keep returning nonce as "" for compatibility.
 */

export type MeResponse = {
  logged_in: boolean;
  nonce?: string;
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
  nonce?: string;
  xpState: XpState;
  needsOnboarding?: boolean;
};

export async function getMe() {
  return apiFetch<MeResponse>("me", { method: "GET" });
}

export async function login(username: string, password: string, remember = true) {
  return apiFetch<{ ok: boolean; user: { id: number }; nonce?: string }>("login", {
    method: "POST",
    body: JSON.stringify({ username, password, remember }),
  });
}

export async function logout() {
  return apiFetch<{ ok: boolean; nonce?: string; user?: { id: number } }>("logout", {
    method: "POST",
  });
}

export async function getMeProgress() {
  return apiFetch<MeProgressResponse>("me/progress", { method: "GET" });
}

export async function submitOnboardingChoice(choice: "new_player" | "advanced_player") {
  const res = await fetch("https://staging-api.federatiedarts.ro/onboarding", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify({ choice }),
  });

  const text = await res.text();
  console.log("ONBOARDING RAW RESPONSE:", text);

  if (!res.ok) {
    throw new Error(text);
  }

  return JSON.parse(text);
}

export async function startSession(game_key: string) {
  return apiFetch<{ id: number }>("session", {
    method: "POST",
    body: JSON.stringify({ game_key }),
  });
}

export type EndSessionResponse = {
  ok: boolean;
  xp: number;
  xpState: XpState;
  nonce?: string;
};

export async function endSession(id: number, game_key: string, payload: Payload, result?: any) {
  return apiFetch<EndSessionResponse>(`session/${id}`, {
    method: "POST",
    body: JSON.stringify({ game_key, payload, result }),
  });
}

/**
 * Optional helper for your planned "Create User" page:
 * If you implement POST /admin/create-user on the API,
 * this function can call it from the frontend (staging only).
 */
export async function adminCreateUser(input: {
  username: string;
  password: string;
  email?: string;
  display_name?: string;
  admin_key: string;
}) {
  return apiFetch<{ ok: boolean; user: { id: number; username: string } }>("admin/create-user", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export type LeaderboardRow = {
  user_id: number;
  username?: string;
  display_name?: string;
  total_xp: number;
  category_xp?: Record<string, number>;
};

export async function getLeaderboard(): Promise<LeaderboardRow[]> {
  const res: any = await apiFetch(`/leaderboard`, { method: "GET" });

  // allow either { rows: [...] } or [...] from backend
  if (Array.isArray(res)) return res as LeaderboardRow[];
  if (res && Array.isArray(res.rows)) return res.rows as LeaderboardRow[];
  return [];
}

export async function requestPasswordReset(identifier: string) {
  // identifier can be username OR email
  return apiFetch<{ ok: boolean }>("password/request-reset", {
    method: "POST",
    body: JSON.stringify({ identifier }),
  });
}

export async function confirmPasswordReset(input: {
  uid: number;
  token: string;
  new_password: string;
}) {
  return apiFetch<{ ok: boolean }>("password/confirm-reset", {
    method: "POST",
    body: JSON.stringify(input),
  });
}