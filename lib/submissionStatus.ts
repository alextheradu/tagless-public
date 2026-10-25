import type { AirtableRecordWithId } from "./types";

export function isFullyApproved(submission: Pick<AirtableRecordWithId, "Status" | "Unified Synced At">): boolean {
  return submission.Status === "Approved" && !!submission["Unified Synced At"];
}

export function hackerView(submission: AirtableRecordWithId): AirtableRecordWithId {
  const visible = { ...submission };
  if (visible.Status === "Approved" && !visible["Unified Synced At"]) {
    return { ...visible, Status: "Pending" };
  }
  return visible;
}
