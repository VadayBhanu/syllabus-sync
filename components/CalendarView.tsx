"use client";

import { useMemo, useState } from "react";
import type { Course, SyllabusEvent } from "@/lib/types";
import type { Hazard } from "@/lib/conflicts";
import { ymd } from "@/lib/dates";

interface Props {
  events: SyllabusEvent[];
  hazards: Hazard[];
  courses: Map<string, Course>;
  now: Date;
  onOpen: (e: SyllabusEvent) => void;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function CalendarView({ events, hazards, courses, now, onOpen }: Props) {
  // open on the current month if it has events, otherwise the first month that does
  const initial = useMemo(() => {
    const thisMonth = ymd(now).slice(0, 7);
    if (events.some((e) => e.date.startsWith(thisMonth))) return new Date(now.getFullYear(), now.getMonth(), 1);
    const first = [...events].sort((a, b) => a.date.localeCompare(b.date))[0];
    if (first) {
      const [y, m] = first.date.split("-").map(Number);
      return new Date(y, m - 1, 1);
    }
    return new Date(now.getFullYear(), now.getMonth(), 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [month, setMonth] = useState(initial);

  const byDay = useMemo(() => {
    const m = new Map<string, SyllabusEvent[]>();
    for (const e of events) {
      // multi-day items show on every day they cover
      const end = e.endDate ?? e.date;
      const d = new Date(+e.date.slice(0, 4), +e.date.slice(5, 7) - 1, +e.date.slice(8, 10));
      for (let i = 0; i < 31; i++) {
        const k = ymd(d);
        if (k > end) break;
        m.set(k, [...(m.get(k) ?? []), e]);
        d.setDate(d.getDate() + 1);
      }
    }
    for (const list of m.values()) list.sort((a, b) => (a.time ?? "99").localeCompare(b.time ?? "99"));
    return m;
  }, [events]);

  const hazardDays = useMemo(() => {
    const s = new Set<string>();
    for (const h of hazards) if (h.kind !== "holiday") for (const id of h.eventIds) {
      const e = events.find((x) => x.id === id);
      if (e) s.add(e.date);
    }
    return s;
  }, [hazards, events]);

  const start = new Date(month);
  start.setDate(1 - ((start.getDay() + 6) % 7));
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push(d);
  }
  // drop a trailing week that is entirely next month
  const rows = cells[35].getMonth() !== month.getMonth() ? cells.slice(0, 35) : cells;
  const today = ymd(now);

  const shift = (n: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));

  return (
    <section className="panel">
      <div className="row" style={{ marginBottom: 10 }}>
        <button className="btn small" onClick={() => shift(-1)} aria-label="Previous month">‹</button>
        <h3 style={{ fontSize: 20, minWidth: 180, textAlign: "center" }}>{MONTHS[month.getMonth()]} {month.getFullYear()}</h3>
        <button className="btn small" onClick={() => shift(1)} aria-label="Next month">›</button>
        <span className="grow" />
        <button className="btn small ghost" onClick={() => setMonth(new Date(now.getFullYear(), now.getMonth(), 1))}>Today</button>
      </div>
      <div className="cal">
        {DOW.map((d) => <div key={d} className="dow">{d}</div>)}
        {rows.map((d) => {
          const k = ymd(d);
          const list = byDay.get(k) ?? [];
          const out = d.getMonth() !== month.getMonth();
          return (
            <div key={k} className={`day ${out ? "out" : ""} ${k === today ? "today" : ""} ${hazardDays.has(k) ? "hazard" : ""}`}>
              <div className="num">{d.getDate()}</div>
              {list.slice(0, 4).map((e) => (
                <button
                  key={e.id}
                  className={`ev ${e.kind === "holiday" ? "holiday" : ""}`}
                  style={{ background: courses.get(e.courseId)?.color ?? "var(--accent)", opacity: e.done ? 0.45 : 1 }}
                  title={`${courses.get(e.courseId)?.code ?? ""} ${e.title}`}
                  onClick={() => onOpen(e)}
                >
                  {e.kind === "exam" ? "★ " : ""}{e.title}
                </button>
              ))}
              {list.length > 4 && <div className="tiny muted">+{list.length - 4} more</div>}
            </div>
          );
        })}
      </div>
      <p className="tiny muted" style={{ marginBottom: 0 }}>★ exam · shaded days have a clash or a pile-up</p>
    </section>
  );
}
