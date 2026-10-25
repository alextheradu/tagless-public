import { describe, expect, it } from "vitest";
import {
  computeBalance,
  effectiveHours,
  stampBreakdown,
  stampsEarned,
  tagClaimableSubmission,
  MIN_HOURS_FOR_TAG,
} from "./rewards";
import type { AirtableRecordWithId, ShopOrderWithId, StampAdjustmentWithId } from "./types";

function submission(overrides: Partial<AirtableRecordWithId>): AirtableRecordWithId {
  return {
    "Normal Coding Hours": 0,
    "AI Coding Hours": 0,
    Status: "Approved",
    _id: "rec1",
    _createdTime: "2026-01-01T00:00:00.000Z",
    ...overrides,
  } as unknown as AirtableRecordWithId;
}

describe("effectiveHours", () => {
  it("adds Lapse Hours to Normal Coding Hours when there's no override", () => {
    const s = submission({ "Normal Coding Hours": 10, "Lapse Hours": 2 });
    expect(effectiveHours(s)).toBe(12);
  });

  it("ignores Lapse Hours when there's an override", () => {
    const s = submission({
      "Normal Coding Hours": 10,
      "Lapse Hours": 2,
      "Optional - Override Hours Spent": 5,
    });
    expect(effectiveHours(s)).toBe(5);
  });

  it("treats a missing Lapse Hours as zero", () => {
    const s = submission({ "Normal Coding Hours": 10 });
    expect(effectiveHours(s)).toBe(10);
  });
});

describe("stampsEarned", () => {
  it("counts Lapse Hours toward the payout above the minimum", () => {
    const s = submission({
      "Normal Coding Hours": MIN_HOURS_FOR_TAG,
      "Lapse Hours": 3,
    });
    expect(stampsEarned(s)).toBe(150);
  });
});

describe("stampsEarned across projects", () => {
  const first = submission({ _id: "first", "Normal Coding Hours": 10, _createdTime: "2026-01-01T00:00:00.000Z" });
  const second = submission({ _id: "second", "Normal Coding Hours": 10, _createdTime: "2026-02-01T00:00:00.000Z" });
  const update = submission({
    _id: "upd",
    "Normal Coding Hours": 3,
    "Update Of": "first",
    _createdTime: "2026-03-01T00:00:00.000Z",
  });
  const all = [update, second, first];

  it("only deducts the tag hours from the earliest approved project", () => {
    expect(stampsEarned(first, all)).toBe(300);
    expect(stampsEarned(second, all)).toBe(500);
  });

  it("pays updates out in full", () => {
    expect(stampsEarned(update, all)).toBe(150);
    expect(computeBalance(all, [])).toBe(950);
  });

  it("deducts from whichever project a tag was actually claimed on", () => {
    const claimedSecond = { ...second, "Tag Claimed": true };
    const list = [first, claimedSecond];
    expect(stampsEarned(first, list)).toBe(500);
    expect(stampsEarned(claimedSecond, list)).toBe(300);
  });
});

describe("tagClaimableSubmission", () => {
  it("is the earliest approved non-update project", () => {
    const a = submission({ _id: "a", _createdTime: "2026-02-01T00:00:00.000Z" });
    const b = submission({ _id: "b", _createdTime: "2026-01-01T00:00:00.000Z" });
    const pending = submission({ _id: "p", Status: "Pending", _createdTime: "2025-01-01T00:00:00.000Z" });
    const upd = submission({ _id: "u", "Update Of": "b", _createdTime: "2025-06-01T00:00:00.000Z" });
    expect(tagClaimableSubmission([a, b, pending, upd])?._id).toBe("b");
  });

  it("is nothing once any tag is claimed", () => {
    const a = submission({ _id: "a" });
    const b = submission({ _id: "b", "Tag Claimed": true });
    expect(tagClaimableSubmission([a, b])).toBeNull();
  });
});

describe("stampBreakdown", () => {
  const project = submission({ "Normal Coding Hours": 6, "Tag Claimed": true });
  const order = (stamps: number, Status: ShopOrderWithId["Status"] = "Pending") =>
    ({ "Total Stamps Spent": stamps, Status }) as ShopOrderWithId;
  const adjustment = (Amount: number) => ({ Amount }) as StampAdjustmentWithId;

  it("adds manual adjustments (grants and clawbacks) on top of earned - spent", () => {
    const result = stampBreakdown([project], [order(30), order(999, "Cancelled")], [
      adjustment(25),
      adjustment(-5),
    ]);
    expect(result).toEqual({ earned: 100, spent: 30, adjusted: 20, balance: 90 });
    expect(computeBalance([project], [order(30)], [adjustment(20)])).toBe(90);
  });

  it("defaults to no adjustments", () => {
    expect(computeBalance([project], [])).toBe(100);
  });
});
