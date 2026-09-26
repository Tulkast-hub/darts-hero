
// app/src/api.ts

import type {
  AssessmentResults,
} from "./skills-assessment/useAssessmentStore";

import type {
  AssessmentRawMetrics,
  AssessmentSkillScores,
  AssessmentLevelBand,
} from "./skills-assessment/assessmentMetrics";

type Payload = any;

// Base URL for the standalone PHP API.
// Examples:
// Staging:    VITE_API_BASE_URL=https://staging-api.darts-hero.com
// Production: VITE_API_BASE_URL=https://api.darts-hero.com
const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || ""
).replace(/\/+$/, "");

async function apiFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const headers = new Headers(init.headers || {});

  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  const normalizedPath = path.startsWith("/")
    ? path
    : `/${path}`;

  const res = await fetch(
    `${API_BASE}${normalizedPath}`,
    {
      credentials: "include",
      ...init,
      headers,
    }
  );

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg =
      (data && (data.message || data.error)) ||
      `Request failed (${res.status})`;

    throw new Error(msg);
  }

  return data as T;
}

/**
 * Response types.
 * Server can keep returning nonce as "" for compatibility.
 */

export type MeResponse = {
  logged_in: boolean;
  nonce?: string;
  user: {
    id: number;
    login?: string;
    display_name?: string;
    email?: string;
  };
  needsOnboarding?: boolean;
};

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
  return apiFetch<MeResponse>("me", {
    method: "GET",
  });
}

export async function login(
  username: string,
  password: string,
  remember = true
) {
  return apiFetch<{
    ok: boolean;
    user: {
      id: number;
    };
    nonce?: string;
  }>("login", {
    method: "POST",
    body: JSON.stringify({
      username,
      password,
      remember,
    }),
  });
}

export async function logout() {
  return apiFetch<{
    ok: boolean;
    nonce?: string;
    user?: {
      id: number;
    };
  }>("logout", {
    method: "POST",
  });
}

export async function getMeProgress() {
  return apiFetch<MeProgressResponse>(
    "me/progress",
    {
      method: "GET",
    }
  );
}

export async function submitOnboardingChoice(
  choice: "new_player" | "advanced_player"
) {
  return apiFetch<MeProgressResponse>(
    "onboarding",
    {
      method: "POST",
      body: JSON.stringify({
        choice,
      }),
    }
  );
}

export async function startSession(
  game_key: string
) {
  return apiFetch<{
    id: number;
  }>("session", {
    method: "POST",
    body: JSON.stringify({
      game_key,
    }),
  });
}

export type EndSessionResponse = {
  ok: boolean;
  xp: number;
  xpState: XpState;
  nonce?: string;
};

export async function endSession(
  id: number,
  game_key: string,
  payload: Payload,
  result?: any
) {
  return apiFetch<EndSessionResponse>(
    `session/${id}`,
    {
      method: "POST",
      body: JSON.stringify({
        game_key,
        payload,
        result,
      }),
    }
  );
}

/**
 * Optional helper for the Create User page.
 * This calls POST /admin/create-user.
 */
export async function adminCreateUser(input: {
  username: string;
  password: string;
  email?: string;
  display_name?: string;
  admin_key: string;
}) {
  return apiFetch<{
    ok: boolean;
    user: {
      id: number;
      username: string;
    };
  }>("admin/create-user", {
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

export async function getLeaderboard(): Promise<
  LeaderboardRow[]
> {
  const res: any = await apiFetch(
    "leaderboard",
    {
      method: "GET",
    }
  );

  if (Array.isArray(res)) {
    return res as LeaderboardRow[];
  }

  if (res && Array.isArray(res.rows)) {
    return res.rows as LeaderboardRow[];
  }

  return [];
}

export async function requestPasswordReset(
  identifier: string
) {
  return apiFetch<{
    ok: boolean;
  }>("password/request-reset", {
    method: "POST",
    body: JSON.stringify({
      identifier,
    }),
  });
}

export async function confirmPasswordReset(input: {
  uid: number;
  token: string;
  new_password: string;
}) {
  return apiFetch<{
    ok: boolean;
  }>("password/confirm-reset", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/*
 * --------------------------------------------------
 * SKILLS ASSESSMENT API
 * --------------------------------------------------
 *
 * Assessments are stored independently from:
 *
 * - XP
 * - Training sessions
 * - The player's active rank
 *
 * All assessment endpoints use the authenticated
 * PHP session cookie.
 */

/*
 * Data submitted when an assessment is completed.
 */
export type SaveSkillsAssessmentInput = {
  assessmentUuid: string;

  gameResults: AssessmentResults;

  rawMetrics: AssessmentRawMetrics;

  skillScores: AssessmentSkillScores;

  overallScore: number;

  rankBand: AssessmentLevelBand;

  rankLevel: number;

  calculationVersion: number;
};

/*
 * Response from POST /skills-assessments.
 *
 * alreadySaved is true when the same UUID
 * has previously been submitted.
 */
export type SaveSkillsAssessmentResponse = {
  ok: boolean;
  id: number;
  alreadySaved: boolean;
};

/*
 * A summary record used by the Stats page.
 *
 * The history endpoint deliberately excludes
 * full game results to keep the response small.
 */
export type SkillsAssessmentHistoryItem = {
  id: number;

  assessmentUuid: string;

  overallScore: number;

  rankBand: AssessmentLevelBand;

  rankLevel: number;

  rawMetrics: AssessmentRawMetrics;

  skillScores: AssessmentSkillScores;

  calculationVersion: number;

  completedAt: string;
};

/*
 * A complete saved assessment.
 *
 * Includes the original game results, so
 * historical assessments can be reviewed
 * without recalculating their original scores.
 */
export type SavedSkillsAssessment =
  SkillsAssessmentHistoryItem & {
    gameResults: AssessmentResults;
  };

export type SkillsAssessmentHistoryResponse = {
  ok: boolean;
  assessments: SkillsAssessmentHistoryItem[];
};

export type SkillsAssessmentDetailResponse = {
  ok: boolean;
  assessment: SavedSkillsAssessment;
};

/*
 * Save a completed assessment.
 *
 * The same assessmentUuid must be reused
 * for retries to avoid duplicate records.
 */
export async function saveSkillsAssessment(
  input: SaveSkillsAssessmentInput
): Promise<SaveSkillsAssessmentResponse> {
  return apiFetch<SaveSkillsAssessmentResponse>(
    "skills-assessments",
    {
      method: "POST",
      body: JSON.stringify(input),
    }
  );
}

/*
 * Retrieve the authenticated player's
 * assessment history.
 *
 * Newest assessments are returned first.
 */
export async function getSkillsAssessmentHistory():
  Promise<SkillsAssessmentHistoryResponse> {
  return apiFetch<SkillsAssessmentHistoryResponse>(
    "skills-assessments",
    {
      method: "GET",
    }
  );
}

/*
 * Retrieve one saved assessment, including
 * its complete five-game results.
 */
export async function getSkillsAssessment(
  id: number
): Promise<SkillsAssessmentDetailResponse> {
  return apiFetch<SkillsAssessmentDetailResponse>(
    `skills-assessments/${id}`,
    {
      method: "GET",
    }
  );
}