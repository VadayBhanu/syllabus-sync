import { describe, expect, it } from "vitest";
import { parseGrading, oracle } from "@/lib/grades";
import { SAMPLE_CSE, SAMPLE_MATH } from "@/lib/sample";

describe("grading breakdown", () => {
  it("reads a line-per-category breakdown and ignores schedule lines", () => {
    expect(parseGrading(SAMPLE_CSE)).toEqual([
      { name: "Homework", weight: 25 },
      { name: "Quizzes", weight: 10 },
      { name: "Midterm Exam", weight: 25 },
      { name: "Final Exam", weight: 30 },
      { name: "Programming Project", weight: 10 },
    ]);
  });
  it("reads a comma-separated sentence", () => {
    const g = parseGrading("Grading\nMap quizzes 10%, Response papers 30%, Midterm 25%, Final exam 35%. Late papers lose 5% per day.");
    expect(g.map((c) => c.name)).toEqual(["Map quizzes", "Response papers", "Midterm", "Final exam"]);
  });
  it("returns nothing when there's no real breakdown", () => {
    expect(parseGrading(SAMPLE_MATH)).toEqual([]);
    expect(parseGrading("Late work loses 10% per day")).toEqual([]);
  });
});

describe("oracle", () => {
  const cats = [{ name: "HW", weight: 40 }, { name: "Midterm", weight: 30 }, { name: "Final", weight: 30 }];
  it("works out what you need on the rest", () => {
    const r = oracle(cats, { HW: 95, Midterm: 80 }, 90);
    expect(r.current).toBeCloseTo(88.6, 1);
    expect(r.needed).toBeCloseTo(93.3, 1);
    expect(r.remainingWeight).toBe(30);
  });
  it("handles nothing graded and everything graded", () => {
    expect(oracle(cats, {}, 90)).toMatchObject({ current: null, needed: 90 });
    expect(oracle(cats, { HW: 100, Midterm: 100, Final: 70 }, 90)).toMatchObject({ needed: null, projected: 91 });
  });
});
