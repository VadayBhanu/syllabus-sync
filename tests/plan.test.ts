import { describe, expect, it } from "vitest";
import { buildPlan, overloadedDays } from "@/lib/plan";
import type { SyllabusEvent } from "@/lib/types";

let n = 0;
const id = () => `s${n++}`;
const ev = (p: Partial<SyllabusEvent>): SyllabusEvent => ({ id: "e" + n++, courseId: "c", title: "X", date: "2026-11-20", kind: "assignment", confidence: "high", ...p });

describe("work plan", () => {
  const opts = { dailyMinutes: 180, weekends: true, today: "2026-11-14" };

  it("schedules study before the deadline, never after", () => {
    const e = ev({ kind: "exam", weight: 25, date: "2026-11-20" });
    const plan = buildPlan([e], [], opts, id);
    expect(plan.length).toBeGreaterThan(1);
    for (const s of plan) {
      expect(s.date < e.date).toBe(true);
      expect(s.date >= opts.today).toBe(true);
    }
    expect(plan.reduce((t, s) => t + s.minutes, 0)).toBe(360);
  });

  it("spreads a crunch week instead of stacking one day", () => {
    const es = [
      ev({ kind: "exam", date: "2026-11-18" }),
      ev({ kind: "exam", date: "2026-11-18" }),
      ev({ kind: "project", date: "2026-11-17" }),
    ];
    const plan = buildPlan(es, [], opts, id);
    const days = new Set(plan.map((s) => s.date));
    expect(days.size).toBeGreaterThanOrEqual(3);
  });

  it("keeps sessions the person edited", () => {
    const e = ev({ kind: "assignment", date: "2026-11-19" });
    const pinned = { id: "p", eventId: e.id, courseId: "c", date: "2026-11-15", minutes: 60, label: "mine", pinned: true };
    const plan = buildPlan([e], [pinned], opts, id);
    expect(plan.find((s) => s.id === "p")).toEqual(pinned);
    expect(plan.reduce((t, s) => t + s.minutes, 0)).toBe(150);
  });

  it("drops sessions for deleted deadlines and skips past ones", () => {
    const old = ev({ date: "2026-11-01" });
    const stale = { id: "z", eventId: "gone", courseId: "c", date: "2026-11-15", minutes: 60, label: "x", pinned: true };
    expect(buildPlan([old], [stale], opts, id)).toEqual([]);
  });

  it("respects no-weekend option when possible", () => {
    const e = ev({ kind: "project", date: "2026-11-27" });
    const plan = buildPlan([e], [], { ...opts, weekends: false }, id);
    for (const s of plan) expect([0, 6]).not.toContain(new Date(s.date + "T12:00").getDay());
  });

  it("reports overloaded days", () => {
    const s = [{ id: "a", eventId: "x", courseId: "c", date: "2026-11-15", minutes: 200, label: "" }];
    expect(overloadedDays(s, 180)).toEqual(["2026-11-15"]);
  });

  it("handles a deadline due today", () => {
    const e = ev({ kind: "quiz", date: "2026-11-14" });
    const plan = buildPlan([e], [], opts, id);
    expect(plan.every((s) => s.date === "2026-11-14")).toBe(true);
  });
});
