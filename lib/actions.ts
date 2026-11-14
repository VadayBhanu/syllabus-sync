// Applies a change Blaze proposed, after the student pressed Apply. Pure: takes the
// current state, returns the new one or an error explaining why it can't be done.

import type { BlazeAction } from "./blaze";
import type { Course, EventKind, SyllabusEvent } from "./types";
import type { StudySession } from "./plan";
import { isValidDate } from "./dates";
import { COURSE_COLORS } from "./storage";

export interface AppState {
  courses: Course[];
  events: SyllabusEvent[];
  sessions: StudySession[];
  plan: { dailyMinutes: number; weekends: boolean };
}

const KINDS: EventKind[] = ["exam", "quiz", "project", "assignment", "lab", "reading", "holiday", "admin", "other"];
const okDate = (d?: string) => !!d && /^\d{4}-\d{2}-\d{2}$/.test(d) && isValidDate(+d.slice(0, 4), +d.slice(5, 7), +d.slice(8, 10));
const okTime = (t?: string | null) => (t && /^([01]\d|2[0-3]):[0-5]\d$/.test(t) ? t : undefined);

export function applyAction(s: AppState, a: BlazeAction, makeId: (p: string) => string): { state?: AppState; error?: string } {
  const ev = a.id ? s.events.find((e) => e.id === a.id) : undefined;
  const ses = a.id ? s.sessions.find((x) => x.id === a.id) : undefined;

  switch (a.type) {
    case "add_deadline": {
      if (!a.title?.trim()) return { error: "No title given." };
      if (!okDate(a.date)) return { error: "No valid date given." };
      const code = a.course?.trim() || "Personal";
      let courses = s.courses;
      let course = courses.find((c) => c.code.toLowerCase() === code.toLowerCase());
      if (!course) {
        course = { id: makeId("c"), code, name: "", color: COURSE_COLORS[courses.length % COURSE_COLORS.length] };
        courses = [...courses, course];
      }
      const e: SyllabusEvent = {
        id: makeId("e"),
        courseId: course.id,
        title: a.title.trim().slice(0, 90),
        date: a.date!,
        time: okTime(a.time),
        kind: KINDS.includes(a.kind as EventKind) ? (a.kind as EventKind) : "other",
        confidence: "high",
        manual: true,
        source: "Added by Blaze",
      };
      return { state: { ...s, courses, events: [...s.events, e] } };
    }
    case "update_deadline": {
      if (!ev) return { error: "That deadline no longer exists." };
      if (a.date && !okDate(a.date)) return { error: "That date isn't valid." };
      const next: SyllabusEvent = { ...ev, title: a.title?.trim() || ev.title, date: a.date || ev.date, time: a.time === undefined ? ev.time : okTime(a.time) ?? ev.time, confidence: "high", note: undefined };
      return { state: { ...s, events: s.events.map((e) => (e.id === ev.id ? next : e)) } };
    }
    case "remove_deadline":
      if (!ev) return { error: "That deadline no longer exists." };
      return { state: { ...s, events: s.events.filter((e) => e.id !== ev.id), sessions: s.sessions.filter((x) => x.eventId !== ev.id) } };
    case "mark_done":
      if (ev) return { state: { ...s, events: s.events.map((e) => (e.id === ev.id ? { ...e, done: true } : e)) } };
      if (ses) return { state: { ...s, sessions: s.sessions.map((x) => (x.id === ses.id ? { ...x, done: true } : x)) } };
      return { error: "Couldn't find that item." };
    case "add_session": {
      if (!okDate(a.date)) return { error: "No valid date given." };
      const target = ev ?? s.events.find((e) => a.title && a.title.toLowerCase().includes(e.title.toLowerCase()));
      const minutes = Math.round(Math.min(240, Math.max(15, Number(a.minutes) || 60)));
      const course = target ? target.courseId : s.courses[0]?.id;
      if (!course) return { error: "Add a course first." };
      const session: StudySession = {
        id: makeId("s"),
        eventId: target?.id ?? "",
        courseId: course,
        date: a.date!,
        minutes,
        label: a.title?.trim() || (target ? `Study for ${target.title}` : "Study session"),
        pinned: true,
      };
      return { state: { ...s, sessions: [...s.sessions, session] } };
    }
    case "move_session":
      if (!ses) return { error: "That study session no longer exists." };
      if (!okDate(a.date)) return { error: "No valid date given." };
      return { state: { ...s, sessions: s.sessions.map((x) => (x.id === ses.id ? { ...x, date: a.date!, minutes: a.minutes ? Math.round(a.minutes) : x.minutes, pinned: true } : x)) } };
    case "remove_session":
      if (!ses) return { error: "That study session no longer exists." };
      return { state: { ...s, sessions: s.sessions.map((x) => (x.id === ses.id ? { ...x, removed: true, pinned: true } : x)) } };
    case "set_daily_hours": {
      const m = Math.round(Number(a.minutes));
      if (!(m >= 30 && m <= 720)) return { error: "Pick between 30 minutes and 12 hours." };
      return { state: { ...s, plan: { ...s.plan, dailyMinutes: m } } };
    }
    case "rebalance_plan":
      // un-pin untouched-by-hand sessions so the planner can respread them
      return { state: { ...s, sessions: s.sessions.filter((x) => x.done || x.removed) } };
    case "export_calendar":
      return { state: s };
    default:
      return { error: "Blaze suggested something I don't know how to do." };
  }
}
