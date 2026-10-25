import { describe, expect, it } from "vitest";
import { formatHackatimeDateRange, sumHours } from "./submissionHours";

describe("sumHours", () => {
  it("adds multiple hour values together", () => {
    expect(sumHours(10, 2, 0.5)).toBe(12.5);
  });

  it("rounds away floating-point noise to 2 decimals", () => {
    expect(sumHours(0.1, 0.2)).toBe(0.3);
  });

  it("treats no arguments as zero", () => {
    expect(sumHours()).toBe(0);
  });
});

describe("formatHackatimeDateRange", () => {
  it("formats a project name with its first/last heartbeat as M/D/YYYY-M/D/YYYY", () => {
    expect(
      formatHackatimeDateRange("my-project", "2026-07-20T10:00:00Z", "2026-07-22T18:30:00Z")
    ).toBe("my-project 7/20/2026-7/22/2026");
  });

  it("handles a single-day range (same first and last heartbeat date)", () => {
    expect(
      formatHackatimeDateRange("solo-day", "2026-01-05T01:00:00Z", "2026-01-05T23:00:00Z")
    ).toBe("solo-day 1/5/2026-1/5/2026");
  });

  it("returns an empty string for a malformed ISO input", () => {
    expect(
      formatHackatimeDateRange("bad-project", "not-a-date", "2026-01-05T23:00:00Z")
    ).toBe("");
  });

  it("formats a cross-year boundary correctly", () => {
    expect(
      formatHackatimeDateRange("project", "2025-12-31T23:00:00Z", "2026-01-02T01:00:00Z")
    ).toBe("project 12/31/2025-1/2/2026");
  });
});
