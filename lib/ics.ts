// RFC 5545 calendar export. Works with Google Calendar, Apple Calendar and Outlook.
import type { Course, SyllabusEvent } from "./types";
import { KIND_LABEL } from "./types";
import { addDays } from "./dates";

function esc(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Lines longer than 75 octets must be folded with CRLF + space. */
function fold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const out: string[] = [];
  let cur = "";
  let curLen = 0;
  for (const ch of line) {
    const len = new TextEncoder().encode(ch).length;
    if (curLen + len > (out.length ? 74 : 75)) {
      out.push(cur);
      cur = "";
      curLen = 0;
    }
    cur += ch;
    curLen += len;
  }
  out.push(cur);
  return out.join("\r\n ");
}

const compact = (d: string) => d.replace(/-/g, "");

export function buildIcs(events: SyllabusEvent[], courses: Course[], now = new Date()): string {
  const byId = new Map(courses.map((c) => [c.id, c]));
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SyllabusSync//HackUTA 2026//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:SyllabusSync",
  ];
  for (const e of events) {
    const c = byId.get(e.courseId);
    const prefix = c ? `${c.code}: ` : "";
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${e.id}@syllabus-sync`);
    lines.push(`DTSTAMP:${stamp}`);
    if (e.time) {
      // floating local time: shows at the same wall-clock time wherever you open it
      // exams start at the given time; deadlines end at it (a 30-minute block before the cutoff)
      const [h, m] = e.time.split(":").map(Number);
      const at = h * 60 + m;
      const [s0, s1] = e.kind === "exam" || e.kind === "quiz" ? [at, Math.min(at + 90, 23 * 60 + 59)] : [Math.max(0, at - 30), at];
      const hhmm = (x: number) => `${String(Math.floor(x / 60)).padStart(2, "0")}${String(x % 60).padStart(2, "0")}00`;
      lines.push(`DTSTART:${compact(e.date)}T${hhmm(s0)}`);
      lines.push(`DTEND:${compact(e.date)}T${hhmm(s1)}`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${compact(e.date)}`);
      lines.push(`DTEND;VALUE=DATE:${compact(addDays(e.endDate ?? e.date, 1))}`);
    }
    lines.push(`SUMMARY:${esc(prefix + e.title)}`);
    const desc = [
      KIND_LABEL[e.kind],
      e.weight ? `${e.weight}% of grade` : "",
      e.source ? `From syllabus: "${e.source}"` : "",
    ].filter(Boolean).join("\n");
    lines.push(`DESCRIPTION:${esc(desc)}`);
    lines.push(`CATEGORIES:${esc(KIND_LABEL[e.kind])}`);
    if (e.kind === "holiday") lines.push("TRANSP:TRANSPARENT");
    if (e.kind === "exam" || e.kind === "project") {
      // heads-up two days before big ones, one day before everything else
      lines.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc(prefix + e.title)}`, "TRIGGER:-P2D", "END:VALARM");
    } else if (e.kind !== "holiday" && e.kind !== "reading") {
      lines.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc(prefix + e.title)}`, "TRIGGER:-P1D", "END:VALARM");
    }
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
