import { describe, expect, it } from "vitest";
import { OS_MAP, grade, masteryOf, rootGaps, startOfMap, suspectsFrom } from "@/lib/knowledge";

const quiz = OS_MAP.assessments.find((a) => a.id === "quiz4")!;

describe("star chart", () => {
  it("a failed concurrency quiz raises suspicion on its concepts and the ones underneath", () => {
    const sus = suspectsFrom(OS_MAP, quiz, startOfMap(OS_MAP));
    expect(sus).toEqual(["threads", "race", "critical", "locks", "condvars"]);
    expect(sus).not.toContain("processes"); // the passed midterm vouches for it
  });
  it("the diagnostic confirms the real gap and clears the rest", () => {
    const sus = suspectsFrom(OS_MAP, quiz, startOfMap(OS_MAP));
    const right = (id: string) => OS_MAP.concepts.find((c) => c.id === id)!.question.answer;
    const answers: Record<string, number> = {};
    for (const id of sus) answers[id] = ["race", "locks"].includes(id) ? (right(id) + 1) % 4 : right(id);
    const s = grade({ status: {}, diagnostic: sus, answers }, OS_MAP);
    expect(s.status.threads).toBe("known");
    expect(s.status.race).toBe("gap");
    expect(s.status.locks).toBe("gap");
    expect(rootGaps(OS_MAP, s)).toEqual(["race"]);
  });
  it("shows what to learn next only when its foundations are in place", () => {
    const m = masteryOf(OS_MAP, startOfMap(OS_MAP), "2026-11-15");
    expect(m.processes).toBe("known");
    expect(m.locks).toBe("covered");
    expect(m.deadlock).toBe("next");
    expect(m.memory).toBe("next");
    const broken = masteryOf(OS_MAP, { status: { locks: "gap" } }, "2026-11-15");
    expect(broken.deadlock).toBe("locked");
  });
  it("every concept has a question whose answer is one of its options", () => {
    for (const c of OS_MAP.concepts) {
      expect(c.question.options[c.question.answer]).toBeTruthy();
      for (const n of c.needs) expect(OS_MAP.concepts.some((x) => x.id === n)).toBe(true);
    }
  });
});
