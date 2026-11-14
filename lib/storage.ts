import type { Course, SyllabusEvent } from "./types";
import type { StudySession } from "./plan";

const KEY = "syllabus-sync:v1";

export interface SavedState {
  courses: Course[];
  events: SyllabusEvent[];
  sessions?: StudySession[];
  plan?: { dailyMinutes: number; weekends: boolean };
}

export function load(): SavedState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!Array.isArray(s?.courses) || !Array.isArray(s?.events)) return null;
    // drop anything malformed rather than crashing the page
    const events = s.events.filter((e: SyllabusEvent) => typeof e?.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(e.date) && e.title);
    const sessions = Array.isArray(s.sessions) ? s.sessions.filter((x: StudySession) => typeof x?.date === "string" && x.minutes > 0) : [];
    return { courses: s.courses, events, sessions, plan: s.plan };
  } catch {
    return null;
  }
}

export function save(state: SavedState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* private mode or storage full: the app still works for this session */
  }
}

export function uid(prefix = "e") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export const COURSE_COLORS = ["#2f6f8f", "#b5562d", "#5b7f3a", "#7a4f9a", "#a0782a", "#3a7f78", "#9a3f5f"];
