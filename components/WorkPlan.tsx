"use client";

import { useState } from "react";
import type { Course, SyllabusEvent } from "@/lib/types";
import type { StudySession } from "@/lib/plan";
import { dayLoad, fmtMinutes } from "@/lib/plan";
import { addDays, parseYmd, prettyDate } from "@/lib/dates";

interface Props {
  sessions: StudySession[];
  events: Map<string, SyllabusEvent>;
  courses: Map<string, Course>;
  today: string;
  dailyMinutes: number;
  weekends: boolean;
  onOptions: (o: { dailyMinutes?: number; weekends?: boolean }) => void;
  onChange: (s: StudySession) => void;
  onDelete: (id: string) => void;
  onRebuild: () => void;
}

const RANGE_OPTIONS = [7, 14, 28];

export default function WorkPlan({ sessions, events, courses, today, dailyMinutes, weekends, onOptions, onChange, onDelete, onRebuild }: Props) {
  const [range, setRange] = useState(14);
  const load = dayLoad(sessions);
  const days: string[] = [];
  for (let i = 0; i < range; i++) days.push(addDays(today, i));
  const inRange = sessions.filter((s) => s.date >= today && s.date < addDays(today, range));
  const total = inRange.filter((s) => !s.done).reduce((t, s) => t + s.minutes, 0);
  const over = days.filter((d) => (load.get(d) ?? 0) > dailyMinutes);
  const late = sessions.filter((s) => {
    const e = events.get(s.eventId);
    return e && s.date > e.date && !s.done;
  });

  const move = (s: StudySession, n: number) => onChange({ ...s, date: addDays(s.date, n), pinned: true });

  return (
    <section className="panel">
      <div className="row" style={{ marginBottom: 6 }}>
        <h3 style={{ fontSize: 20 }}>Work plan</h3>
        <span className="muted small">{fmtMinutes(total)} of work in the next {range} days</span>
        <span className="grow" />
        <div className="tabs">
          {RANGE_OPTIONS.map((r) => (
            <button key={r} className="tab" aria-selected={range === r} onClick={() => setRange(r)}>{r === 7 ? "Week" : r === 14 ? "2 weeks" : "4 weeks"}</button>
          ))}
        </div>
      </div>
      <div className="row small" style={{ marginBottom: 10 }}>
        <label className="row" style={{ gap: 6 }}>
          I can study
          <select value={dailyMinutes} onChange={(e) => onOptions({ dailyMinutes: +e.target.value })} className="btn small">
            {[60, 90, 120, 180, 240, 300, 360].map((m) => <option key={m} value={m}>{fmtMinutes(m)}</option>)}
          </select>
          a day
        </label>
        <label className="row" style={{ gap: 6 }}>
          <input type="checkbox" checked={weekends} onChange={(e) => onOptions({ weekends: e.target.checked })} /> weekends too
        </label>
        <span className="grow" />
        <button className="btn small" onClick={onRebuild} title="Re-spread everything you haven't edited or finished">Rebalance</button>
      </div>
      {over.length > 0 && (
        <div className="notice warn small" style={{ marginBottom: 10 }}>
          {over.length} day{over.length > 1 ? "s go" : " goes"} over your {fmtMinutes(dailyMinutes)} limit ({over.map((d) => prettyDate(d, false)).join(", ")}). Move a session earlier, or start sooner next time.
        </div>
      )}
      {late.length > 0 && (
        <div className="notice error small" style={{ marginBottom: 10 }}>
          {late.length} session{late.length > 1 ? "s are" : " is"} scheduled after its deadline. Drag it back with the ‹ button.
        </div>
      )}
      {days.map((d) => {
        const list = sessions.filter((s) => s.date === d);
        const mins = load.get(d) ?? 0;
        const dueToday = [...events.values()].filter((e) => e.date === d && ["exam", "quiz", "project", "assignment", "lab"].includes(e.kind));
        const weekend = [0, 6].includes(parseYmd(d).getDay());
        if (!list.length && !dueToday.length && d !== today) {
          return (
            <div key={d} className="planday empty">
              <span className="pd-date">{prettyDate(d)}</span>
              <span className="muted tiny">{weekend && !weekends ? "weekend off" : "free"}</span>
            </div>
          );
        }
        const pct = Math.min(100, (mins / dailyMinutes) * 100);
        return (
          <div key={d} className="planday">
            <div className="row" style={{ gap: 8 }}>
              <span className="pd-date"><b>{d === today ? "Today" : prettyDate(d)}</b></span>
              <span className="bar" aria-hidden="true"><span style={{ width: `${pct}%`, background: mins > dailyMinutes ? "var(--danger)" : "var(--accent)" }} /></span>
              <span className={`tiny ${mins > dailyMinutes ? "" : "muted"}`} style={{ color: mins > dailyMinutes ? "var(--danger)" : undefined }}>
                {fmtMinutes(mins)} / {fmtMinutes(dailyMinutes)}
              </span>
            </div>
            {dueToday.map((e) => (
              <div key={e.id} className="tiny" style={{ margin: "4px 0 2px", color: "var(--danger)" }}>
                ⚑ Due: {courses.get(e.courseId)?.code} {e.title}
              </div>
            ))}
            {list.map((s) => {
              const c = courses.get(s.courseId);
              const e = events.get(s.eventId);
              return (
                <div key={s.id} className={`session ${s.done ? "done" : ""}`}>
                  <input type="checkbox" checked={!!s.done} onChange={() => onChange({ ...s, done: !s.done })} aria-label={`Mark ${s.label} done`} />
                  <span className="dot" style={{ background: c?.color }} />
                  <input
                    className="slabel"
                    value={s.label}
                    onChange={(ev) => onChange({ ...s, label: ev.target.value, pinned: true })}
                    aria-label="Session name"
                  />
                  <span className="tiny muted nowrap">{e ? `due ${prettyDate(e.date, false)}` : ""}</span>
                  <select className="btn small" value={s.minutes} onChange={(ev) => onChange({ ...s, minutes: +ev.target.value, pinned: true })} aria-label="Length">
                    {[15, 30, 45, 60, 90, 120, 150, 180].concat([s.minutes]).filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b).map((m) => (
                      <option key={m} value={m}>{fmtMinutes(m)}</option>
                    ))}
                  </select>
                  <button className="btn small ghost" onClick={() => move(s, -1)} disabled={s.date <= today} aria-label="Move a day earlier">‹</button>
                  <button className="btn small ghost" onClick={() => move(s, 1)} aria-label="Move a day later">›</button>
                  <button className="btn small ghost danger" onClick={() => onDelete(s.id)} aria-label="Remove session">×</button>
                </div>
              );
            })}
          </div>
        );
      })}
      <p className="tiny muted" style={{ marginBottom: 0 }}>
        Estimates: exams 3 to 9 hours depending on weight, projects 6h, homework 2.5h, labs 2h, quizzes 1.5h. Anything you edit stays put when the plan rebalances.
      </p>
    </section>
  );
}
