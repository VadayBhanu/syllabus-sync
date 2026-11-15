import { describe, expect, it } from "vitest";
import { fromUiString, parseCommand } from "@/lib/commands";

describe("Trojan app commands", () => {
  it("understands theme, navigation and timers, typos included", () => {
    expect(parseCommand("dark mode")).toEqual({ type: "theme", value: "dark" });
    expect(parseCommand("turn on drak mode pls")).toEqual({ type: "theme", value: "dark" });
    expect(parseCommand("switch to light theme")).toEqual({ type: "theme", value: "light" });
    expect(parseCommand("open the oracel")).toEqual({ type: "view", value: "oracle" });
    expect(parseCommand("show me the calendar")).toEqual({ type: "view", value: "calendar" });
    expect(parseCommand("go to voyage map")).toEqual({ type: "view", value: "voyage" });
    expect(parseCommand("start mast mode")).toEqual({ type: "mast" });
    expect(parseCommand("start a timer")).toEqual({ type: "mast" });
    expect(parseCommand("export my calendar")).toEqual({ type: "export" });
    expect(parseCommand("take the tour")).toEqual({ type: "tour" });
  });

  it("prepares today's schedule", () => {
    expect(parseCommand("prepare my todays work scheduale")).toEqual({ type: "plan_today" });
    expect(parseCommand("plan my day")).toEqual({ type: "plan_today" });
    expect(parseCommand("what's today's plan")).toEqual({ type: "plan_today" });
  });

  it("switches modes and hides courses", () => {
    expect(parseCommand("switch to self study")).toEqual({ type: "mode", value: "learning" });
    expect(parseCommand("project mode")).toEqual({ type: "mode", value: "project" });
    expect(parseCommand("academic mode")).toEqual({ type: "mode", value: "academic" });
    expect(parseCommand("hide CSE 3318", ["CSE 3318", "MATH 3330"])).toEqual({ type: "course", value: "hide", course: "CSE 3318" });
  });

  it("leaves real questions for Trojan", () => {
    expect(parseCommand("when is my midterm?")).toBeNull();
    expect(parseCommand("how is my grade calculated")).toBeNull();
    expect(parseCommand("what's the late policy for CSE 3318")).toBeNull();
    expect(parseCommand("add a topic on vector databases to the LLM stage")).toBeNull();
    expect(parseCommand("explain the dark side of overfitting to me in simple words please")).toBeNull();
  });

  it("maps Gemini's ui commands", () => {
    expect(fromUiString("theme:dark")).toEqual({ type: "theme", value: "dark" });
    expect(fromUiString("view:plan")).toEqual({ type: "view", value: "plan" });
    expect(fromUiString("rm -rf")).toBeNull();
  });
});

describe("recovery command", () => {
  it("understands sick days", () => {
    expect(parseCommand("I just got sick and lost three days. Save my semester.")).toEqual({ type: "recover", days: 3 });
    expect(parseCommand("i lsot 2 days to the flu")).toEqual({ type: "recover", days: 2 });
    expect(parseCommand("save my semester")).toEqual({ type: "recover", days: 3 });
    expect(parseCommand("Plan my study time for the next 3 days")).toBeNull();
    expect(fromUiString("recover:4")).toEqual({ type: "recover", days: 4 });
  });
});
