import { describe, expect, it } from "vitest";
import { parseSyllabus } from "@/lib/parser";
import { MESSY_SAMPLES } from "@/lib/sample";
import { buildPlan } from "@/lib/plan";
import { dependencyOf, extensionEmail, recover, weekLoads } from "@/lib/recovery";
import type { Course, SyllabusEvent } from "@/lib/types";

const NOW = new Date(2026, 10, 15, 7);
const TODAY = "2026-11-15";
function semester() {
  let n = 0;
  const id = () => "s" + n++;
  const courses: Course[] = [];
  const events: SyllabusEvent[] = [];
  MESSY_SAMPLES.forEach((s, i) => {
    const r = parseSyllabus(s.text, NOW);
    const c: Course = { id: "c" + i, code: r.courseCode!, name: "", color: "#000", text: s.text };
    courses.push(c);
    r.events.forEach((e, k) => events.push({ ...e, id: `e${i}_${k}`, courseId: c.id }));
  });
  const sessions = buildPlan(events, [], { dailyMinutes: 180, weekends: true, today: TODAY }, id);
  return { courses, events, sessions, id };
}

describe("five messy syllabi", () => {
  it("ignore a superseded exam date and a release date", () => {
    const { events, courses } = semester();
    const phys = courses.find((c) => c.code.startsWith("PHYS"))!;
    const exams = events.filter((e) => e.courseId === phys.id && /exam ii/i.test(e.title));
    expect(exams.map((e) => e.date)).toEqual(["2026-11-19"]);
    expect(events.some((e) => /released/i.test(e.title))).toBe(false);
  });
  it("find the impossible week", () => {
    const { events, sessions } = semester();
    const w = weekLoads(sessions, events, 180, true, TODAY, 3).find((x) => x.start === "2026-11-16")!;
    expect(w.impossible).toBe(true);
    expect(w.minutes).toBeGreaterThan(w.capacity);
  });
});

describe("recovery after three sick days", () => {
  const { events, sessions, courses, id } = semester();
  const r = recover(events, sessions, courses, { from: TODAY, days: 3, dailyMinutes: 180, weekends: true, today: TODAY }, id);
  it("puts nothing on the sick days", () => {
    expect(r.sessions.some((s) => r.lost.includes(s.date))).toBe(false);
  });
  it("leaves you better prepared than the original plan", () => {
    expect(r.summary.recoveryPrepared).toBeGreaterThan(r.summary.originalPrepared);
    expect(r.summary.recoveryAtRisk).toBeLessThan(r.summary.originalAtRisk);
  });
  it("flags deadlines due while you were out for an extension, with a reason", () => {
    expect(r.extensions.map((e) => e.title)).toContain("Annotated bibliography");
    const m = r.moves.find((x) => x.title.includes("Annotated bibliography"))!;
    expect(m.kind).toBe("extension");
    expect(m.why.join(" ")).toMatch(/extension/);
    expect(extensionEmail(r.extensions[0], courses[0], r.lost)).toMatch(/extension/);
  });
  it("never schedules work after its deadline (or extended deadline)", () => {
    const ext = new Set(r.extensions.map((e) => e.id));
    for (const s of r.sessions) {
      const e = events.find((x) => x.id === s.eventId)!;
      expect(s.date <= (ext.has(e.id) ? "2026-11-24" : e.date)).toBe(true);
    }
  });
  it("explains every move", () => {
    expect(r.moves.length).toBeGreaterThan(3);
    for (const m of r.moves) expect(m.why.length).toBeGreaterThan(0);
  });
  it("keeps a project milestone after the one it builds on", () => {
    const report = events.find((e) => e.title === "Project final report")!;
    const dep = dependencyOf(report, events, TODAY)!;
    expect(dep).toBeTruthy();
    for (const s of r.sessions.filter((x) => x.eventId === report.id)) expect(s.date >= dep.date).toBe(true);
  });
});
