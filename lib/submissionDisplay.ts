import type { AirtableRecord } from "@/lib/types";

export function formatHours(hours: number): string {
  const totalMinutes = Math.round(hours * 60);
  if (totalMinutes <= 0) return "0h";
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function projectNameFor(s: AirtableRecord): string {
  if (s["Hackatime Project"]) return s["Hackatime Project"];
  const repo = s["Code URL"]?.replace(/\/+$/, "").split("/").pop();
  if (repo) return repo;
  return s["Slack Handle"] || "untitled";
}
