"use client";

import { findCyclops, findLotus, type Hazard } from "@/lib/conflicts";
import type { Course, SyllabusEvent } from "@/lib/types";
import { daysBetween, prettyDate, ymd } from "@/lib/dates";

interface Props {
  hazards: Hazard[];
  events: SyllabusEvent[];
  courses: Map<string, Course>;
  onMarkDone: (ids: string[]) => void;
}

export default function Hazards({ hazards, events, courses, onMarkDone }: Props) {
  const today = ymd(new Date());
  const cyclops = findCyclops(events, today);
  const lotus = findLotus(events, today);
  const ahead = hazards.filter((h) => h.endDate >= today);
  const list = ahead.length ? ahead : hazards;
  return (
    <section className="panel">
      <h3 style={{ fontSize: 17, marginBottom: 4 }}>Rough waters</h3>
      <p className="muted small" style={{ marginTop: 0 }}>
        {hazards.length
          ? "Spots where deadlines pile up. Start early on these."
          : events.length
            ? "No clashes found. Smooth sailing, for now."
            : "Import a syllabus to see conflicts."}
      </p>
      <div className="stack" style={{ gap: 10 }}>
        {cyclops && (
          <div className="small">
            <span className="badge hz">👁 The Cyclops</span>{" "}
            <b>{prettyDate(cyclops.date)}</b>
            <div className="muted">
              {courses.get(cyclops.courseId)?.code} {cyclops.title}
              {cyclops.weight ? `, ${cyclops.weight}% of the grade` : ""}. Your biggest exam ahead, in {daysBetween(today, cyclops.date)} days.
            </div>
          </div>
        )}
        {lotus.length > 0 && (
          <div className="small">
            <span className="badge low">🪷 Lotus-eaters</span>{" "}
            <b>{lotus.length} past item{lotus.length > 1 ? "s" : ""} never checked off</b>
            <div className="muted">Don&apos;t forget why you set sail. Tick off what you finished so your map stays honest.</div>
            <button className="btn small" style={{ marginTop: 4 }} onClick={() => onMarkDone(lotus.map((e) => e.id))}>Mark all {lotus.length} as done</button>
          </div>
        )}
        {list.slice(0, 6).map((h, i) => (
          <div key={i} className="small">
            <span className="badge hz">{h.epithet}</span>{" "}
            <b>
              {prettyDate(h.date)}
              {h.endDate !== h.date ? ` to ${prettyDate(h.endDate, false)}` : ""}
            </b>
            <div className="muted">{h.message}</div>
          </div>
        ))}
        {list.length > 6 && <div className="muted tiny">and {list.length - 6} more</div>}
        {ahead.length === 0 && hazards.length > 0 && <div className="muted tiny">All of these are behind you.</div>}
      </div>
    </section>
  );
}
