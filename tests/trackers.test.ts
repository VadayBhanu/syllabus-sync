import { describe, expect, it } from "vitest";
import { parseTracker, progressOf, streakOf } from "@/lib/trackers";

describe("Autopilot trackers", () => {
  it("parses natural requests", () => {
    expect(parseTracker("Track my gym sessions 3 times a week")).toEqual({ title: "Gym sessions", target: 3, unit: "times", period: "week" });
    expect(parseTracker("add a tracker for reading 20 pages a day")).toEqual({ title: "Reading", target: 20, unit: "pages", period: "day" });
    expect(parseTracker("create a habit tracker for leetcode problems 5 per week")).toMatchObject({ target: 5, period: "week" });
    expect(parseTracker("track office hours twice a week")).toMatchObject({ title: "Office hours", target: 2 });
    expect(parseTracker("what is due this week")).toBeNull();
  });
  it("counts this week's progress and streaks", () => {
    const tr = { id: "t", title: "Gym", target: 2, unit: "times", period: "week" as const, created: "2026-11-01", log: { "2026-11-03": 1, "2026-11-05": 1, "2026-11-10": 2, "2026-11-16": 1 } };
    expect(progressOf(tr, "2026-11-16")).toBe(1);
    expect(streakOf(tr, "2026-11-16")).toBe(2);
  });
});
