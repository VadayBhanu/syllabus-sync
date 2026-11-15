// Reads calendar feeds (Canvas, Blackboard, Google, Outlook) into deadlines.
// Canvas names events like "Homework 3 [CSE-3318-002-FALL-2026]", so we use the bracket
// to group events into courses.

import type { EventKind, ParseResult } from "./types";
import { isValidDate, ymd } from "./dates";

export interface IcsCourseGroup {
  code: string;
  name: string;
  events: ParseResult["events"];
}

function unfold(text: string): string[] {
  return text.replace(/\r\n?/g, "\n").replace(/\n[ \t]/g, "").split("\n");
}

function unescape(s: string) {
  return s.replace(/\\n/gi, "\n").replace(/\\([,;\\])/g, "$1").trim();
}

function parseDate(value: string, params: string): { date: string; time?: string } | null {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?/.exec(value);
  if (!m || !isValidDate(+m[1], +m[2], +m[3])) return null;
  if (!m[4] || /VALUE=DATE(?!-)/.test(params)) return { date: `${m[1]}-${m[2]}-${m[3]}` };
  if (m[7]) {
    // UTC: convert to the viewer's local time
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]));
    return { date: ymd(d), time: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}` };
  }
  return { date: `${m[1]}-${m[2]}-${m[3]}`, time: `${m[4]}:${m[5]}` };
}

const KIND_RULES: [EventKind, RegExp][] = [
  ["exam", /\b(final exam|midterm|exam|test \d)\b/i],
  ["quiz", /\bquiz/i],
  ["project", /\b(project|proposal|presentation|milestone)\b/i],
  ["lab", /\blab\b/i],
  ["holiday", /\b(no class|holiday|break)\b/i],
  ["reading", /\b(read|chapter)\b/i],
];

export function looksLikeIcs(text: string) {
  return /BEGIN:VCALENDAR/i.test(text.slice(0, 2000));
}

export function parseIcs(text: string): IcsCourseGroup[] {
  const groups = new Map<string, IcsCourseGroup>();
  let cur: Record<string, { value: string; params: string }> | null = null;
  for (const line of unfold(text)) {
    if (/^BEGIN:VEVENT/i.test(line)) cur = {};
    else if (/^END:VEVENT/i.test(line)) {
      if (cur?.SUMMARY && cur.DTSTART) {
        const when = parseDate(cur.DTSTART.value, cur.DTSTART.params);
        if (when) {
          let summary = unescape(cur.SUMMARY.value);
          let code = "Calendar";
          const br = /\s*\[([^\]]+)\]\s*$/.exec(summary);
          if (br) {
            summary = summary.slice(0, br.index).trim();
            const c = /([A-Z]{2,5})[-\s]?(\d{4})/.exec(br[1]);
            code = c ? `${c[1]} ${c[2]}` : br[1].slice(0, 24);
          }
          const kind = KIND_RULES.find(([, re]) => re.test(summary))?.[0] ?? "assignment";
          const g = groups.get(code) ?? { code, name: "", events: [] };
          const desc = cur.DESCRIPTION ? unescape(cur.DESCRIPTION.value).slice(0, 140) : "";
          g.events.push({
            title: summary.slice(0, 90) || "Calendar item",
            date: when.date,
            time: when.time && when.time !== "00:00" ? when.time : undefined,
            kind,
            confidence: "high",
            source: `Calendar feed: ${summary}${desc ? " | " + desc : ""}`,
          });
          groups.set(code, g);
        }
      }
      cur = null;
    } else if (cur) {
      const m = /^([A-Z-]+)((?:;[^:]*)?):(.*)$/i.exec(line);
      if (m) cur[m[1].toUpperCase()] = { value: m[3], params: m[2] ?? "" };
    }
  }
  for (const g of groups.values()) g.events.sort((a, b) => a.date.localeCompare(b.date));
  return [...groups.values()];
}

/** Plain-text version of a feed for Trojan to read. */
export function icsGroupText(g: IcsCourseGroup) {
  return `${g.code} (from calendar feed)\n` + g.events.map((e) => `${e.date}${e.time ? " " + e.time : ""} ${e.title}`).join("\n");
}
