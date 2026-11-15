import { describe, expect, it } from "vitest";
import { offlineAnswer, checkCitations, buildContext } from "@/lib/blaze";
import { parseSyllabus } from "@/lib/parser";
import { SAMPLE_CSE } from "@/lib/sample";
import type { Course, SyllabusEvent } from "@/lib/types";

const NOW = new Date(2026, 10, 14, 15, 0);
const course: Course = { id: "c1", code: "CSE 3318", name: "Algorithms", color: "#000", text: SAMPLE_CSE };
const events: SyllabusEvent[] = parseSyllabus(SAMPLE_CSE, NOW).events.map((e, i) => ({ ...e, id: "e" + i, courseId: "c1" }));

describe("Trojan offline mode", () => {
  it("answers what's due next week from deadlines", () => {
    const a = offlineAnswer("what's due next week?", [course], events, NOW);
    expect(a.text).toContain("Project milestone 2");
    expect(a.text).toContain("Homework 6");
  });
  it("finds syllabus lines by keyword", () => {
    const a = offlineAnswer("what is the late policy", [course], events, NOW);
    expect(a.citations?.[0].quote).toContain("Late policy");
  });
  it("says so when nothing matches", () => {
    expect(offlineAnswer("parking zebra", [course], events, NOW).text).toMatch(/couldn't find/);
  });
});

describe("Trojan citations", () => {
  it("verifies real quotes and flags made-up ones", () => {
    const c = checkCitations(
      [
        { course: "CSE 3318", quote: "Midterm Exam 25%" },
        { course: "CSE 3318", quote: "Attendance is 40% of your grade" },
      ],
      [course],
    );
    expect(c.map((x) => x.verified)).toEqual([true, false]);
  });
  it("builds a compact context", () => {
    const ctx = buildContext([course], events, [], NOW);
    expect(ctx.today).toBe("2026-11-14");
    expect(ctx.deadlines.some((d) => d.includes("Midterm"))).toBe(true);
  });
});
