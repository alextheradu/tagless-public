import { describe, expect, it } from "vitest";
import {
  descriptionsFromBreakdown,
  formatProjectBreakdown,
  joinHackatimeProjects,
  parseHackatimeProjects,
  parseProjectBreakdown,
  parseProjectDescriptions,
} from "./hackatimeProjects";

describe("parseHackatimeProjects", () => {
  it("splits, trims, drops empties and dedupes", () => {
    expect(parseHackatimeProjects(" frontend, backend,,frontend ")).toEqual(["frontend", "backend"]);
  });
  it("handles a single project and empty input", () => {
    expect(parseHackatimeProjects("my-site")).toEqual(["my-site"]);
    expect(parseHackatimeProjects("")).toEqual([]);
    expect(parseHackatimeProjects(undefined)).toEqual([]);
  });
});

describe("joinHackatimeProjects", () => {
  it("joins with a comma and space", () => {
    expect(joinHackatimeProjects(["a", "b", "a"])).toBe("a, b");
  });
});

describe("project breakdown", () => {
  it("round-trips through format and parse", () => {
    const text = formatProjectBreakdown([
      { name: "frontend", hours: 3.24, aiHours: 0.41, description: "the UI\nand styles" },
      { name: "api (old)", hours: 1, aiHours: 0, description: "backend: v1" },
    ]);
    expect(text).toBe("frontend (3.2h, 0.4h AI): the UI and styles\napi (old) (1h, 0h AI): backend: v1");
    expect(parseProjectBreakdown(text)).toEqual([
      { name: "frontend", hours: 3.2, aiHours: 0.4, description: "the UI and styles" },
      { name: "api (old)", hours: 1, aiHours: 0, description: "backend: v1" },
    ]);
    expect(descriptionsFromBreakdown(text)).toEqual({ frontend: "the UI and styles", "api (old)": "backend: v1" });
  });
  it("skips unparseable lines", () => {
    expect(parseProjectBreakdown("garbage\n")).toEqual([]);
  });
});

describe("parseProjectDescriptions", () => {
  it("keeps string values only and tolerates bad JSON", () => {
    expect(parseProjectDescriptions('{"a":"x","b":3}')).toEqual({ a: "x" });
    expect(parseProjectDescriptions("not json")).toEqual({});
    expect(parseProjectDescriptions("[1]")).toEqual({});
  });
});
