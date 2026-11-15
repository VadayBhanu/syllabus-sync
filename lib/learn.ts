// Turns a learning roadmap into a "course" with dated topics, so the voyage map, the work
// plan, hazards, calendar export and Blaze all work on it without special cases.

import type { Course, SyllabusEvent } from "./types";
import type { Track } from "./roadmaps";
import { addDays } from "./dates";

export interface LearnOptions {
  start: string;
  hoursPerWeek: number;
}

type Item = Omit<SyllabusEvent, "id" | "courseId" | "date">;

function items(track: Track): Item[] {
  const out: Item[] = [];
  for (const st of track.stages) {
    for (const t of st.topics) {
      out.push({ title: t.title, kind: "reading", confidence: "high", minutes: t.minutes, stage: st.title, goal: t.goal, links: t.resources, manual: true });
    }
    if (st.project) out.push({ title: st.project.title, kind: "project", confidence: "high", minutes: st.project.minutes, stage: st.title, goal: st.project.goal, manual: true });
  }
  return out;
}

/** Give each item a target date by walking through them at the learner's weekly pace. */
export function scheduleItems<T extends { minutes?: number }>(list: T[], start: string, hoursPerWeek: number): (T & { date: string })[] {
  const perWeek = Math.max(60, hoursPerWeek * 60);
  let cum = 0;
  return list.map((x) => {
    cum += x.minutes ?? 120;
    const day = Math.max(0, Math.ceil((cum / perWeek) * 7) - 1);
    return { ...x, date: addDays(start, day) };
  });
}

export function courseText(track: Track, hoursPerWeek: number): string {
  const lines = [
    `${track.name} (self-study learning roadmap, not a class)`,
    `Pace: ${hoursPerWeek} hours per week.`,
    `Outline: ${track.origin === "curated" ? "curated by SyllabusSync" : track.origin === "gemini" ? "drafted by Gemini" : "starter outline"}. Reference roadmap: ${track.roadmap.label} ${track.roadmap.url}`,
    "",
  ];
  track.stages.forEach((st, i) => {
    lines.push(`Stage ${i + 1}: ${st.title}`);
    for (const t of st.topics) {
      lines.push(`- Topic: ${t.title} (about ${Math.round(t.minutes / 60)} h). Goal: ${t.goal}`);
      for (const r of t.resources) lines.push(`  Resource: ${r.label} ${r.url}`);
    }
    if (st.project) lines.push(`- Project: ${st.project.title} (about ${Math.round(st.project.minutes / 60)} h). Goal: ${st.project.goal}`);
    lines.push("");
  });
  return lines.join("\n");
}

export function trackToCourse(track: Track, opts: LearnOptions, color: string, makeId: (p?: string) => string): { course: Course; events: SyllabusEvent[] } {
  const id = makeId("c");
  const course: Course = {
    id,
    code: track.code,
    name: track.name,
    color,
    text: courseText(track, opts.hoursPerWeek),
    learning: { roadmap: track.roadmap, origin: track.origin, hoursPerWeek: opts.hoursPerWeek, blurb: track.blurb, stages: track.stages.map((s) => s.title) },
  };
  const events = scheduleItems(items(track), opts.start, opts.hoursPerWeek).map((e) => ({ ...e, id: makeId(), courseId: id }) as SyllabusEvent);
  return { course, events };
}

/** Re-date what's left from `from` at a (possibly new) pace. Finished topics keep their dates. */
export function reschedule(events: SyllabusEvent[], courseId: string, from: string, hoursPerWeek: number): SyllabusEvent[] {
  const mine = events.filter((e) => e.courseId === courseId && !e.done);
  const order = new Map(events.map((e, i) => [e.id, i]));
  mine.sort((a, b) => a.date.localeCompare(b.date) || order.get(a.id)! - order.get(b.id)!);
  const dated = new Map(scheduleItems(mine, from, hoursPerWeek).map((e) => [e.id, e.date]));
  return events.map((e) => (dated.has(e.id) ? { ...e, date: dated.get(e.id)! } : e));
}

export interface StageProgress {
  title: string;
  items: SyllabusEvent[];
  done: number;
  total: number;
  minutesLeft: number;
}

export function progress(course: Course, events: SyllabusEvent[], today: string) {
  const mine = events.filter((e) => e.courseId === course.id);
  const titles = course.learning?.stages ?? [];
  const extra = [...new Set(mine.map((e) => e.stage ?? "Extra").filter((s) => !titles.includes(s)))];
  const stages: StageProgress[] = [...titles, ...extra]
    .map((title) => {
      const list = mine.filter((e) => (e.stage ?? "Extra") === title).sort((a, b) => a.date.localeCompare(b.date));
      return { title, items: list, done: list.filter((e) => e.done).length, total: list.length, minutesLeft: list.filter((e) => !e.done).reduce((s, e) => s + (e.minutes ?? 0), 0) };
    })
    .filter((s) => s.total);
  const total = mine.length;
  const done = mine.filter((e) => e.done).length;
  const behind = mine.filter((e) => !e.done && e.date < today).length;
  const next = mine.filter((e) => !e.done).sort((a, b) => a.date.localeCompare(b.date))[0];
  const finish = mine.reduce((m, e) => (e.date > m ? e.date : m), "");
  return { stages, total, done, pct: total ? Math.round((done / total) * 100) : 0, behind, next, finish };
}
