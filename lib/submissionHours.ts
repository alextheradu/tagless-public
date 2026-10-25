export function sumHours(...values: number[]): number {
  const total = values.reduce((sum, value) => sum + value, 0);
  return Math.round(total * 100) / 100;
}

export function formatHackatimeDateRange(
  project: string,
  firstHeartbeatIso: string,
  lastHeartbeatIso: string
): string {
  const fmt = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return `${d.getUTCMonth() + 1}/${d.getUTCDate()}/${d.getUTCFullYear()}`;
  };
  const first = fmt(firstHeartbeatIso);
  const last = fmt(lastHeartbeatIso);
  if (!first || !last) return "";
  return `${project} ${first}-${last}`;
}
