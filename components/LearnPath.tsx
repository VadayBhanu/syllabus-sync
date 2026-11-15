"use client";

import { useState } from "react";
import type { Course, SyllabusEvent } from "@/lib/types";
import { progress } from "@/lib/learn";
import { fmtMinutes } from "@/lib/plan";
import { prettyDate } from "@/lib/dates";

interface Props {
  courses: Course[];
  events: SyllabusEvent[];
  today: string;
  onToggle: (id: string) => void;
  onOpen: (e: SyllabusEvent) => void;
  onReschedule: (courseId: string, hoursPerWeek: number) => void;
}

export default function LearnPath({ courses, events, today, onToggle, onOpen, onReschedule }: Props) {
  const learning = courses.filter((c) => c.learning);
  if (!learning.length) return <section className="panel muted">No learning roadmaps yet. Pick one under “Learn a skill”.</section>;
  return (
    <div className="stack">
      {learning.map((c) => <Path key={c.id} course={c} events={events} today={today} onToggle={onToggle} onOpen={onOpen} onReschedule={onReschedule} />)}
    </div>
  );
}

function Path({ course, events, today, onToggle, onOpen, onReschedule }: { course: Course } & Omit<Props, "courses">) {
  const p = progress(course, events, today);
  const L = course.learning!;
  const [pace, setPace] = useState(L.hoursPerWeek);
  const openStage = p.stages.findIndex((s) => s.done < s.total);
  return (
    <section className="panel stack learn" style={{ gap: 12 }}>
      <div className="row" style={{ alignItems: "flex-start" }}>
        <span className="dot" style={{ background: course.color, marginTop: 8 }} />
        <div className="grow">
          <h3 style={{ margin: 0 }}>{course.name}</h3>
          <div className="small muted">{L.blurb}</div>
        </div>
        <div className="ring" style={{ ["--p" as string]: p.pct }} aria-label={`${p.pct}% complete`}>
          <span>{p.pct}%</span>
        </div>
      </div>

      <div className="row small" style={{ gap: 14 }}>
        <span><b>{p.done}</b> of {p.total} done</span>
        {p.next && <span>Next: <b>{p.next.title}</b> by {prettyDate(p.next.date, false)}</span>}
        {p.finish && <span className="muted">Ithaca by {prettyDate(p.finish)}</span>}
        {p.behind > 0 && <span className="badge exam">{p.behind} behind schedule</span>}
      </div>

      <div className="row small" style={{ gap: 8 }}>
        <label className="row" style={{ gap: 6 }}>
          Pace
          <select className="btn small" value={pace} onChange={(e) => setPace(Number(e.target.value))} aria-label="Hours per week">
            {[3, 5, 8, 12, 20].map((h) => <option key={h} value={h}>{h} h / week</option>)}
          </select>
        </label>
        <button className="btn small" onClick={() => onReschedule(course.id, pace)}>
          {p.behind ? "Re-plan the rest from today" : "Re-plan from today"}
        </button>
        <span className="grow" />
        <a className="btn small ghost" href={L.roadmap.url} target="_blank" rel="noreferrer" title="The full community roadmap, on roadmap.sh">
          Full map: {L.roadmap.label} ↗
        </a>
      </div>
      {L.origin !== "curated" && (
        <div className="tiny muted">
          {L.origin === "gemini" ? "Outline drafted by Gemini." : "Starter outline."} Topic links are searches, so pick sources you trust. Click a topic to rename it or change its date.
        </div>
      )}

      {p.stages.map((s, i) => (
        <details key={s.title} className="stage" open={i === openStage || (openStage === -1 && i === p.stages.length - 1)}>
          <summary>
            <span className="stage-n">{i + 1}</span>
            <b className="grow">{s.title}</b>
            <span className="tiny muted">{s.done}/{s.total}{s.minutesLeft ? ` · ${fmtMinutes(s.minutesLeft)} left` : " · done"}</span>
            <span className="bar"><span style={{ width: `${(s.done / s.total) * 100}%`, background: course.color }} /></span>
          </summary>
          <ul className="topics">
            {s.items.map((e) => (
              <li key={e.id} className={e.done ? "done" : !e.done && e.date < today ? "late" : ""}>
                <input type="checkbox" checked={!!e.done} onChange={() => onToggle(e.id)} aria-label={`Mark ${e.title} done`} />
                <div className="grow">
                  <button className="linkish" onClick={() => onOpen(e)}>
                    {e.kind === "project" ? "🛠 " : ""}<b>{e.title}</b>
                  </button>
                  <span className="tiny muted"> · {e.minutes ? fmtMinutes(e.minutes) : ""} · by {prettyDate(e.date, false)}</span>
                  {e.goal && <div className="tiny muted">{e.goal}</div>}
                  {e.links?.length ? (
                    <div className="res">
                      {e.links.map((r) => (
                        <a key={r.url} href={r.url} target="_blank" rel="noreferrer">{r.label}</a>
                      ))}
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </details>
      ))}
    </section>
  );
}
