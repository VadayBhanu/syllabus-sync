// Gemini is good at messy syllabi, but it can still invent things. Every AI-suggested
// deadline has to point at a quote from the syllabus, and we check that quote ourselves.

import type { EventKind, ParseResult } from "./types";
import { isValidDate } from "./dates";
import { parseSyllabus } from "./parser";

export interface AiEvent {
  title: string;
  date: string;
  endDate?: string | null;
  time?: string | null;
  kind: string;
  weight?: number | null;
  sourceQuote: string;
}

export interface AiResponse {
  courseCode?: string | null;
  courseName?: string | null;
  term?: string | null;
  events: AiEvent[];
}

const KINDS: EventKind[] = ["exam", "quiz", "project", "assignment", "lab", "reading", "holiday", "admin", "other"];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export function quoteFound(quote: string, text: string): boolean {
  const q = norm(quote);
  if (!q) return false;
  const t = norm(text);
  if (t.includes(q)) return true;
  // PDFs reorder table cells; accept it if nearly all the quote's words sit close together
  const words = q.split(" ").filter((w) => w.length > 1);
  if (words.length < 2) return false;
  const lines = text.split("\n").map(norm);
  for (let i = 0; i < lines.length; i++) {
    const win = " " + lines.slice(Math.max(0, i - 1), i + 2).join(" ") + " ";
    const hit = words.filter((w) => win.includes(" " + w + " ")).length;
    if (hit / words.length >= 0.8) return true;
  }
  return false;
}

export function verifyAi(ai: AiResponse, text: string, today = new Date()): ParseResult {
  const local = parseSyllabus(text, today);
  const events: ParseResult["events"] = [];
  let rejected = 0;
  const termHint = local.term ?? ai.term ?? "";

  for (const e of ai.events ?? []) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(e.date ?? "");
    if (!m || !isValidDate(+m[1], +m[2], +m[3]) || !e.title?.trim()) {
      rejected++;
      continue;
    }
    const kind = (KINDS.includes(e.kind as EventKind) ? e.kind : "other") as EventKind;
    const found = quoteFound(e.sourceQuote ?? "", text);
    // what does our own parser read out of that same quote?
    const quoteDates = found ? parseSyllabus(`${termHint}\n${e.sourceQuote}`, today).events.map((x) => x.date) : [];
    const agrees = local.events.some((x) => x.date === e.date);
    const notes: string[] = [];
    let confidence: "high" | "medium" | "low" = "high";
    if (!found) {
      confidence = "low";
      notes.push("AI quote not found in the syllabus");
    } else if (quoteDates.length && !quoteDates.includes(e.date)) {
      confidence = "low";
      notes.push("AI date doesn't match its quote");
    } else if (!agrees) {
      confidence = "medium";
      notes.push("Found by AI only");
    }
    const time = e.time && /^\d{2}:\d{2}$/.test(e.time) ? e.time : undefined;
    const endDate = e.endDate && /^\d{4}-\d{2}-\d{2}$/.test(e.endDate) && e.endDate > e.date ? e.endDate : undefined;
    const weight = typeof e.weight === "number" && e.weight > 0 && e.weight <= 100 ? e.weight : undefined;
    events.push({
      title: e.title.trim().slice(0, 90),
      date: e.date,
      endDate,
      time,
      kind,
      weight,
      confidence,
      note: notes.length ? notes.join(" · ") : undefined,
      source: (e.sourceQuote ?? "").slice(0, 160),
    });
  }

  // Anything our regex parser caught that the AI missed still goes in, marked for review.
  for (const l of local.events) {
    if (!events.some((e) => e.date === l.date && (e.kind === l.kind || l.kind === "other"))) {
      events.push({ ...l, confidence: l.confidence === "high" ? "medium" : l.confidence, note: [l.note, "Missed by AI, found by pattern matching"].filter(Boolean).join(" · ") });
    }
  }
  events.sort((a, b) => (a.date + (a.time ?? "99")).localeCompare(b.date + (b.time ?? "99")));

  const report = { ...local.report, eventsKept: events.length };
  report.warnings = [...local.report.warnings.filter((w) => !w.startsWith("Found dates")), `Read with Gemini, then checked against the text.${rejected ? ` Dropped ${rejected} invalid AI item${rejected > 1 ? "s" : ""}.` : ""}`];
  return {
    courseCode: local.courseCode ?? ai.courseCode ?? undefined,
    courseName: local.courseName ?? ai.courseName ?? undefined,
    term: local.term ?? ai.term ?? undefined,
    events,
    report,
  };
}
