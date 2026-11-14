import { describe, expect, it } from "vitest";
import { parseIcs, looksLikeIcs } from "@/lib/icsImport";

const FEED = `BEGIN:VCALENDAR\r
VERSION:2.0\r
PRODID:instructure\r
BEGIN:VEVENT\r
DTSTART;VALUE=DATE:20261120\r
SUMMARY:Homework 6 [CSE-3318-002-FALL-2026]\r
END:VEVENT\r
BEGIN:VEVENT\r
DTSTART:20261118T170000\r
SUMMARY:Exam 3 [MATH-3330-001]\r
DESCRIPTION:Chapters 4-6\\, bring a calculator\r
END:VEVENT\r
BEGIN:VEVENT\r
DTSTART;VALUE=DATE:20261202\r
SUMMARY:Final project prop\r
 osal [CSE-3318-002-FALL-2026]\r
END:VEVENT\r
BEGIN:VEVENT\r
DTSTART:20269999\r
SUMMARY:broken\r
END:VEVENT\r
END:VCALENDAR`;

describe("calendar feed import", () => {
  it("groups Canvas events by course", () => {
    expect(looksLikeIcs(FEED)).toBe(true);
    const g = parseIcs(FEED);
    expect(g.map((x) => x.code).sort()).toEqual(["CSE 3318", "MATH 3330"]);
    const cse = g.find((x) => x.code === "CSE 3318")!;
    expect(cse.events.map((e) => [e.title, e.date, e.kind])).toEqual([
      ["Homework 6", "2026-11-20", "assignment"],
      ["Final project proposal", "2026-12-02", "project"],
    ]);
    const exam = g.find((x) => x.code === "MATH 3330")!.events[0];
    expect(exam).toMatchObject({ kind: "exam", time: "17:00", date: "2026-11-18" });
    expect(exam.source).toContain("bring a calculator");
  });
  it("survives junk", () => {
    expect(parseIcs("nonsense")).toEqual([]);
  });
});
