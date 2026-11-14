import { describe, expect, it } from "vitest";
import { verifyAi, quoteFound } from "@/lib/verify";

const TODAY = new Date(2026, 10, 14);
const TEXT = `ENGL 1301 Rhetoric and Composition, Spring 2027
Essay 1 is due on the Friday after we come back, which is Jan 29.
Midterm Exam: Mar 4 in class
Portfolio due 4/30`;

describe("AI verification", () => {
  it("finds quotes despite spacing and case", () => {
    expect(quoteFound("midterm exam:  mar 4 in class", TEXT)).toBe(true);
    expect(quoteFound("Final exam May 10", TEXT)).toBe(false);
  });
  it("trusts AI items whose quote and date check out", () => {
    const r = verifyAi(
      { events: [{ title: "Essay 1", date: "2027-01-29", kind: "assignment", sourceQuote: "Essay 1 is due on the Friday after we come back, which is Jan 29." }] },
      TEXT,
      TODAY,
    );
    expect(r.events.find((e) => e.title === "Essay 1")?.confidence).toBe("high");
  });
  it("flags hallucinated quotes and mismatched dates", () => {
    const r = verifyAi(
      {
        events: [
          { title: "Final exam", date: "2027-05-10", kind: "exam", sourceQuote: "Final exam May 10" },
          { title: "Midterm", date: "2027-03-05", kind: "exam", sourceQuote: "Midterm Exam: Mar 4 in class" },
          { title: "Bad", date: "2027-02-30", kind: "exam", sourceQuote: "x" },
        ],
      },
      TEXT,
      TODAY,
    );
    expect(r.events.find((e) => e.title === "Final exam")?.confidence).toBe("low");
    expect(r.events.find((e) => e.title === "Midterm")?.confidence).toBe("low");
    expect(r.events.some((e) => e.title === "Bad")).toBe(false);
    // the regex parser's portfolio and real midterm still show up
    expect(r.events.some((e) => e.date === "2027-04-30")).toBe(true);
    expect(r.events.some((e) => e.date === "2027-03-04")).toBe(true);
  });
});
