// Finds the spots in the semester that are going to hurt.
import type { SyllabusEvent } from "./types";
import { GRADED } from "./types";
import { addDays, daysBetween } from "./dates";

export type HazardKind = "clash" | "crunch" | "holiday";

export interface Hazard {
  kind: HazardKind;
  /** first day of the hazard */
  date: string;
  endDate: string;
  eventIds: string[];
  /** plain-English explanation */
  message: string;
  /** the Odyssey name for it, used on the voyage map */
  epithet: string;
}

const HEAVY = new Set(["exam", "project"]);

export function findHazards(events: SyllabusEvent[]): Hazard[] {
  const hazards: Hazard[] = [];
  const graded = events.filter((e) => GRADED.includes(e.kind) && !e.done).sort((a, b) => a.date.localeCompare(b.date));

  // 1. Clash: two heavy items (exams/projects) on the same day.
  const byDay = new Map<string, SyllabusEvent[]>();
  for (const e of graded) byDay.set(e.date, [...(byDay.get(e.date) ?? []), e]);
  const clashDays = new Set<string>();
  for (const [day, list] of byDay) {
    const heavy = list.filter((e) => HEAVY.has(e.kind));
    if (heavy.length >= 2 || (heavy.length >= 1 && list.length >= 2)) {
      clashDays.add(day);
      hazards.push({
        kind: "clash",
        date: day,
        endDate: day,
        eventIds: list.map((e) => e.id),
        message: `${list.length} graded items on the same day, including ${heavy.map((e) => e.title).join(" and ")}.`,
        epithet: "Scylla & Charybdis",
      });
    }
  }

  // 2. Crunch: 3+ graded items inside any 3-day window (that isn't already a clash).
  let i = 0;
  const used = new Set<string>();
  for (let j = 0; j < graded.length; j++) {
    while (daysBetween(graded[i].date, graded[j].date) > 2) i++;
    const window = graded.slice(i, j + 1);
    if (window.length >= 3 && !window.every((e) => used.has(e.id))) {
      const start = window[0].date;
      const end = window[window.length - 1].date;
      // merge with the previous crunch if they overlap
      const prev = hazards.find((h) => h.kind === "crunch" && h.endDate >= addDays(start, -1));
      if (prev) {
        prev.endDate = end > prev.endDate ? end : prev.endDate;
        prev.eventIds = [...new Set([...prev.eventIds, ...window.map((e) => e.id)])];
        prev.message = `${prev.eventIds.length} graded items within a few days.`;
      } else {
        hazards.push({
          kind: "crunch",
          date: start,
          endDate: end,
          eventIds: window.map((e) => e.id),
          message: `${window.length} graded items within ${daysBetween(start, end) + 1} days.`,
          epithet: "Storm",
        });
      }
      window.forEach((e) => used.add(e.id));
    }
  }

  // 3. Something due on a day the syllabus says there's no class: usually a typo.
  const holidays = events.filter((e) => e.kind === "holiday");
  for (const e of graded) {
    const h = holidays.find((h) => e.date >= h.date && e.date <= (h.endDate ?? h.date));
    if (h) {
      hazards.push({
        kind: "holiday",
        date: e.date,
        endDate: e.date,
        eventIds: [e.id, h.id],
        message: `"${e.title}" falls on "${h.title}". Worth checking with the instructor.`,
        epithet: "Siren song",
      });
    }
  }

  return hazards.sort((a, b) => a.date.localeCompare(b.date));
}
