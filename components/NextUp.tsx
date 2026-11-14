"use client";

import type { Course, SyllabusEvent } from "@/lib/types";
import { countdown, eventDateTime, prettyDate, prettyTime } from "@/lib/dates";

interface Props {
  events: SyllabusEvent[];
  courses: Map<string, Course>;
  now: Date;
  onOpen: (e: SyllabusEvent) => void;
}

export default function NextUp({ events, courses, now, onOpen }: Props) {
  const upcoming = events
    .filter((e) => !e.done && eventDateTime(e.date, e.time) > now)
    .sort((a, b) => eventDateTime(a.date, a.time).getTime() - eventDateTime(b.date, b.time).getTime())
    .slice(0, 4);

  if (!upcoming.length) {
    return <div className="notice">Nothing left on the horizon. Either you made it home to Ithaca, or the syllabus is still missing a few dates.</div>;
  }

  return (
    <section aria-label="Next up">
      <h3 style={{ fontSize: 16, marginBottom: 8 }}>Next up</h3>
      <div className="nextup">
        {upcoming.map((e) => {
          const c = courses.get(e.courseId);
          const ms = eventDateTime(e.date, e.time).getTime() - now.getTime();
          const urgent = ms < 2 * 86_400_000;
          return (
            <button
              key={e.id}
              className="count"
              style={{ borderLeftColor: c?.color, textAlign: "left", cursor: "pointer" }}
              onClick={() => onOpen(e)}
            >
              <div className="t" style={{ color: urgent ? "var(--danger)" : undefined }}>{countdown(eventDateTime(e.date, e.time), now)}</div>
              <div className="n" title={e.title}>{e.title}</div>
              <div className="muted tiny">
                {c?.code} · {prettyDate(e.date)} {e.time ? `· ${prettyTime(e.time)}` : ""}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
