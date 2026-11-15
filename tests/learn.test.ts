import { describe, expect, it } from "vitest";
import { TRACKS, matchTrack, outlineFor, roadmapFor, sanitizeTrack, trackMinutes } from "@/lib/roadmaps";
import { progress, reschedule, scheduleItems, trackToCourse } from "@/lib/learn";
import { buildPlan } from "@/lib/plan";

let n = 0;
const id = (p = "e") => `${p}-${++n}`;

describe("roadmaps", () => {
  it("curated tracks only link to https resources and a roadmap.sh page", () => {
    for (const t of TRACKS) {
      expect(t.roadmap.url).toMatch(/^https:\/\/roadmap\.sh\/[a-z-]+$/);
      for (const s of t.stages) for (const x of s.topics) {
        expect(x.resources.length).toBeGreaterThan(0);
        for (const r of x.resources) expect(r.url).toMatch(/^https:\/\//);
      }
    }
  });

  it("matches free-text goals to tracks and roadmap.sh pages", () => {
    expect(matchTrack("learning artificial intelligence")?.id).toBe("ai-ml");
    expect(matchTrack("cyber security")?.id).toBe("cyber");
    expect(matchTrack("pottery")).toBeUndefined();
    expect(roadmapFor("machine learning").url).toBe("https://roadmap.sh/machine-learning");
    expect(roadmapFor("Rust programming").url).toBe("https://roadmap.sh/rust");
    expect(roadmapFor("pottery").url).toBe("https://roadmap.sh");
  });

  it("builds an offline outline for any goal with search links only", () => {
    const t = outlineFor("quantum computing");
    expect(t.code).toBe("QC");
    expect(t.stages.length).toBe(3);
    expect(t.stages[0].topics[0].resources[0].url).toContain("youtube.com/results?search_query=");
  });

  it("sanitises Gemini output and drops any links it invents", () => {
    const t = sanitizeTrack({ name: "Quantum", stages: [{ title: "Basics", topics: [{ title: "Qubits", minutes: 9999, goal: "x", url: "https://evil.example" }] }, { title: "Empty", topics: [] }] }, "quantum");
    expect(t?.stages.length).toBe(1);
    expect(t?.stages[0].topics[0].minutes).toBe(900);
    expect(JSON.stringify(t)).not.toContain("evil");
    expect(sanitizeTrack({ nope: 1 }, "x")).toBeNull();
  });
});

describe("learning schedule", () => {
  it("dates topics at the learner's weekly pace", () => {
    const d = scheduleItems([{ minutes: 300 }, { minutes: 300 }, { minutes: 300 }], "2026-11-16", 5);
    expect(d.map((x) => x.date)).toEqual(["2026-11-22", "2026-11-29", "2026-12-06"]);
  });

  it("turns a track into a course whose topics feed the work plan", () => {
    const ai = TRACKS[0];
    const { course, events } = trackToCourse(ai, { start: "2026-11-16", hoursPerWeek: 8 }, "#000", id);
    expect(course.learning?.roadmap.url).toContain("roadmap.sh");
    expect(course.text).toContain("self-study learning roadmap");
    expect(events.length).toBe(ai.stages.reduce((s, x) => s + x.topics.length + (x.project ? 1 : 0), 0));
    const plan = buildPlan(events, [], { dailyMinutes: 180, weekends: true, today: "2026-11-16" }, () => id("s"));
    const first = plan.filter((s) => s.eventId === events[0].id).reduce((t, s) => t + s.minutes, 0);
    expect(first).toBe(events[0].minutes);
    expect(plan[0].label).toMatch(/^Learn /);
    expect(trackMinutes(ai)).toBe(events.reduce((s, e) => s + (e.minutes ?? 0), 0));
  });

  it("tracks progress and re-plans what's left from today", () => {
    const { course, events } = trackToCourse(TRACKS[3], { start: "2026-10-01", hoursPerWeek: 5 }, "#000", id);
    events[0].done = true;
    let p = progress(course, events, "2026-11-15");
    expect(p.done).toBe(1);
    expect(p.behind).toBeGreaterThan(0);
    const moved = reschedule(events, course.id, "2026-11-15", 5);
    p = progress(course, moved, "2026-11-15");
    expect(p.behind).toBe(0);
    expect(moved[0].date).toBe(events[0].date);
  });
});

import { selfCheck, PROJECT_CHECK } from "@/lib/learn";

describe("practical, proven learning", () => {
  it("every curated topic has a prove-it question and every stage says how to put it to work", () => {
    for (const t of TRACKS) for (const s of t.stages) {
      expect(s.earn?.gigs.length).toBeGreaterThan(0);
      for (const x of s.topics) expect(x.check.length).toBeGreaterThan(20);
      for (const c of s.certs ?? []) {
        expect(c.kind).toBe("cert");
        expect(c.cost).toBeTruthy();
        expect(c.url).toMatch(/^https:\/\//);
      }
    }
  });

  it("every curated resource is marked free or paid", () => {
    for (const t of TRACKS) for (const s of t.stages) for (const x of s.topics) for (const r of x.resources) expect(r.cost).toBeTruthy();
  });

  it("refuses short or pasted explanations, and projects need a link", () => {
    const long = "word ".repeat(40);
    expect(selfCheck("too short", { pastedChars: 0, isProject: false })).toMatch(/at least 30/);
    expect(selfCheck(long, { pastedChars: long.length, isProject: false })).toMatch(/own words/);
    expect(selfCheck(long, { pastedChars: 0, isProject: false })).toBeNull();
    expect(selfCheck(long, { pastedChars: 0, isProject: true, link: "" })).toMatch(/link/);
    expect(selfCheck(long, { pastedChars: 0, isProject: true, link: "https://github.com/me/x" })).toBeNull();
  });

  it("projects carry the project check and Gemini certifications become searches, not guessed URLs", () => {
    const { events } = trackToCourse(TRACKS[0], { start: "2026-11-16", hoursPerWeek: 8 }, "#000", id);
    expect(events.find((e) => e.kind === "project")?.check).toBe(PROJECT_CHECK);
    const t = sanitizeTrack({ name: "Q", stages: [{ title: "A", topics: [{ title: "Qubits", minutes: 60, goal: "g", check: "Explain a qubit" }], earn: { canDo: "x", gigs: ["tutoring"], showIt: "y" }, certifications: ["IBM Quantum Developer"] }] }, "quantum");
    expect(t?.stages[0].certs?.[0].url).toContain("google.com/search");
    expect(t?.stages[0].earn?.gigs).toEqual(["tutoring"]);
    expect(t?.stages[0].topics[0].check).toBe("Explain a qubit");
  });
});
