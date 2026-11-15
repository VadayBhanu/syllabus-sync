import { describe, expect, it } from "vitest";
import { applyAction, type AppState } from "@/lib/actions";

let n = 0;
const id = (p: string) => `${p}${n++}`;
const base = (): AppState => ({
  courses: [{ id: "c1", code: "CSE 3318", name: "", color: "#000" }],
  events: [{ id: "e1", courseId: "c1", title: "Homework 6", date: "2026-11-20", kind: "assignment", confidence: "high" }],
  sessions: [{ id: "s1", eventId: "e1", courseId: "c1", date: "2026-11-18", minutes: 90, label: "Do Homework 6" }],
  plan: { dailyMinutes: 180, weekends: true },
});

describe("Trojan actions", () => {
  it("adds a deadline to an existing or new course", () => {
    const r = applyAction(base(), { type: "add_deadline", summary: "", course: "ACM", title: "Club meeting", date: "2026-11-19", time: "18:00" }, id);
    expect(r.state!.courses).toHaveLength(2);
    expect(r.state!.events.at(-1)).toMatchObject({ title: "Club meeting", time: "18:00", kind: "other" });
  });
  it("moves a session and pins it", () => {
    const r = applyAction(base(), { type: "move_session", summary: "", id: "s1", date: "2026-11-16" }, id);
    expect(r.state!.sessions[0]).toMatchObject({ date: "2026-11-16", pinned: true });
  });
  it("refuses bad ids and dates instead of breaking things", () => {
    expect(applyAction(base(), { type: "move_session", summary: "", id: "nope", date: "2026-11-16" }, id).error).toBeTruthy();
    expect(applyAction(base(), { type: "update_deadline", summary: "", id: "e1", date: "2026-02-30" }, id).error).toBeTruthy();
    expect(applyAction(base(), { type: "set_daily_hours", summary: "", minutes: 5 }, id).error).toBeTruthy();
  });
  it("removing a deadline removes its sessions", () => {
    const r = applyAction(base(), { type: "remove_deadline", summary: "", id: "e1" }, id);
    expect(r.state!.events).toHaveLength(0);
    expect(r.state!.sessions).toHaveLength(0);
  });
  it("adds a study session for a deadline", () => {
    const r = applyAction(base(), { type: "add_session", summary: "", id: "e1", date: "2026-11-17", minutes: 60 }, id);
    expect(r.state!.sessions.at(-1)).toMatchObject({ eventId: "e1", minutes: 60, label: "Study for Homework 6", pinned: true });
  });
});
