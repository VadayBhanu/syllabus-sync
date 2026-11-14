"use client";

import type { Hazard } from "@/lib/conflicts";
import type { SyllabusEvent } from "@/lib/types";
import { prettyDate, ymd } from "@/lib/dates";

export default function Hazards({ hazards, events }: { hazards: Hazard[]; events: SyllabusEvent[] }) {
  const today = ymd(new Date());
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
