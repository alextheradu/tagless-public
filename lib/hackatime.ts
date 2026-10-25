import type { HackatimeStats } from "./types";
import {
  MAX_HACKATIME_PROJECTS,
  formatProjectBreakdown,
  joinHackatimeProjects,
  parseHackatimeProjects,
} from "./hackatimeProjects";

const BASE_URL = "https://hackatime.hackclub.com";

export class HackatimeApiError extends Error {
  constructor(
    public readonly endpoint: string,
    public readonly status: number,
    body: string
  ) {
    super(`Hackatime ${endpoint} ${status}${body ? `: ${body}` : ""}`);
    this.name = "HackatimeApiError";
  }
}

export function hackatimeAuthorizeUrl(state: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: process.env.HACKATIME_UID!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "profile read",
    state,
  });
  return `${BASE_URL}/oauth/authorize?${params}`;
}

export async function hackatimeExchangeCode(
  code: string,
  redirectUri: string
): Promise<string> {
  const res = await fetch(`${BASE_URL}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.HACKATIME_UID!,
      client_secret: process.env.HACKATIME_SECRET!,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }).toString(),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Hackatime token exchange failed: ${res.status} ${text}`);
  }
  const json = await res.json();
  return json.access_token;
}

function authHeader(token: string): string {
  return `Bearer ${token}`;
}

async function throwHackatimeError(res: Response, endpoint: string): Promise<never> {
  const text = await res.text().catch(() => "");
  throw new HackatimeApiError(endpoint, res.status, text);
}

export async function getHackatimeUserId(token: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/v1/authenticated/me`, {
    headers: { Authorization: authHeader(token) },
    cache: "no-store",
  });
  if (!res.ok) await throwHackatimeError(res, "/authenticated/me");

  const json: {
    id?: string | number;
    data?: { id?: string | number };
    user?: { id?: string | number };
  } = await res.json();
  const id = json.id ?? json.data?.id ?? json.user?.id;
  if (id === undefined || id === null || String(id).length === 0) {
    throw new Error("Hackatime /authenticated/me did not return a user id");
  }
  return String(id);
}

export async function getProjects(token: string): Promise<string[]> {
  const res = await fetch(`${BASE_URL}/api/v1/authenticated/projects`, {
    headers: { Authorization: authHeader(token) },
    cache: "no-store",
  });
  if (!res.ok) await throwHackatimeError(res, "/authenticated/projects");

  const json: { projects?: Array<{ name?: unknown }> } = await res.json();
  return (json.projects ?? [])
    .map((project) => project.name)
    .filter((name): name is string => typeof name === "string" && name.length > 0);
}

export interface StatsRange {
  since?: string;
  until?: string;
}

function statsDateParams(range?: StatsRange): { start_date: string; end_date: string } {
  return {
    start_date: range?.since ?? "2020-01-01",
    end_date: range?.until ?? new Date().toISOString(),
  };
}

export async function getProjectsWithHours(
  token: string,
  userId: string,
  range?: StatsRange
): Promise<{ name: string; totalSeconds: number }[]> {
  const params = new URLSearchParams({
    features: "projects",
    ...statsDateParams(range),
  });

  const res = await fetch(
    `${BASE_URL}/api/v1/users/${userId}/stats?${params}`,
    {
      headers: { Authorization: authHeader(token) },
      cache: "no-store",
    }
  );

  if (!res.ok) await throwHackatimeError(res, "/users/stats");

  const json = await res.json();
  const projects: Array<{ name?: unknown; total_seconds?: unknown }> =
    json.data?.projects ?? [];

  return projects
    .filter(
      (p): p is { name: string; total_seconds: number } =>
        typeof p.name === "string" && p.name.length > 0
    )
    .map((p) => ({
      name: p.name,
      totalSeconds: typeof p.total_seconds === "number" ? p.total_seconds : 0,
    }));
}

export async function getProjectStats(
  token: string,
  userId: string,
  project: string,
  range?: StatsRange
): Promise<HackatimeStats> {
  const baseParams = {
    filter_by_project: project,
    ...statsDateParams(range),
  };

  const [combinedRes, normalRes] = await Promise.all([
    fetch(`${BASE_URL}/api/v1/users/${userId}/stats?${new URLSearchParams(baseParams)}`, {
      headers: { Authorization: authHeader(token) },
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    }),
    fetch(
      `${BASE_URL}/api/v1/users/${userId}/stats?${new URLSearchParams({ ...baseParams, no_ai_coding: "true" })}`,
      {
        headers: { Authorization: authHeader(token) },
        cache: "no-store",
        signal: AbortSignal.timeout(20_000),
      }
    ),
  ]);

  if (!combinedRes.ok) await throwHackatimeError(combinedRes, "/users/stats");
  if (!normalRes.ok) await throwHackatimeError(normalRes, "/users/stats?no_ai_coding=true");

  const combinedJson = await combinedRes.json();
  const normalJson = await normalRes.json();

  const combinedSeconds: number = combinedJson.data?.total_seconds ?? 0;
  const normalSeconds: number = normalJson.data?.total_seconds ?? 0;
  const aiSeconds = Math.max(0, combinedSeconds - normalSeconds);

  return {
    totalSeconds: normalSeconds,
    aiSeconds,
    combinedSeconds,
    projectName: project,
  };
}

export async function getMultiProjectStats(
  token: string,
  userId: string,
  projects: string[],
  range?: StatsRange
): Promise<{ total: HackatimeStats; perProject: HackatimeStats[] }> {
  const perProject = await Promise.all(
    projects.map((project) => getProjectStats(token, userId, project, range))
  );
  const total = perProject.reduce<HackatimeStats>(
    (acc, s) => ({
      totalSeconds: acc.totalSeconds + s.totalSeconds,
      aiSeconds: acc.aiSeconds + s.aiSeconds,
      combinedSeconds: acc.combinedSeconds + s.combinedSeconds,
      projectName: acc.projectName,
    }),
    { totalSeconds: 0, aiSeconds: 0, combinedSeconds: 0, projectName: projects.join(", ") }
  );
  return { total, perProject };
}

export async function getProjectsSnapshot(
  token: string,
  userId: string,
  rawProjects: string,
  descriptions: Record<string, string>
): Promise<{
  hackatimeProject: string;
  normalHours: number;
  aiHours: number;
  breakdown: string;
} | null> {
  const projects = parseHackatimeProjects(rawProjects).slice(0, MAX_HACKATIME_PROJECTS);
  if (projects.length === 0) return null;
  try {
    const { total, perProject } = await getMultiProjectStats(token, userId, projects);
    return {
      hackatimeProject: joinHackatimeProjects(projects),
      normalHours: parseFloat((total.totalSeconds / 3600).toFixed(2)),
      aiHours: parseFloat((total.aiSeconds / 3600).toFixed(2)),
      breakdown:
        projects.length > 1
          ? formatProjectBreakdown(
              projects.map((name, i) => ({
                name,
                hours: perProject[i].combinedSeconds / 3600,
                aiHours: perProject[i].aiSeconds / 3600,
                description: descriptions[name] ?? "",
              }))
            )
          : "",
    };
  } catch {
    return null;
  }
}

export async function getProjectDateRange(
  token: string,
  userId: string,
  project: string
): Promise<{ firstHeartbeat: string; lastHeartbeat: string } | null> {
  try {
    const res = await fetch(
      `${BASE_URL}/api/v1/users/${userId}/project/${encodeURIComponent(project)}`,
      {
        headers: { Authorization: authHeader(token) },
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      }
    );
    if (!res.ok) {
      console.warn(`[hackatime] project date range unavailable (${res.status}) for project "${project}"`);
      return null;
    }
    const json: { first_heartbeat?: unknown; last_heartbeat?: unknown } = await res.json();
    if (typeof json.first_heartbeat !== "string" || typeof json.last_heartbeat !== "string") {
      console.warn(`[hackatime] project date range response missing heartbeat fields for project "${project}"`);
      return null;
    }
    return { firstHeartbeat: json.first_heartbeat, lastHeartbeat: json.last_heartbeat };
  } catch (err) {
    console.warn(`[hackatime] project date range fetch failed for project "${project}":`, err);
    return null;
  }
}
