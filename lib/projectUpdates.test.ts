import { describe, expect, it } from "vitest";
import { rootProjectId, updateEligibility } from "./projectUpdates";
import type { AirtableRecordWithId } from "./types";

function submission(overrides: Partial<AirtableRecordWithId>): AirtableRecordWithId {
  return {
    "Normal Coding Hours": 0,
    "AI Coding Hours": 0,
    Status: "Approved",
    _id: "root",
    _createdTime: "2026-01-10T00:00:00.000Z",
    ...overrides,
  } as unknown as AirtableRecordWithId;
}

describe("rootProjectId", () => {
  it("points an update at its original project", () => {
    expect(rootProjectId(submission({ _id: "u", "Update Of": "root" }))).toBe("root");
    expect(rootProjectId(submission({ _id: "root" }))).toBe("root");
  });
});

describe("updateEligibility", () => {
  it("counts from the root's stats cutoff, falling back to created time", () => {
    const withCutoff = submission({ "Hackatime Stats Through": "2026-01-05T12:00:00.000Z" });
    expect(updateEligibility("root", [withCutoff])).toMatchObject({ ok: true, since: "2026-01-05T12:00:00.000Z" });
    expect(updateEligibility("root", [submission({})])).toMatchObject({ ok: true, since: "2026-01-10T00:00:00.000Z" });
  });

  it("moves the cutoff to the latest approved update, ignoring rejected ones", () => {
    const root = submission({ "Hackatime Stats Through": "2026-01-05T00:00:00.000Z" });
    const approved = submission({ _id: "u1", "Update Of": "root", "Hackatime Stats Through": "2026-02-01T00:00:00.000Z" });
    const rejected = submission({
      _id: "u2",
      "Update Of": "root",
      Status: "Rejected",
      "Hackatime Stats Through": "2026-03-01T00:00:00.000Z",
    });
    expect(updateEligibility("root", [root, approved, rejected])).toMatchObject({
      ok: true,
      since: "2026-02-01T00:00:00.000Z",
    });
  });

  it("blocks a second update while one is in review", () => {
    const pending = submission({ _id: "u1", "Update Of": "root", Status: "Pending" });
    expect(updateEligibility("root", [submission({}), pending]).ok).toBe(false);
  });

  it("blocks unapproved projects and updates as roots", () => {
    expect(updateEligibility("root", [submission({ Status: "Pending" })]).ok).toBe(false);
    expect(updateEligibility("u1", [submission({ _id: "u1", "Update Of": "root" })]).ok).toBe(false);
  });
});
