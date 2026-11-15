// Blaze: the study assistant. This file holds the parts that run in the browser:
// packing up the student's context, checking Blaze's citations, and a small offline
// mode that still answers the common questions when Gemini isn't available.

import type { Course, SyllabusEvent } from "./types";
import { GRADED, KIND_LABEL } from "./types";
import type { StudySession } from "./plan";
import { addDays, prettyDate, prettyTime, weekStart, ymd } from "./dates";
import { quoteFound } from "./verify";

export interface BlazeCitation {
  course: string;
  quote: string;
  verified?: boolean;
}

export type BlazeActionType =
  | "add_deadline"
  | "update_deadline"
  | "remove_deadline"
  | "attach_sources"
  | "ui"
  | "mark_done"
  | "add_session"
  | "move_session"
  | "remove_session"
  | "set_daily_hours"
  | "rebalance_plan"
  | "export_calendar";

/** A change Blaze proposes. Nothing happens until the student presses Apply. */
export interface BlazeAction {
  type: BlazeActionType;
  summary: string;
  id?: string;
  course?: string;
  title?: string;
  date?: string;
  time?: string;
  kind?: string;
  minutes?: number;
  /** for type "ui": an app command like "theme:dark" or "view:plan", run without confirmation */
  command?: string;
  /** learning/project stops: which stage they belong to */
  stage?: string;
  status?: "pending" | "applied" | "skipped" | "failed";
  error?: string;
}

export interface BlazeMessage {
  role: "user" | "blaze";
  text: string;
  citations?: BlazeCitation[];
  followUps?: string[];
  actions?: BlazeAction[];
  offline?: boolean;
}

export interface BlazeContext {
  today: string;
  courses: { code: string; name: string; term?: string; text: string }[];
  deadlines: string[];
  plan: string[];
  dailyMinutes?: number;
}

const MAX_TEXT_PER_COURSE = 25_000;

export function buildContext(courses: Course[], events: SyllabusEvent[], sessions: StudySession[], now = new Date(), dailyMinutes?: number): BlazeContext {
  const today = ymd(now);
  const byId = new Map(courses.map((c) => [c.id, c]));
  const deadlines = [...events]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => {
      const c = byId.get(e.courseId)?.code ?? "?";
      return `[${e.id}] ${e.date}${e.endDate ? " to " + e.endDate : ""}${e.time ? " " + e.time : ""} | ${c} | ${KIND_LABEL[e.kind]} | ${e.title}${e.weight ? ` | ${e.weight}%` : ""}${e.done ? " | DONE" : ""}`;
    });
  const plan = sessions
    .filter((s) => !s.removed && s.date >= today && s.date <= addDays(today, 14))
    .map((s) => `[${s.id}] ${s.date} | ${byId.get(s.courseId)?.code ?? "?"} | ${s.label} | ${s.minutes} min${s.done ? " | DONE" : ""}`);
  return {
    today,
    courses: courses.map((c) => ({ code: c.code, name: c.name, term: c.term, text: (c.text ?? "").slice(0, MAX_TEXT_PER_COURSE) })),
    deadlines,
    plan,
    dailyMinutes,
  };
}

/** Mark each citation as verified if the quote really appears in that course's syllabus. */
export function checkCitations(cites: BlazeCitation[], courses: Course[]): BlazeCitation[] {
  return cites
    .filter((c) => c?.quote?.trim())
    .map((c) => {
      const course = courses.find((x) => x.code.toLowerCase() === (c.course ?? "").toLowerCase());
      const texts = course ? [course.text ?? ""] : courses.map((x) => x.text ?? "");
      return { ...c, verified: texts.some((t) => t && quoteFound(c.quote, t)) };
    });
}

// ------------------------------------------------------------------ offline mode

const STOP = new Set("a an the is are was what when where who how do does did i my me to of in on for and or at by it be this that with from can will about any there their our your course class".split(" "));

function tokens(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9% ]/g, " ").split(/\s+/).filter((w) => w.length > 1 && !STOP.has(w));
}

function describe(e: SyllabusEvent, courses: Course[]) {
  const c = courses.find((x) => x.id === e.courseId)?.code ?? "";
  return `${prettyDate(e.date)}${e.time ? ", " + prettyTime(e.time) : ""}: ${c} ${e.title}${e.weight ? ` (${e.weight}%)` : ""}`;
}

/**
 * Answers without the network. Handles "what's due this week / today / next week",
 * "when is X", and otherwise falls back to finding the most relevant syllabus lines.
 */
export function offlineAnswer(q: string, courses: Course[], events: SyllabusEvent[], now = new Date()): BlazeMessage {
  const today = ymd(now);
  const lower = q.toLowerCase();
  const graded = events.filter((e) => GRADED.includes(e.kind) && !e.done).sort((a, b) => (a.date + (a.time ?? "")).localeCompare(b.date + (b.time ?? "")));
  const list = (items: SyllabusEvent[]) => items.map((e) => "• " + describe(e, courses)).join("\n");

  const range = (from: string, to: string, label: string): BlazeMessage => {
    const items = graded.filter((e) => e.date >= from && e.date <= to);
    return {
      role: "blaze",
      offline: true,
      text: items.length ? `Here's what's due ${label}:\n${list(items)}` : `Nothing graded is due ${label}. Good time to get ahead on the next one.`,
      followUps: ["What's due next week?", "When is my next exam?"],
    };
  };

  if (/\btoday\b/.test(lower)) return range(today, today, "today");
  if (/\btomorrow\b/.test(lower)) return range(addDays(today, 1), addDays(today, 1), "tomorrow");
  if (/next week/.test(lower)) {
    const s = addDays(weekStart(today), 7);
    return range(s, addDays(s, 6), "next week");
  }
  if (/this week|week/.test(lower) && /due|do|need|have/.test(lower)) return range(today, addDays(today, 6), "in the next 7 days");

  if (/next (exam|test|midterm|final)|exam/.test(lower) && /when|next|date/.test(lower)) {
    const exams = graded.filter((e) => e.kind === "exam" && e.date >= today);
    const want = courses.find((c) => lower.includes(c.code.toLowerCase()) || lower.includes(c.code.split(" ")[0].toLowerCase()));
    const pick = want ? exams.filter((e) => e.courseId === want.id) : exams;
    return {
      role: "blaze",
      offline: true,
      text: pick.length ? `Upcoming exams:\n${list(pick.slice(0, 5))}` : "I don't see any upcoming exams in your deadlines.",
      followUps: ["What's due this week?"],
    };
  }

  // keyword search over the syllabus text
  const qt = tokens(q);
  const hits: { course: Course; line: string; score: number }[] = [];
  for (const c of courses) {
    for (const line of (c.text ?? "").split("\n")) {
      const lt = new Set(tokens(line));
      if (!lt.size) continue;
      const score = qt.reduce((s, w) => s + (lt.has(w) ? 1 : [...lt].some((x) => x.startsWith(w.slice(0, 5)) && w.length > 4) ? 0.5 : 0), 0);
      if (score > 0) hits.push({ course: c, line: line.trim(), score });
    }
  }
  hits.sort((a, b) => b.score - a.score);
  const top = hits.slice(0, 4);
  if (!top.length) {
    return {
      role: "blaze",
      offline: true,
      text: "I couldn't find that in your syllabi. Try different words, or ask about what's due this week.",
      followUps: ["What's due this week?", "When is my next exam?"],
    };
  }
  return {
    role: "blaze",
    offline: true,
    text: "I'm in offline mode, so here are the closest lines from your syllabi:",
    citations: top.map((h) => ({ course: h.course.code, quote: h.line, verified: true })),
    followUps: ["What's due this week?"],
  };
}
