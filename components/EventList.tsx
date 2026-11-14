"use client";

import { useState } from "react";
import type { Course, SyllabusEvent } from "@/lib/types";
import { KIND_LABEL } from "@/lib/types";
import type { Hazard } from "@/lib/conflicts";
import { parseYmd, prettyDate, prettyTime } from "@/lib/dates";

interface Props {
  events: SyllabusEvent[];
  hazards: Hazard[];
  courses: Map<string, Course>;
  onOpen: (e: SyllabusEvent) => void;
  onToggle: (id: string) => void;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function EventList({ events, hazards, courses, onOpen, onToggle }: Props) {
  const [filter, setFilter] = useState<"all" | "review" | "graded">("all");
  const flagged = new Set(hazards.flatMap((h) => h.eventIds));
  const list = [...events]
    .filter((e) => (filter === "review" ? e.confidence !== "high" : filter === "graded" ? !["holiday", "reading", "admin", "other"].includes(e.kind) : true))
    .sort((a, b) => (a.date + (a.time ?? "99")).localeCompare(b.date + (b.time ?? "99")));

  const groups = new Map<string, SyllabusEvent[]>();
  for (const e of list) {
    const d = parseYmd(e.date);
    const k = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    groups.set(k, [...(groups.get(k) ?? []), e]);
  }
  const reviewCount = events.filter((e) => e.confidence !== "high").length;

  return (
    <section className="panel">
      <div className="row" style={{ marginBottom: 4 }}>
        <div className="tabs">
          <button role="tab" className="tab" aria-selected={filter === "all"} onClick={() => setFilter("all")}>All ({events.length})</button>
          <button role="tab" className="tab" aria-selected={filter === "graded"} onClick={() => setFilter("graded")}>Graded</button>
          <button role="tab" className="tab" aria-selected={filter === "review"} onClick={() => setFilter("review")}>Needs a look ({reviewCount})</button>
        </div>
      </div>
      {list.length === 0 && <p className="muted">{filter === "review" ? "Everything looks confident. Nice." : "Nothing here yet."}</p>}
      {[...groups.entries()].map(([month, items]) => (
        <div key={month}>
          <div className="monthhead">{month}</div>
          {items.map((e) => {
            const c = courses.get(e.courseId);
            return (
              <div key={e.id} className={`evt ${e.done ? "done" : ""}`}>
                <input type="checkbox" checked={!!e.done} onChange={() => onToggle(e.id)} aria-label={`Mark ${e.title} done`} style={{ marginTop: 4 }} />
                <div>
                  <div className="ttl">{e.title}</div>
                  <div className="row tiny muted" style={{ gap: 6 }}>
                    <span className="dot" style={{ background: c?.color }} />
                    <span>{c?.code}</span>
                    <span>·</span>
                    <span>
                      {prettyDate(e.date)}
                      {e.endDate ? ` to ${prettyDate(e.endDate, false)}` : ""}
                      {e.time ? `, ${prettyTime(e.time)}` : ""}
                    </span>
                    <span className={`badge ${e.kind === "exam" ? "exam" : ""}`}>{KIND_LABEL[e.kind]}</span>
                    {e.weight ? <span>{e.weight}%</span> : null}
                    {e.confidence !== "high" && <span className="badge low" title={e.note}>check: {e.note ?? "unsure"}</span>}
                    {flagged.has(e.id) && <span className="badge hz">conflict</span>}
                  </div>
                </div>
                <button className="btn small" onClick={() => onOpen(e)}>Edit</button>
              </div>
            );
          })}
        </div>
      ))}
    </section>
  );
}
