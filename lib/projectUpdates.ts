import type { AirtableRecordWithId } from "./types";

export const MIN_HOURS_FOR_UPDATE = 2;

export function isProjectUpdate(s: Pick<AirtableRecordWithId, "Update Of">): boolean {
  return !!s["Update Of"];
}

export function rootProjectId(s: Pick<AirtableRecordWithId, "_id" | "Update Of">): string {
  return s["Update Of"] || s._id;
}

export function updatesOf(rootId: string, submissions: AirtableRecordWithId[]): AirtableRecordWithId[] {
  return submissions
    .filter((s) => s["Update Of"] === rootId)
    .sort((a, b) => a._createdTime.localeCompare(b._createdTime));
}

function statsThrough(s: AirtableRecordWithId): string {
  return s["Hackatime Stats Through"] || s._createdTime;
}

export type UpdateEligibility =
  | { ok: true; root: AirtableRecordWithId; since: string }
  | { ok: false; reason: string };

export function updateEligibility(rootId: string, submissions: AirtableRecordWithId[]): UpdateEligibility {
  const root = submissions.find((s) => s._id === rootId);
  if (!root || isProjectUpdate(root)) return { ok: false, reason: "Project not found." };
  if (root.Status !== "Approved") {
    return { ok: false, reason: "Only approved projects can get an update." };
  }
  const updates = updatesOf(rootId, submissions);
  if (updates.some((u) => u.Status === "Pending")) {
    return { ok: false, reason: "This project already has an update in review." };
  }
  const shipped = [root, ...updates.filter((u) => u.Status === "Approved")];
  const since = shipped.map(statsThrough).sort().at(-1)!;
  return { ok: true, root, since };
}
