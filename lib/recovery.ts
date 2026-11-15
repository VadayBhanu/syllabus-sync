// "I got sick and lost three days. Save my semester."
// Re-plans every study session from the day you're back, and explains each decision: what
// moved where and why, what got trimmed or pushed back to make room, which days run long,
// and which deadlines are still at risk. Pure and deterministic, so it works offline and the
// demo never depends on an AI call.
//
// How it decides, in order:
//  1. Anything due while you were out can't be saved by planning: it needs an extension.
//  2. Earliest deadline first, every item gets enough time to be "tight but doable" (70%).
//     Other courses' exam days and the night before them are kept clear where possible.
//     A project milestone waits for the milestone it builds on.
//  3. If a day is full, it may run long (up to 90 extra minutes), latest day first.
//  4. Left-over time tops items up to 100%, most valuable (by grade weight) first.

import type { Course, SyllabusEvent } from "./types";
import { GRADED } from "./types";
import type { StudySession } from "./plan";
import { addDays, parseYmd, prettyDate } from "./dates";

export interface RecoveryOptions {
  /** first day you can't work */
  from: string;
  days: number;
  dailyMinutes: number;
  weekends: boolean;
  today: string;
}

export type MoveKind = "moved" | "bumped" | "trimmed" | "extension";

/** One deadline's change between the two plans, with the reasons. */
export interface Move {
  kind: MoveKind;
  eventId: string;
  courseId: string;
  title: string;
  due: string;
  /** minutes per day before and after */
  before: Record<string, number>;
  after: Record<string, number>;
  lostMinutes: number;
  longDay?: boolean;
  why: string[];
}

export type Readiness = "ready" | "tight" | "at_risk" | "missed" | "extension";

export interface Outlook {
  event: SyllabusEvent;
  /** study minutes the plan set aside for it */
  need: number;
  original: { minutes: number; status: Readiness };
  recovery: { minutes: number; status: Readiness };
  note?: string;
}

export interface RecoveryResult {
  lost: string[];
  back: string;
  sessions: StudySession[];
  moves: Move[];
  outlook: Outlook[];
  longDays: string[];
  /** deadlines due while you were out: you need an extension for these */
  extensions: SyllabusEvent[];
  summary: { originalPrepared: number; recoveryPrepared: number; originalAtRisk: number; recoveryAtRisk: number; moved: number; bumped: number; trimmed: number; longDays: number; extensions: number };
}

const DAY = (d: string) => parseYmd(d).getDay();
const short = (d: string) => prettyDate(d, false);
const VALUE: Record<string, number> = { exam: 20, project: 15, assignment: 8, lab: 6, quiz: 5 };
const value = (e: SyllabusEvent) => e.weight ?? VALUE[e.kind] ?? 3;
const hours = (m: number) => (m % 60 ? `${Math.round((m / 60) * 10) / 10}h` : `${m / 60}h`);

function status(minutes: number, need: number): Readiness {
  if (need <= 0) return "ready";
  const r = minutes / need;
  return r >= 0.95 ? "ready" : r >= 0.65 ? "tight" : "at_risk";
}

/** The milestone a project item builds on: the previous project deadline in the same course. */
export function dependencyOf(e: SyllabusEvent, events: SyllabusEvent[], today: string): SyllabusEvent | undefined {
  if (e.kind !== "project") return undefined;
  return events
    .filter((x) => x.courseId === e.courseId && x.kind === "project" && x.id !== e.id && !x.done && x.date < e.date && x.date >= today)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
}

const perDay = (list: StudySession[]) => {
  const m: Record<string, number> = {};
  for (const s of list) m[s.date] = (m[s.date] ?? 0) + s.minutes;
  return m;
};

export function recover(events: SyllabusEvent[], sessions: StudySession[], courses: Course[], o: RecoveryOptions, makeId: () => string): RecoveryResult {
  const code = (id: string) => courses.find((c) => c.id === id)?.code ?? "";
  const tag = (e: SyllabusEvent) => `${code(e.courseId)} ${e.title}`.trim();
  const byId = new Map(events.map((e) => [e.id, e]));
  const lost: string[] = [];
  for (let i = 0; i < o.days; i++) lost.push(addDays(o.from, i));
  const lostSet = new Set(lost);
  const back = addDays(o.from, o.days);
  const cap = o.dailyMinutes;
  // how long a day may run when there's no other way: a bit longer in the catch-up days right after
  const catchUp = new Set([0, 1, 2].map((i) => addDays(back, i)));
  const stretchOf = (d: string) => o.dailyMinutes + (catchUp.has(d) ? 120 : 90);
  const stretch = o.dailyMinutes + 90;
  const workday = (d: string) => o.weekends || ![0, 6].includes(DAY(d));

  const live = sessions.filter((s) => !s.removed && !s.done && byId.has(s.eventId) && s.date >= o.today);
  // sessions before you got sick stay where they are
  const fixed = live.filter((s) => s.date < o.from);
  const load = new Map<string, number>();
  const add = (d: string, m: number) => load.set(d, (load.get(d) ?? 0) + m);
  for (const s of fixed) add(s.date, s.minutes);

  // what each deadline needs from here on, as the original plan saw it
  const need = new Map<string, number>();
  for (const s of live) if (s.date >= o.from) need.set(s.eventId, (need.get(s.eventId) ?? 0) + s.minutes);

  const exams = events.filter((e) => e.kind === "exam" && !e.done && e.date >= o.today);
  const examOn = new Map(exams.map((e) => [e.date, e]));
  const eveOf = new Map(exams.map((e) => [addDays(e.date, -1), e]));
  // exam days and their eves stay clear of other courses' homework (studying for another exam is fine)
  const guard = (d: string, e: SyllabusEvent) => {
    if (e.kind === "exam" || e.kind === "quiz") return undefined;
    const ex = examOn.get(d) ?? eveOf.get(d);
    return ex && ex.courseId !== e.courseId ? ex : undefined;
  };

  const tasks = [...need.keys()].map((id) => byId.get(id)!).sort((a, b) => a.date.localeCompare(b.date) || value(b) - value(a));
  const got = new Map<string, Record<string, number>>();
  const notes = new Map<string, string[]>();
  const long = new Set<string>();
  const note = (e: SyllabusEvent, s: string) => {
    const n = notes.get(e.id) ?? [];
    if (!n.includes(s)) n.push(s);
    notes.set(e.id, n);
  };
  const give = (e: SyllabusEvent, d: string, m: number) => {
    const g = got.get(e.id) ?? {};
    g[d] = (g[d] ?? 0) + m;
    got.set(e.id, g);
    add(d, m);
  };
  const placed = (e: SyllabusEvent) => Object.values(got.get(e.id) ?? {}).reduce((a, b) => a + b, 0);
  const extensions: SyllabusEvent[] = [];

  const windowOf = (e: SyllabusEvent) => {
    let start = back > o.today ? back : o.today;
    const dep = dependencyOf(e, events, o.today);
    if (dep && dep.date >= start) {
      start = dep.date;
      note(e, `Waits until ${dep.title} is in (${short(dep.date)}), because it builds on it.`);
    }
    const days: string[] = [];
    for (let d = start; d < e.date; d = addDays(d, 1)) if (workday(d)) days.push(d);
    return days;
  };

  const fillDays = (e: SyllabusEvent, goal: number, limit: number, list: string[], allowGuard: boolean) => {
    for (const d of list) {
      const left = goal - placed(e);
      if (left <= 0) return;
      const ex = guard(d, e);
      if (ex && !allowGuard) continue;
      const lim = limit === stretch ? stretchOf(d) : limit;
      const room = Math.floor((lim - (load.get(d) ?? 0)) / 15) * 15;
      if (room >= 30 || (room >= 15 && left <= 15)) {
        give(e, d, Math.min(left, room));
        if ((load.get(d) ?? 0) > cap) {
          long.add(d);
          note(e, `${short(d)} runs long to fit it in.`);
        }
        if (ex) note(e, `A short block lands ${examOn.get(d) ? "on the day of" : "the night before"} ${tag(ex)}, because every other day is full.`);
      }
    }
  };
  // anything due while you were out: plan it for a one-week extension, which you ask for (draft provided)
  const EXT_DAYS = 7;
  const extDue = (e: SyllabusEvent) => addDays(e.date, EXT_DAYS);
  const live2 = tasks.map((e) => {
    if (e.date >= back) return e;
    extensions.push(e);
    return { ...e, date: extDue(e) };
  });
  let level = 0.5;
  const goal = (e: SyllabusEvent) => Math.ceil((need.get(e.id)! * level) / 15) * 15;

  const examLike = (e: SyllabusEvent) => e.kind === "exam" || e.kind === "quiz";
  const dueDayOk = (e: SyllabusEvent) => workday(e.date) && (examLike(e) ? !e.time || e.time >= "10:00" : !e.time || e.time >= "17:00");
  const useDueDay = (e: SyllabusEvent, target: number) => {
    if (placed(e) >= target || !dueDayOk(e)) return;
    const room = Math.floor(Math.min(examLike(e) ? 120 : 180, stretchOf(e.date) - (load.get(e.date) ?? 0)) / 15) * 15;
    if (room < 30) return;
    give(e, e.date, Math.min(target - placed(e), room));
    if ((load.get(e.date) ?? 0) > cap) long.add(e.date);
    note(e, examLike(e) ? `Last resort: a focused review the morning of the ${e.kind}.` : `Part of it goes on the due day${e.time ? "" : "; check it's due at the end of the day"}.`);
  };
  // tightest first: fewest days left to work on it, then the bigger share of the grade
  const order = [...live2].sort((a, b) => windowOf(a).length - windowOf(b).length || value(b) - value(a) || a.date.localeCompare(b.date));
  notes.clear();

  // 2. tightest first, as late as possible inside normal hours: first everyone to half, then to 70%
  for (level of [0.5, 0.7]) {
  for (const e of order) {
    fillDays(e, goal(e), cap, [...windowOf(e)].reverse(), false);
    if (!windowOf(e).length) useDueDay(e, goal(e));
  }

  // 3. still short (the crunch): longer days, then guarded days, then the due day itself
  for (const e of order) {
    if (placed(e) >= goal(e)) continue;
    const days = windowOf(e);
    const skipped = days.filter((d) => guard(d, e));
    if (skipped.length) note(e, `Kept ${skipped.map(short).join(" and ")} clear for ${[...new Set(skipped.map((d) => tag(guard(d, e)!)))].join(", ")}.`);
    fillDays(e, goal(e), stretch, [...days].reverse(), false);
    fillDays(e, goal(e), cap + 60, days, true);
    useDueDay(e, goal(e));
  }
  }

  // 4. top everything up to 100%, soonest first, inside normal hours only
  for (const e of order) fillDays(e, need.get(e.id)!, cap, [...windowOf(e)].reverse(), false);
  for (const e of order) fillDays(e, need.get(e.id)!, cap, [...windowOf(e)].reverse(), true);

  // Build the new sessions
  const plan: StudySession[] = fixed.map((s) => ({ ...s }));
  const label = new Map(live.map((s) => [s.eventId, s.label]));
  for (const [id, days] of got) {
    const e = byId.get(id)!;
    for (const [d, m] of Object.entries(days)) plan.push({ id: makeId(), eventId: id, courseId: e.courseId, date: d, minutes: m, label: label.get(id) ?? e.title, pinned: true });
  }

  // Explain each deadline's change
  const moves: Move[] = [];
  const higher = (e: SyllabusEvent) =>
    tasks
      .filter((x) => x.id !== e.id && x.date >= back && x.date <= e.date && value(x) >= value(e))
      .slice(0, 2)
      .map(tag);
  for (const e of tasks) {
    const before = perDay(live.filter((s) => s.eventId === e.id && s.date >= o.from));
    const after = got.get(e.id) ?? {};
    const lostMinutes = Object.entries(before).filter(([d]) => lostSet.has(d)).reduce((t, [, m]) => t + m, 0);
    const same = JSON.stringify(Object.entries(before).sort()) === JSON.stringify(Object.entries(after).sort());
    if (same) continue;
    const n = need.get(e.id)!;
    const p = placed(e);
    const why: string[] = [];
    let kind: MoveKind;
    if (e.date < back) {
      kind = "extension";
      const days = Object.keys(after).sort();
      why.push(`Due ${short(e.date)}, while you were out, so no plan can save the original date. Ask for a one-week extension (email drafted below).`);
      why.push(days.length ? `If it's granted, the work fits on ${days.map(short).join(", ")}, ahead of the new ${short(extDue(e))} date.` : "Even with a week's extension there's no free time for it yet; ask what's possible.");
    } else {
      if (lostMinutes) why.push(`${hours(lostMinutes)} of it was planned on your sick days.`);
      const moved = Object.keys(after).filter((d) => !before[d]);
      if (moved.length) why.push(`Now on ${moved.map(short).join(", ")}${lostMinutes ? ", the first days back with room before it's due " + short(e.date) : ", making room for work that's due sooner"}.`);
      if (p < n) {
        const h = higher(e);
        why.push(`Trimmed to ${Math.round((p / n) * 100)}% of the planned ${hours(n)}${h.length ? ` so ${h.join(" and ")} get${h.length > 1 ? "" : "s"} enough time` : ""}.`);
      }
      kind = p < n * 0.95 ? "trimmed" : lostMinutes ? "moved" : "bumped";
    }
    why.push(...(notes.get(e.id) ?? []));
    if (!why.length) {
      const days = Object.keys(after).sort();
      why.push(days.length ? `Same days, different amounts (${days.map((d) => `${short(d)} ${hours(after[d])}`).join(", ")}), so the days around it don't overflow.` : "No time left for it in this window.");
    }
    moves.push({ kind, eventId: e.id, courseId: e.courseId, title: tag(e), due: e.date, before, after, lostMinutes, longDay: Object.keys(after).some((d) => long.has(d)), why });
  }

  // Readiness for each deadline in the next three weeks, in both futures. In the original
  // future the sick days are simply gone, and no day can hold more than you can really do.
  const horizon = addDays(o.today, 21);
  const origLoad = new Map<string, number>();
  for (const s of live) if (!lostSet.has(s.date)) origLoad.set(s.date, (origLoad.get(s.date) ?? 0) + s.minutes);
  const doable = (d: string) => Math.min(1, stretch / (origLoad.get(d) ?? 1));
  const upcoming = events.filter((e) => GRADED.includes(e.kind) && !e.done && e.date >= o.today && e.date <= horizon).sort((a, b) => a.date.localeCompare(b.date));
  const outlook: Outlook[] = upcoming
    .map((e) => {
      const mine = live.filter((s) => s.eventId === e.id && s.date <= e.date);
      const n = mine.reduce((t, s) => t + s.minutes, 0);
      const orig = Math.round(mine.filter((s) => !lostSet.has(s.date)).reduce((t, s) => t + s.minutes * doable(s.date), 0));
      const out = lostSet.has(e.date) || (e.date < back && e.date >= o.from);
      const rec = plan.filter((s) => s.eventId === e.id && s.date <= (out ? extDue(e) : e.date)).reduce((t, s) => t + s.minutes, 0);
      if (out && !extensions.some((x) => x.id === e.id)) extensions.push(e);
      const lostHere = mine.filter((s) => lostSet.has(s.date)).reduce((t, s) => t + s.minutes, 0);
      return {
        event: e,
        need: n,
        original: { minutes: orig, status: out ? "missed" : status(orig, n) },
        recovery: { minutes: rec, status: out ? (status(rec, n) === "ready" ? "extension" : "missed") : status(rec, n) },
        note: out ? `Due while you're out. Recovery plans it for a one-week extension (to ${short(extDue(e))})` : lostHere ? `${hours(lostHere)} of prep fell on sick days` : orig < n ? "Planned on a day with more work than you can do" : undefined,
      } as Outlook;
    })
    .filter((x) => x.need > 0 || x.original.status === "missed");

  const longDays = [...long].sort();
  // how prepared you'd be for the next three weeks, weighted by each item's share of the grade
  const prepared = (side: "original" | "recovery") => {
    let got = 0;
    let all = 0;
    for (const x of outlook) {
      const w = value(x.event);
      all += w;
      if (x[side].status === "missed") continue;
      got += w * Math.min(1, x.need ? x[side].minutes / x.need : 1);
    }
    return all ? Math.round((got / all) * 100) : 100;
  };
  const risky = (s: Readiness) => s === "at_risk" || s === "missed";
  return {
    lost,
    back,
    sessions: plan.sort((a, b) => a.date.localeCompare(b.date)),
    moves: moves.sort((a, b) => a.due.localeCompare(b.due)),
    outlook,
    longDays,
    extensions,
    summary: {
      originalPrepared: prepared("original"),
      recoveryPrepared: prepared("recovery"),
      originalAtRisk: outlook.filter((x) => risky(x.original.status)).length,
      recoveryAtRisk: outlook.filter((x) => risky(x.recovery.status)).length,
      moved: moves.filter((m) => m.kind === "moved").length,
      bumped: moves.filter((m) => m.kind === "bumped").length,
      trimmed: moves.filter((m) => m.kind === "trimmed").length,
      longDays: longDays.length,
      extensions: extensions.length,
    },
  };
}

/** A short, polite extension request for a deadline that fell on sick days. */
export function extensionEmail(e: SyllabusEvent, course: Course | undefined, lost: string[]): string {
  const span = lost.length > 1 ? `${prettyDate(lost[0])} to ${prettyDate(lost[lost.length - 1])}` : prettyDate(lost[0]);
  return `Subject: ${course?.code ?? ""} ${e.title}: extension request\n\nHi Professor,\n\nI was sick from ${span} and couldn't work on ${e.title}, which was due ${prettyDate(e.date)}. Could I have a short extension? I can send documentation if needed, and I've already re-planned my week so I can submit it within a few days.\n\nThank you,\n`;
}

export interface WeekLoad {
  start: string;
  minutes: number;
  capacity: number;
  due: SyllabusEvent[];
  impossible: boolean;
}

/** Hours planned in each week against the hours you have. Over 100% can't be done as planned. */
export function weekLoads(sessions: StudySession[], events: SyllabusEvent[], dailyMinutes: number, weekends: boolean, today: string, weeks = 8): WeekLoad[] {
  const monday = (d: string) => addDays(d, -((DAY(d) + 6) % 7));
  const out: WeekLoad[] = [];
  for (let w = 0; w < weeks; w++) {
    const start = addDays(monday(today), w * 7);
    const end = addDays(start, 6);
    let days = 0;
    for (let d = start < today ? today : start; d <= end; d = addDays(d, 1)) if (weekends || ![0, 6].includes(DAY(d))) days++;
    const minutes = sessions.filter((s) => !s.removed && !s.done && s.date >= start && s.date <= end && s.date >= today).reduce((t, s) => t + s.minutes, 0);
    const due = events.filter((e) => GRADED.includes(e.kind) && !e.done && e.date >= start && e.date <= end);
    const capacity = days * dailyMinutes;
    // a week with only a day or two left isn't judged; there's too little of it to plan
    out.push({ start, minutes, capacity, due, impossible: days >= 3 && minutes > capacity * 1.05 });
  }
  return out;
}
