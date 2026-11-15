// Turns raw syllabus text into dated events.
//
// The approach is deliberately boring and explainable: find every date-looking
// thing on a line, decide whether that line is talking about something you have
// to do (keywords), pull a title out of what's left, and figure out the year from
// the term ("Fall 2026") when the syllabus doesn't spell it out.

import type { Confidence, EventKind, ParseReport, ParseResult } from "./types";
import { isValidDate, ymd } from "./dates";

const MONTH_ALIASES: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

const MONTH_RE =
  "(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sept?(?:ember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)";
const ORD = "(?:st|nd|rd|th)?";
// 4-digit years, or '26 style. A bare 2-digit number after a date is usually a time ("Dec 9, 11:00").
const YEAR = "(?:,?\\s*(20\\d{2}|'\\d{2})\\b(?!:))?";
const DASH = "\\s*(?:-|to|through|thru)\\s*";

interface RawDate {
  start: number;
  end: number;
  month: number;
  day: number;
  year?: number;
  endMonth?: number;
  endDay?: number;
  ambiguous?: string;
}

const PATTERNS: { re: RegExp; read: (m: RegExpExecArray) => Omit<RawDate, "start" | "end"> | null }[] = [
  // 2026-09-15
  {
    re: /\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/g,
    read: (m) => ({ year: +m[1], month: +m[2], day: +m[3] }),
  },
  // Sep 15, Sept. 15th, September 15 2026, Oct 12-14, Nov 30 - Dec 2
  {
    re: new RegExp(
      `\\b${MONTH_RE}\\.?\\s+(\\d{1,2})${ORD}\\b(?:${DASH}(?:${MONTH_RE}\\.?\\s+)?(\\d{1,2})${ORD}\\b)?${YEAR}`,
      "gi",
    ),
    read: (m) => {
      // "may" in lowercase is almost always the verb ("you may submit 2 late labs")
      if (m[1] === "may") return null;
      const month = MONTH_ALIASES[m[1].toLowerCase()];
      const res: Omit<RawDate, "start" | "end"> = { month, day: +m[2] };
      if (m[4]) {
        res.endDay = +m[4];
        res.endMonth = m[3] ? MONTH_ALIASES[m[3].toLowerCase()] : month;
      }
      if (m[5]) res.year = normYear(m[5]);
      return res;
    },
  },
  // 15 September, 3rd of October
  {
    re: new RegExp(`\\b(\\d{1,2})${ORD}\\s+(?:of\\s+)?${MONTH_RE}\\b\\.?${YEAR}`, "gi"),
    read: (m) => {
      if (m[2] === "may") return null;
      const res: Omit<RawDate, "start" | "end"> = { day: +m[1], month: MONTH_ALIASES[m[2].toLowerCase()] };
      if (m[3]) res.year = normYear(m[3]);
      return res;
    },
  },
  // 9/15, 09/15/2026, 9/15/26, 9/15-9/17, 9.15 is too risky so we skip dots
  {
    re: /(?<![\d/.])(\d{1,2})\/(\d{1,2})(?:\/(\d{4}|\d{2}))?(?:\s*-\s*(\d{1,2})\/(\d{1,2})(?:\/(?:\d{4}|\d{2}))?)?(?![\d/%])/g,
    read: (m) => {
      // "1/2 a day", "3/4 of the grade" are fractions, not dates
      if (!m[3] && !m[4] && /^\s+(a|an|of|the|credit|points?|hours?|days?|letter|grade)\b/i.test(m.input.slice(m.index + m[0].length))) return null;
      let a = +m[1];
      let b = +m[2];
      let ambiguous: string | undefined;
      if (a > 12 && b <= 12) {
        // looks like day/month
        [a, b] = [b, a];
        ambiguous = "Read as day/month";
      }
      const res: Omit<RawDate, "start" | "end"> = { month: a, day: b, ambiguous };
      if (m[3]) res.year = normYear(m[3]);
      if (m[4] && m[5]) {
        res.endMonth = +m[4];
        res.endDay = +m[5];
      }
      return res;
    },
  },
];

function normYear(s: string): number {
  s = s.replace("'", "");
  const n = +s;
  return s.length === 2 ? 2000 + n : n;
}

function findDates(line: string): RawDate[] {
  const found: RawDate[] = [];
  for (const p of PATTERNS) {
    p.re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = p.re.exec(line))) {
      const start = m.index;
      const end = m.index + m[0].length;
      // earlier patterns win on overlap (ISO before "15 Sep" before 9/15)
      if (found.some((f) => start < f.end && end > f.start)) continue;
      const r = p.read(m);
      if (r) found.push({ ...r, start, end });
    }
  }
  return found.sort((a, b) => a.start - b.start);
}

// ---------------------------------------------------------------- classification

const KIND_RULES: { kind: EventKind; re: RegExp }[] = [
  { kind: "holiday", re: /\b(no class(es)?|holiday|spring break|fall break|thanksgiving|labor day|mlk|martin luther king|memorial day|university closed|campus closed|reading day)\b/i },
  { kind: "admin", re: /\b(last day to (drop|withdraw|add)|census|drop deadline|withdraw(al)? deadline|grades? (are )?due|add\/drop)\b/i },
  { kind: "exam", re: /\b(final exam(ination)?|finals\b|mid-?terms?\b|exam(ination)?s?\b|tests?\s*#?\d+\b|term test)/i },
  { kind: "quiz", re: /\bquiz(zes)?\b/i },
  { kind: "project", re: /\b(project|proposal|presentation|demo|milestone|capstone|poster)\b/i },
  { kind: "lab", re: /\blab(oratory)?s?\b/i },
  { kind: "assignment", re: /\b(homework|hw\s*#?\d*|assignment|problem set|pset|ps\s?\d+|paper|essay|report|worksheet|submission|due|deadline|turn in|submit)\b/i },
  { kind: "reading", re: /\b(read(ing)?|chapter|ch\.\s*\d)\b/i },
];

function classify(text: string): EventKind | null {
  for (const r of KIND_RULES) if (r.re.test(text)) return r.kind;
  return null;
}

// ---------------------------------------------------------------- time & weight

function findTime(text: string): string | undefined {
  if (/\bmidnight\b/i.test(text)) return "23:59";
  if (/\bnoon\b/i.test(text)) return "12:00";
  const m = /\b(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)(?![a-z])/i.exec(text);
  if (m) {
    let h = +m[1];
    const min = m[2] ? +m[2] : 0;
    if (h < 1 || h > 12 || min > 59) return undefined;
    const pm = m[3].toLowerCase().startsWith("p");
    if (pm && h !== 12) h += 12;
    if (!pm && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
  }
  const m24 = /\b([01]?\d|2[0-3]):([0-5]\d)\b/.exec(text);
  if (m24) return `${m24[1].padStart(2, "0")}:${m24[2]}`;
  return undefined;
}

function findWeight(text: string): number | undefined {
  const m = /\b(\d{1,2}(?:\.\d+)?)\s*%/.exec(text);
  if (!m) return undefined;
  const w = parseFloat(m[1]);
  return w > 0 && w <= 60 ? w : undefined;
}

// ---------------------------------------------------------------- titles

const NOISE = [
  /\b(mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)(day|nesday|sday|urday)?\b\.?,?/gi,
  /\bweek\s*\d+\b:?/gi,
  /\b\d{1,2}(?::\d{2})?\s*(a\.?m\.?|p\.?m\.?)(?![a-z])/gi,
  /\b([01]?\d|2[0-3]):[0-5]\d\b/g,
  /\b(by|at|on|before)\s*(midnight|noon)?\s*$/gi,
  /\b(midnight|noon)\b/gi,
  /\(?\s*\d{1,2}(?:\.\d+)?\s*%\s*(?:of (?:the )?(?:final )?grade)?\s*\)?/gi,
  /\(\s*\)/g,
  /\b(c[sd]t|central)\b/gi,
];

function cleanTitle(s: string): string {
  let t = s;
  for (const re of NOISE) t = t.replace(re, " ");
  t = t
    .replace(/\.{2,}|…+|_{2,}/g, " ")
    .replace(/[|•·\t]+/g, " ")
    .replace(/\s+([,;:])/g, "$1")
    .replace(/([,;:])(?=[,;:])/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s:;,.\-–—)\]]+/, "")
    .replace(/[\s:;,\-–—(\[]+$/, "")
    .replace(/(\s+\b(due|on|by|at|is|are|will be|held|closes|opens|in class on|takes place)\b)+\s*$/i, "")
    .replace(/^(the|your|our)\s+/i, "")
    .replace(/\*+/g, " ")
    .replace(/\(?\s*\b(moved|rescheduled|changed|was)\s+from\b[^)]*\)?/gi, " ")
    .replace(/,?\s*\bsee canvas\b\)?/gi, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/[\s:;,\-–—(\[]+$/, "")
    .trim();
  // "due" alone, or just punctuation, is not a title
  if (/^(due|deadline|on|by|at|and|&)?$/i.test(t)) return "";
  if (t.length > 90) t = t.slice(0, 87).trimEnd() + "…";
  return t ? t[0].toUpperCase() + t.slice(1) : t;
}

function titleCase(kind: EventKind) {
  return {
    exam: "Exam",
    quiz: "Quiz",
    project: "Project deadline",
    assignment: "Assignment due",
    lab: "Lab due",
    reading: "Reading",
    holiday: "No class",
    admin: "Academic deadline",
    other: "Event",
  }[kind];
}

// ---------------------------------------------------------------- term / year

const SEASON_ANCHOR: Record<string, [number, number]> = {
  // month, day of roughly the middle of each term
  fall: [10, 15],
  spring: [3, 15],
  summer: [7, 1],
  winter: [1, 5],
};

export interface TermInfo {
  label?: string;
  anchor: Date;
  source: ParseReport["yearSource"];
}

export function detectTerm(text: string, today = new Date()): TermInfo {
  const t = /\b(fall|spring|summer|winter)\s*(?:semester|term|session|quarter)?\s*,?\s*'?(20\d{2}|\d{2})\b/i.exec(text);
  if (t) {
    const season = t[1].toLowerCase();
    const year = normYear(t[2]);
    const [m, d] = SEASON_ANCHOR[season];
    return {
      label: `${season[0].toUpperCase()}${season.slice(1)} ${year}`,
      anchor: new Date(year, m - 1, d),
      source: "term",
    };
  }
  // Same thing written the other way round: "2026 Fall"
  const t2 = /\b(20\d{2})\s+(fall|spring|summer|winter)\b/i.exec(text);
  if (t2) {
    const season = t2[2].toLowerCase();
    const year = +t2[1];
    const [m, d] = SEASON_ANCHOR[season];
    return { label: `${season[0].toUpperCase()}${season.slice(1)} ${year}`, anchor: new Date(year, m - 1, d), source: "term" };
  }
  // fall back to the most common plausible year in the document
  const years = new Map<number, number>();
  for (const m of text.matchAll(/\b(20[2-3]\d)\b/g)) years.set(+m[1], (years.get(+m[1]) ?? 0) + 1);
  if (years.size) {
    const best = [...years.entries()].sort((a, b) => b[1] - a[1])[0][0];
    const anchor = new Date(today);
    anchor.setFullYear(best);
    return { anchor, source: "explicit" };
  }
  // nothing at all: assume the semester is around now, slightly forward-looking
  const anchor = new Date(today);
  anchor.setMonth(anchor.getMonth() + 2);
  return { anchor, source: "fallback" };
}

/** Pick the year that puts month/day closest to the middle of the term. */
export function inferYear(month: number, day: number, anchor: Date): number {
  const base = anchor.getFullYear();
  let best = base;
  let bestDist = Infinity;
  for (const y of [base - 1, base, base + 1]) {
    const dist = Math.abs(new Date(y, month - 1, day).getTime() - anchor.getTime());
    if (dist < bestDist) {
      bestDist = dist;
      best = y;
    }
  }
  return best;
}

// ---------------------------------------------------------------- course header

export function detectCourse(text: string): { code?: string; name?: string } {
  const head = text.slice(0, 1500);
  const m = /\b([A-Z]{2,5})[\s-]?(\d{4}|\d{3}[A-Z]?)\b(?:[\s\-–:|.]+([A-Z][A-Za-z0-9&,'/ ]{3,60}))?/.exec(head);
  if (!m) return {};
  const code = `${m[1]} ${m[2]}`;
  let name: string | undefined = m[3]?.trim();
  if (name) {
    // stop at obvious section markers
    name = name.split(/\s{2,}|\b(Fall|Spring|Summer|Winter|Section|Syllabus|Instructor|Professor)\b/)[0].trim();
    if (name.length < 4) name = undefined;
  }
  return { code, name };
}

// ---------------------------------------------------------------- main

export function normalizeText(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/[   ]/g, " ")
    .replace(/[‐-―−]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/ﬁ/g, "fi")
    .replace(/ﬂ/g, "fl");
}


export function parseSyllabus(raw: string, today = new Date()): ParseResult {
  const text = normalizeText(raw);
  // Prose syllabi put several deadlines in one paragraph, so split lines into sentences too
  // (but not after abbreviations like "Dr." or "Sept.").
  const lines = text
    .split("\n")
    .flatMap((l) => l.split(/(?<!\b(?:Dr|Mr|Ms|Mrs|Prof|Ch|St|No|vs|etc|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec|[A-Z]))\.\s+(?=[A-Z])/))
    .map((l) => l.replace(/[ \t]+/g, " ").trim());
  const term = detectTerm(text, today);
  const course = detectCourse(text);

  const report: ParseReport = {
    linesRead: lines.filter(Boolean).length,
    datesFound: 0,
    eventsKept: 0,
    skippedNoKeyword: 0,
    invalidDates: [],
    yearSource: term.source,
    termLabel: term.label,
    warnings: [],
  };

  const events: ParseResult["events"] = [];

  lines.forEach((line, i) => {
    if (!line) return;
    const dates = findDates(line);
    if (!dates.length) return;
    report.datesFound += dates.length;

    dates.forEach((d, k) => {
      // "Exam II 11/19 (moved from 11/12)": the old date is history, not a deadline
      if (/\b(moved|rescheduled|changed|postponed|pushed)\s+from\s*$|\b(was|previously|originally|formerly|instead of)\s*$/i.test(line.slice(0, d.start))) {
        report.warnings.push(`Skipped ${line.slice(d.start, d.end)}: it's the old date of something that was moved`);
        return;
      }
      // Text that belongs to this date: between the previous date and the next one.
      const segStart = k === 0 ? 0 : dates[k - 1].end;
      const segEnd = k === dates.length - 1 ? line.length : dates[k + 1].start;
      let before = line.slice(segStart, d.start);
      // a bare row number in front of the date ("13  Nov 17  Group presentation") is a table index
      if (k === 0 && /^\s*(?:wk\.?\s*|week\s*)?\d{1,2}\s*$/i.test(before)) before = "";
      const after = line.slice(d.end, segEnd);
      // In prose ("Test 2 will be held Wednesday, Nov 18 at 7 PM in SH 100") the label comes
      // before the date and what follows is detail; in tables the label often follows.
      let context = dates.length === 1 ? (classify(before) && cleanTitle(before).split(" ").length >= 2 ? before : before + " " + line.slice(d.end)) : "";
      if (dates.length > 1) {
        // "Exam 1: Sep 25, Exam 2: Oct 30" -> label usually precedes the date
        context = classify(before) ? before : classify(after) ? after : before + " " + after;
      }

      let kind = classify(context);
      let title = cleanTitle(context);
      let borrowed = false;

      // Table rows often break across lines: "Homework 3" / "Due Sep 20". Borrow the
      // neighbouring line when ours has no real title.
      if ((!title || title.length < 3 || /^due\b/i.test(title)) && i > 0) {
        const prev = lines[i - 1];
        if (prev && !findDates(prev).length && prev.length < 90) {
          const pk = classify(prev);
          if (pk || !kind) {
            title = cleanTitle(prev + (title ? " " + title : ""));
            kind = kind && kind !== "assignment" ? kind : pk ?? kind;
            borrowed = true;
          }
        }
      }

      // "Assignment 3 released" is when work starts, not when it's due
      if (kind && /\b(released|posted|assigned|available|handed out|goes out)\b/i.test(context) && !/\bdue\b/i.test(context)) kind = null;

      if (!kind) {
        report.skippedNoKeyword++;
        return;
      }

      const year = d.year ?? inferYear(d.month, d.day, term.anchor);
      if (!isValidDate(year, d.month, d.day)) {
        report.invalidDates.push(line.slice(d.start, d.end));
        return;
      }
      const date = ymd(new Date(year, d.month - 1, d.day));

      let endDate: string | undefined;
      if (d.endDay && d.endMonth) {
        let ey = year;
        if (d.endMonth < d.month) ey++; // Dec 30 - Jan 2
        if (isValidDate(ey, d.endMonth, d.endDay)) {
          const e = ymd(new Date(ey, d.endMonth - 1, d.endDay));
          if (e > date) endDate = e;
        }
      }

      let confidence: Confidence = "high";
      const notes: string[] = [];
      if (d.ambiguous) {
        confidence = "low";
        notes.push(d.ambiguous);
      }
      if (!d.year && term.source === "fallback") {
        confidence = confidence === "high" ? "medium" : confidence;
        notes.push("Year guessed (no term found)");
      }
      if (!title) {
        title = titleCase(kind);
        confidence = confidence === "high" ? "medium" : confidence;
        notes.push("No title found");
      }
      if (term.source === "term" && Math.abs(new Date(year, d.month - 1, d.day).getTime() - term.anchor.getTime()) > 70 * 86_400_000) {
        confidence = "low";
        notes.push(`Outside ${term.label}`);
      }
      if (borrowed) notes.push("Title taken from the line above");
      if (kind === "reading") confidence = confidence === "high" ? "medium" : confidence;

      events.push({
        title,
        date,
        endDate,
        time: kind === "holiday" ? undefined : findTime(after) ?? findTime(line),
        kind,
        weight: findWeight(context) ?? findWeight(line),
        confidence,
        note: notes.length ? notes.join(" · ") : undefined,
        source: line.length > 160 ? line.slice(0, 157) + "…" : line,
      });
    });
  });

  // De-duplicate: syllabi love to repeat the exam dates in three places.
  const deduped: ParseResult["events"] = [];
  for (const e of events) {
    const dup = deduped.find(
      (x) => x.date === e.date && x.kind === e.kind && similar(x.title, e.title),
    );
    if (dup) {
      dup.weight ??= e.weight;
      dup.time ??= e.time;
      if (e.title.length > dup.title.length && e.confidence === "high") dup.title = e.title;
      continue;
    }
    deduped.push(e);
  }
  deduped.sort((a, b) => (a.date + (a.time ?? "99")).localeCompare(b.date + (b.time ?? "99")));

  report.eventsKept = deduped.length;
  if (term.source === "fallback")
    report.warnings.push("No term or year in the document, so years were guessed. Double-check the dates.");
  if (report.datesFound === 0)
    report.warnings.push("No dates found. If this is a scanned PDF, try pasting the text instead.");
  else if (deduped.length === 0)
    report.warnings.push("Found dates, but none looked like deadlines. You can add them by hand.");

  return { courseCode: course.code, courseName: course.name, term: term.label, events: deduped, report };
}

function words(s: string) {
  return new Set(s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 1));
}

function similar(a: string, b: string): boolean {
  const A = words(a);
  const B = words(b);
  if (!A.size || !B.size) return true;
  let shared = 0;
  for (const w of A) if (B.has(w)) shared++;
  return shared / Math.min(A.size, B.size) >= 0.5;
}
