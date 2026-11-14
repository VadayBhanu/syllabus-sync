import { describe, expect, it } from "vitest";
import { parseSyllabus, inferYear, detectTerm } from "@/lib/parser";
import { SAMPLE_CSE, SAMPLE_MATH } from "@/lib/sample";

const TODAY = new Date(2026, 10, 14);

describe("date formats", () => {
  const cases: [string, string][] = [
    ["Fall 2026\nHomework 1 due Sep 4", "2026-09-04"],
    ["Fall 2026\nHomework 1 due Sept. 4th", "2026-09-04"],
    ["Fall 2026\nHomework 1 due September 4, 2026", "2026-09-04"],
    ["Fall 2026\nHomework 1 due 9/4", "2026-09-04"],
    ["Fall 2026\nHomework 1 due 09/04/26", "2026-09-04"],
    ["Fall 2026\nHomework 1 due 2026-09-04", "2026-09-04"],
    ["Fall 2026\nHomework 1 due 4 September", "2026-09-04"],
    ["Fall 2026\nHomework 1 due the 4th of September", "2026-09-04"],
    ["Fall 2026\nHomework 1 due Fri, Sep 4 by 11:59 PM", "2026-09-04"],
  ];
  for (const [text, want] of cases) {
    it(JSON.stringify(text.split("\n")[1]), () => {
      const r = parseSyllabus(text, TODAY);
      expect(r.events.map((e) => e.date)).toEqual([want]);
    });
  }
});

describe("year inference", () => {
  it("spring term puts January in the term year", () => {
    expect(inferYear(1, 20, detectTerm("Spring 2027").anchor)).toBe(2027);
  });
  it("fall term rolls January into the next year", () => {
    expect(inferYear(1, 4, detectTerm("Fall 2026").anchor)).toBe(2027);
  });
  it("fall term keeps December in the term year", () => {
    expect(inferYear(12, 9, detectTerm("Fall 2026").anchor)).toBe(2026);
  });
  it("understands '2026 Fall' and Fall '26", () => {
    expect(detectTerm("2026 Fall").label).toBe("Fall 2026");
    expect(detectTerm("Fall '26").label).toBe("Fall 2026");
  });
  it("warns when it has to guess the year", () => {
    const r = parseSyllabus("Quiz 1 on Sep 4", TODAY);
    expect(r.report.yearSource).toBe("fallback");
    expect(r.report.warnings.length).toBeGreaterThan(0);
    expect(r.events[0].confidence).not.toBe("high");
  });
});

describe("robustness", () => {
  it("ignores lowercase 'may' and fractions", () => {
    const r = parseSyllabus("Fall 2026\nyou may 2 late days\nworth 1/2 credit\nhalf 1/2% off", TODAY);
    expect(r.events).toHaveLength(0);
  });
  it("flags dates far outside the term", () => {
    const r = parseSyllabus("Fall 2026\nHomework 9 due April 3", TODAY);
    expect(r.events[0].confidence).toBe("low");
  });
  it("rejects impossible dates instead of crashing", () => {
    const r = parseSyllabus("Spring 2027\nHomework due Feb 30", TODAY);
    expect(r.events).toHaveLength(0);
    expect(r.report.invalidDates).toEqual(["Feb 30"]);
  });
  it("swaps day/month when the first number can't be a month", () => {
    const r = parseSyllabus("Fall 2026\nQuiz 25/09", TODAY);
    expect(r.events[0].date).toBe("2026-09-25");
    expect(r.events[0].confidence).toBe("low");
  });
  it("handles ranges and holidays", () => {
    const r = parseSyllabus("Fall 2026\nThanksgiving break Nov 25 - 27", TODAY);
    expect(r.events[0]).toMatchObject({ kind: "holiday", date: "2026-11-25", endDate: "2026-11-27" });
  });
  it("splits several dates on one line", () => {
    const r = parseSyllabus("Fall 2026\nExam 1: Sep 25, Exam 2: Oct 30", TODAY);
    expect(r.events.map((e) => [e.title, e.date])).toEqual([
      ["Exam 1", "2026-09-25"],
      ["Exam 2", "2026-10-30"],
    ]);
  });
  it("borrows the title from the line above", () => {
    const r = parseSyllabus("Fall 2026\nProblem Set 5\n due Nov 18", TODAY);
    expect(r.events[0].title).toBe("Problem Set 5");
  });
  it("reads times and weights", () => {
    const r = parseSyllabus("Fall 2026\nMidterm Exam (25%) Oct 14, 7:00 PM", TODAY);
    expect(r.events[0]).toMatchObject({ kind: "exam", time: "19:00", weight: 25 });
  });
  it("handles empty and garbage input", () => {
    expect(parseSyllabus("", TODAY).events).toEqual([]);
    expect(parseSyllabus("%%%%\u0000\u0001 ~~~ 99/99/9999", TODAY).events).toEqual([]);
  });
  it("skips lecture-only dates", () => {
    const r = parseSyllabus("Fall 2026\nAug 24 Introduction, asymptotic notation", TODAY);
    expect(r.events).toHaveLength(0);
    expect(r.report.skippedNoKeyword).toBe(1);
  });
});

describe("sample syllabi", () => {
  it("CSE sample", () => {
    const r = parseSyllabus(SAMPLE_CSE, TODAY);
    expect(r.courseCode).toBe("CSE 3318");
    expect(r.term).toBe("Fall 2026");
    const exams = r.events.filter((e) => e.kind === "exam");
    expect(exams.map((e) => e.date)).toEqual(["2026-10-14", "2026-12-09"]);
    for (const e of r.events) expect(e.date.startsWith("2026")).toBe(true);
    expect(r.events.find((e) => e.kind === "holiday" && e.title.startsWith("Thanksgiving"))?.endDate).toBe("2026-11-27");
  });
  it("MATH sample", () => {
    const r = parseSyllabus(SAMPLE_MATH, TODAY);
    expect(r.courseCode).toBe("MATH 3330");
    expect(r.events.find((e) => e.title.includes("Problem Set 5"))?.date).toBe("2026-11-18");
  });
});

describe("prose syllabi", () => {
  it("splits sentences and keeps clean titles", () => {
    const text = `PHYS 1443 General Technical Physics I, Fall 2026. Dr. A. Smith.
Lab 1 report is due September 11th. Test 1 is on Friday, October 2 in class. Test 2 will be held Wednesday, November 18 at 7:00 PM in SH 100. Online homework set 9 closes 11/20 at 11:59 PM. No class on November 27 (Thanksgiving). The final exam is Monday, December 7, 8:00 AM.`;
    const r = parseSyllabus(text, TODAY);
    expect(r.events.map((e) => [e.title, e.date, e.time ?? ""])).toEqual([
      ["Lab 1 report", "2026-09-11", ""],
      ["Test 1", "2026-10-02", ""],
      ["Test 2", "2026-11-18", "19:00"],
      ["Online homework set 9", "2026-11-20", "23:59"],
      ["No class", "2026-11-27", ""],
      ["Final exam", "2026-12-07", "08:00"],
    ]);
  });
});
