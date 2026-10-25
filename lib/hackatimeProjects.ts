
export function parseHackatimeProjects(value: string | undefined | null): string[] {
  if (!value) return [];
  const names = value
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
  return Array.from(new Set(names));
}

export function joinHackatimeProjects(names: string[]): string {
  return parseHackatimeProjects(names.join(",")).join(", ");
}

export interface ProjectBreakdownEntry {
  name: string;
  hours: number;
  aiHours: number;
  description: string;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function formatProjectBreakdown(entries: ProjectBreakdownEntry[]): string {
  return entries
    .map((e) => {
      const desc = e.description.replace(/\s+/g, " ").trim();
      return `${e.name} (${round1(e.hours)}h, ${round1(e.aiHours)}h AI): ${desc}`;
    })
    .join("\n");
}

export function parseProjectBreakdown(value: string | undefined | null): ProjectBreakdownEntry[] {
  if (!value) return [];
  const entries: ProjectBreakdownEntry[] = [];
  for (const line of value.split("\n")) {
    const match = line.match(/^(.+?) \((\d+(?:\.\d+)?)h(?:, (\d+(?:\.\d+)?)h AI)?\): ?(.*)$/);
    if (!match) continue;
    entries.push({
      name: match[1],
      hours: parseFloat(match[2]),
      aiHours: match[3] ? parseFloat(match[3]) : 0,
      description: match[4],
    });
  }
  return entries;
}

export function parseProjectDescriptions(value: string | undefined | null): Record<string, string> {
  if (!value) return {};
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === "string") out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export function descriptionsFromBreakdown(value: string | undefined | null): Record<string, string> {
  return Object.fromEntries(parseProjectBreakdown(value).map((e) => [e.name, e.description]));
}

export const MAX_HACKATIME_PROJECTS = 10;
