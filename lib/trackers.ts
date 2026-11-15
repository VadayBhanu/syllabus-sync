// Autopilot trackers: anything a student wants to keep count of ("gym 3 times a week",
// "read 20 pages a day"), created by asking Trojan. Parsed locally, so it works offline.

import { addDays, parseYmd } from "./dates";

export interface TrackerSpec {
  title: string;
  target: number;
  unit: string;
  period: "day" | "week";
}

export interface Tracker extends TrackerSpec {
  id: string;
  created: string;
  /** date -> amount logged that day */
  log: Record<string, number>;
}

const NUMS: Record<string, number> = { once: 1, twice: 2, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, ten: 10, twenty: 20, thirty: 30 };

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "track my gym sessions 3 times a week" -> { title: "Gym sessions", target: 3, unit: "times", period: "week" } */
export function parseTracker(text: string): TrackerSpec | null {
  const t = text.toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  const m =
    t.match(/^(?:please )?(?:can you )?(?:add|create|make|build|start|set up)(?: me)? (?:a |an )?(?:custom )?(?:tracker|habit tracker|habit|counter)(?: for| to track| that tracks)? (.+)$/) ??
    t.match(/^(?:please )?(?:can you )?(?:help me )?(?:track|count)(?: how (?:many|much))? (.+)$/);
  if (!m) return null;
  let rest = " " + m[1] + " ";
  let period: "day" | "week" = "week";
  const per = rest.match(/ (?:a|per|each|every) (day|week|night|morning)s? | (daily|weekly|nightly) /);
  if (per) {
    period = /week/.test(per[0]) ? "week" : "day";
    rest = rest.replace(per[0], " ");
  }
  let target = 1;
  let unit = "times";
  const amt = rest.match(/ (\d+|once|twice|one|two|three|four|five|six|seven|eight|ten|twenty|thirty)(?: (times?|hours?|hrs?|minutes?|mins?|pages?|problems?|questions?|sessions?|km|miles?|glasses?|cups?|chapters?|videos?|lessons?))? /);
  if (amt) {
    target = Number(amt[1]) || NUMS[amt[1]] || 1;
    if (amt[1] === "once" || amt[1] === "twice") unit = "times";
    else if (amt[2]) unit = amt[2].replace(/^hrs?$/, "hours").replace(/^mins?$/, "minutes");
    rest = rest.replace(amt[0], " ");
  }
  const title = rest
    .replace(/\b(my|the|of|for|on|to|in|i do|i|do|go to|going to|how many|how much)\b/g, " ")
    .replace(/\b(tracker|habit)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!title || title.length < 2) return null;
  if (unit === "times" && /\b(pages?|problems?)\b/.test(title)) {
    // "20 pages of reading" -> unit pages
    const u = title.match(/\b(pages?|problems?)\b/)![1];
    return { title: cap(title.replace(u, "").replace(/\s+/g, " ").trim() || u), target, unit: u.endsWith("s") ? u : u + "s", period };
  }
  return { title: cap(title).slice(0, 40), target: Math.min(1000, Math.max(1, target)), unit, period };
}

/** Amount logged in the current day or week (weeks start Monday). */
export function progressOf(tr: Tracker, today: string): number {
  if (tr.period === "day") return tr.log[today] ?? 0;
  const monday = addDays(today, -((parseYmd(today).getDay() + 6) % 7));
  let sum = 0;
  for (let i = 0; i < 7; i++) sum += tr.log[addDays(monday, i)] ?? 0;
  return sum;
}

/** Consecutive periods (ending with the last finished one, or this one if met) that hit the target. */
export function streakOf(tr: Tracker, today: string): number {
  let n = 0;
  const step = tr.period === "day" ? 1 : 7;
  let d = today;
  if (progressOf(tr, d) < tr.target) d = addDays(d, -step);
  for (let i = 0; i < 60; i++, d = addDays(d, -step)) {
    if (d < addDays(tr.created, -step)) break;
    if (progressOf(tr, d) >= tr.target) n++;
    else break;
  }
  return n;
}
