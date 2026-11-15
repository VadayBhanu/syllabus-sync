// Turns deadlines into a day-by-day study plan, spreading work so no day blows past
// the time you actually have. Sessions you've edited, moved or finished are kept as-is
// and the rest is rebuilt around them.

import type { EventKind, SyllabusEvent } from "./types";
import { addDays, daysBetween, parseYmd } from "./dates";

export interface StudySession {
  id: string;
  eventId: string;
  courseId: string;
  date: string;
  minutes: number;
  label: string;
  done?: boolean;
  /** true once the person has touched it, so a rebuild won't move it */
  pinned?: boolean;
  /** the person deleted it; kept so a rebuild doesn't bring the time back */
  removed?: boolean;
}

export interface PlanOptions {
  /** minutes of study available per day */
  dailyMinutes: number;
  weekends: boolean;
  today: string;
}

// Rough effort estimates. Exams scale with how much they're worth.
function effort(e: SyllabusEvent): number {
  if (e.minutes) return Math.max(30, Math.round(e.minutes / 30) * 30);
  const base: Partial<Record<EventKind, number>> = { exam: 300, project: 360, assignment: 150, lab: 120, quiz: 90 };
  let m = base[e.kind] ?? 0;
  if (e.kind === "exam" && e.weight) m = Math.max(180, Math.min(540, 120 + e.weight * 10));
  if (e.kind === "project" && e.weight && e.weight < 10) m = 240;
  return Math.round(m / 30) * 30;
}

// How many days ahead you should start
const LEAD: Partial<Record<EventKind, number>> = { exam: 7, project: 10, assignment: 4, lab: 3, quiz: 3 };

function verb(kind: EventKind) {
  return kind === "exam" || kind === "quiz" ? "Study for" : kind === "project" ? "Work on" : kind === "reading" ? "Learn" : "Do";
}

export function buildPlan(
  events: SyllabusEvent[],
  existing: StudySession[],
  opts: PlanOptions,
  makeId: () => string,
): StudySession[] {
  const live = new Map(events.map((e) => [e.id, e]));
  // keep what the person touched, as long as its deadline still exists
  const kept = existing.filter((s) => (s.pinned || s.done) && live.has(s.eventId));
  const load = new Map<string, number>();
  for (const s of kept) if (!s.removed && !s.done) load.set(s.date, (load.get(s.date) ?? 0) + s.minutes);

  const targets = events
    .filter((e) => effort(e) > 0 && !e.done && e.date >= opts.today)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "99").localeCompare(b.time ?? "99"));

  const out = [...kept];
  for (const e of targets) {
    const already = kept.filter((s) => s.eventId === e.id).reduce((t, s) => t + s.minutes, 0);
    let need = effort(e) - already;
    if (need <= 0) continue;

    // candidate days: from (deadline - lead) up to the day before (or the day itself if it's tomorrow/today)
    // self-study topics have no hard deadline, so give them a wide window and let people run ahead
    const lead = e.minutes ? 14 : LEAD[e.kind] ?? 3;
    let first = addDays(e.date, -lead);
    if (first < opts.today) first = opts.today;
    let last = addDays(e.date, -1);
    if (last < first) last = first;
    const days: string[] = [];
    for (let d = first; d <= last; d = addDays(d, 1)) days.push(d);
    let usable = days.filter((d) => opts.weekends || ![0, 6].includes(parseYmd(d).getDay()));
    if (!usable.length) usable = days;

    // short on time? squeeze the work into what's left
    const maxPossible = usable.length * 120;
    if (need > maxPossible) need = maxPossible;

    while (need > 0) {
      const chunk = need >= 120 ? 90 : need >= 60 ? Math.min(need, 90) : need;
      // least loaded day wins; ties go to the earlier day so work isn't left to the last minute
      let best = usable[0];
      let bestScore = Infinity;
      for (const d of usable) {
        const already = load.get(d) ?? 0;
        // gently prefer days closer to the deadline for small items, earlier for big ones
        const lean = (e.kind === "exam" || e.kind === "project" ? 1 : -1) * daysBetween(d, e.date) * 2;
        const score = already + lean;
        if (score < bestScore) {
          bestScore = score;
          best = d;
        }
      }
      const sameDay = out.find((s) => s.eventId === e.id && s.date === best && !s.pinned && !s.done);
      if (sameDay && sameDay.minutes + chunk <= 180) sameDay.minutes += chunk;
      else
        out.push({
          id: makeId(),
          eventId: e.id,
          courseId: e.courseId,
          date: best,
          minutes: chunk,
          label: `${verb(e.kind)} ${e.title}`,
        });
      load.set(best, (load.get(best) ?? 0) + chunk);
      need -= chunk;
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

export function dayLoad(sessions: StudySession[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const s of sessions) if (!s.done && !s.removed) m.set(s.date, (m.get(s.date) ?? 0) + s.minutes);
  return m;
}

export function overloadedDays(sessions: StudySession[], dailyMinutes: number): string[] {
  return [...dayLoad(sessions).entries()].filter(([, m]) => m > dailyMinutes).map(([d]) => d).sort();
}

export function fmtMinutes(m: number): string {
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h ? (r ? `${h}h ${r}m` : `${h}h`) : `${r}m`;
}
