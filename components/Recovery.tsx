"use client";

// "I got sick and lost three days. Save my semester."
// Shows the whole schedule reorganising, one deadline at a time, then the two futures side by
// side (keep the old plan vs accept the recovery plan) and the reason behind every change.

import { useEffect, useMemo, useState } from "react";
import type { Course, SyllabusEvent } from "@/lib/types";
import type { StudySession } from "@/lib/plan";
import { fmtMinutes } from "@/lib/plan";
import { addDays, prettyDate, parseYmd } from "@/lib/dates";
import { extensionEmail, recover, type Move, type Readiness, type RecoveryResult } from "@/lib/recovery";

interface Props {
  courses: Course[];
  events: SyllabusEvent[];
  sessions: StudySession[];
  dailyMinutes: number;
  weekends: boolean;
  today: string;
  days: number;
  autoRun?: boolean;
  makeId: () => string;
  onAccept: (r: RecoveryResult) => void;
  onClose: () => void;
}

const LABEL: Record<Readiness, string> = { ready: "Ready", tight: "Tight", at_risk: "At risk", missed: "Missed", extension: "With extension" };
const KIND: Record<Move["kind"], string> = { moved: "Moved", bumped: "Shifted", trimmed: "Trimmed", extension: "Extension" };

export default function Recovery({ courses, events, sessions, dailyMinutes, weekends, today, days: initialDays, autoRun, makeId, onAccept, onClose }: Props) {
  const [days, setDays] = useState(initialDays);
  const [from, setFrom] = useState(today);
  const [result, setResult] = useState<RecoveryResult | null>(null);
  const [step, setStep] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);
  const color = (id: string) => courses.find((c) => c.id === id)?.color ?? "#888";
  const code = (id: string) => courses.find((c) => c.id === id)?.code ?? "";

  const run = () => {
    const r = recover(events, sessions, courses, { from, days, dailyMinutes, weekends, today }, makeId);
    setResult(r);
    setStep(0);
  };
  useEffect(() => {
    if (autoRun) run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // play the reshuffle one deadline at a time
  const playing = !!result && step < result.moves.length;
  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => setStep((s) => s + 1), step === 0 ? 900 : 650);
    return () => clearTimeout(t);
  }, [playing, step]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // the board: 14 days from the first sick day, minutes per deadline per day
  const board = useMemo(() => {
    if (!result) return null;
    const cols: string[] = [];
    for (let i = 0; i < 14; i++) cols.push(addDays(from < today ? today : from, i));
    const live = sessions.filter((s) => !s.removed && !s.done && s.date >= from);
    const cells = new Map<string, Map<string, number>>(); // day -> eventId -> minutes
    const put = (d: string, id: string, m: number) => {
      if (!cells.has(d)) cells.set(d, new Map());
      const c = cells.get(d)!;
      c.set(id, (c.get(id) ?? 0) + m);
      if (c.get(id)! <= 0) c.delete(id);
    };
    for (const s of live) put(s.date, s.eventId, s.minutes);
    const applied = result.moves.slice(0, step);
    for (const m of applied) {
      for (const [d, mins] of Object.entries(m.before)) put(d, m.eventId, -mins);
      for (const [d, mins] of Object.entries(m.after)) put(d, m.eventId, mins);
    }
    // after the reshuffle, the sick days are empty
    if (step >= result.moves.length) for (const d of result.lost) cells.delete(d);
    return { cols, cells, current: step < result.moves.length ? result.moves[step - 1] : undefined };
  }, [result, step, sessions, from, today]);

  const ev = (id: string) => events.find((e) => e.id === id);

  return (
    <div className="scrim" role="dialog" aria-modal="true" aria-label="Save my semester">
      <div className="panel recovery">
        <div className="row">
          <h3 className="grow" style={{ fontSize: 22 }}>Save my semester</h3>
          <button className="btn ghost small" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="row small" style={{ gap: 8 }}>
          I lost
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="Days lost">
            {[1, 2, 3, 4, 5, 7].map((n) => <option key={n} value={n}>{n} day{n > 1 ? "s" : ""}</option>)}
          </select>
          starting
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value || today)} aria-label="First day lost" />
          <button className="btn primary small" onClick={run}>{result ? "Re-plan" : "Re-plan my semester"}</button>
          {result && (
            <span className="muted tiny">
              Sick: {prettyDate(result.lost[0], false)}–{prettyDate(result.lost[result.lost.length - 1], false)} · back {prettyDate(result.back, false)}
            </span>
          )}
        </div>

        {result && board && (
          <>
            <div className="rboard" aria-label="Your next two weeks">
              {board.cols.map((d) => {
                const cell = board.cells.get(d) ?? new Map<string, number>();
                const total = [...cell.values()].reduce((a, b) => a + b, 0);
                const sick = result.lost.includes(d);
                const over = total > dailyMinutes;
                return (
                  <div key={d} className={`rday ${sick ? "sick" : ""} ${over ? "over" : ""}`}>
                    <div className="rhead">
                      <b>{["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"][parseYmd(d).getDay()]}</b> {prettyDate(d, false).replace(/^\w+ /, "")}
                    </div>
                    <div className="rstack">
                      {[...cell.entries()].map(([id, m]) => {
                        const e = ev(id);
                        const hot = board.current?.eventId === id;
                        return (
                          <div key={id} className={`rchip ${hot ? "hot" : ""}`} style={{ height: Math.max(10, m / 4), background: color(e?.courseId ?? "") }} title={`${code(e?.courseId ?? "")} ${e?.title}: ${fmtMinutes(m)}`} />
                        );
                      })}
                    </div>
                    <div className={`rfoot tiny ${over ? "danger" : "muted"}`}>{sick ? "sick" : total ? fmtMinutes(total) : "free"}</div>
                  </div>
                );
              })}
            </div>
            <div className="rlog small" aria-live="polite">
              {playing ? (
                board.current ? (
                  <>
                    <span className={`badge k-${board.current.kind}`}>{KIND[board.current.kind]}</span> <b>{board.current.title}</b>: {board.current.why[0]}
                  </>
                ) : (
                  <span className="muted">Clearing your sick days and re-planning {result.moves.length} deadlines…</span>
                )
              ) : (
                <span>
                  Done. {result.summary.moved + result.summary.trimmed + result.summary.bumped} deadlines re-planned, {result.summary.extensions} need an extension
                  {result.longDays.length ? `, ${result.longDays.length} long day${result.longDays.length > 1 ? "s" : ""} (${result.longDays.map((d) => prettyDate(d, false)).join(", ")})` : ""}.{" "}
                  <button className="btn ghost small" onClick={() => setStep(0)}>Replay</button>
                </span>
              )}
            </div>
          </>
        )}

        {result && !playing && (
          <>
            <div className="futures">
              <div className="future old">
                <div className="tiny muted">Keep the original plan</div>
                <div className="fbig">{result.summary.originalPrepared}%</div>
                <div className="small">prepared · <b>{result.summary.originalAtRisk}</b> deadlines missed or at risk</div>
              </div>
              <div className="future new">
                <div className="tiny muted">Accept the recovery plan</div>
                <div className="fbig">{result.summary.recoveryPrepared}%</div>
                <div className="small">prepared · <b>{result.summary.recoveryAtRisk}</b> missed or at risk</div>
              </div>
            </div>

            <table className="ftable small">
              <thead>
                <tr>
                  <th>Deadline</th>
                  <th>Original plan</th>
                  <th>Recovery plan</th>
                </tr>
              </thead>
              <tbody>
                {result.outlook.slice(0, 14).map((x) => (
                  <tr key={x.event.id}>
                    <td>
                      <span className="dot" style={{ background: color(x.event.courseId) }} /> {code(x.event.courseId)} {x.event.title}
                      <div className="tiny muted">{prettyDate(x.event.date)}{x.event.weight ? ` · ${x.event.weight}%` : ""}{x.note ? ` · ${x.note}` : ""}</div>
                    </td>
                    <td><span className={`pill r-${x.original.status}`}>{LABEL[x.original.status]}</span> <span className="tiny muted">{fmtMinutes(x.original.minutes)} / {fmtMinutes(x.need)}</span></td>
                    <td><span className={`pill r-${x.recovery.status}`}>{LABEL[x.recovery.status]}</span> <span className="tiny muted">{fmtMinutes(x.recovery.minutes)} / {fmtMinutes(x.need)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>

            <details open className="why">
              <summary><b>Why each task moved</b> <span className="muted small">({result.moves.length})</span></summary>
              <div className="stack" style={{ gap: 8, marginTop: 8 }}>
                {result.moves.map((m) => (
                  <div key={m.eventId} className="small">
                    <span className={`badge k-${m.kind}`}>{KIND[m.kind]}</span> <span className="dot" style={{ background: color(m.courseId) }} /> <b>{m.title}</b> <span className="muted tiny">due {prettyDate(m.due, false)}</span>
                    <ul className="tiny" style={{ margin: "4px 0 0 18px", padding: 0 }}>
                      {m.why.map((w, i) => <li key={i}>{w}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </details>

            {result.extensions.length > 0 && (
              <details className="why">
                <summary><b>Extension emails</b> <span className="muted small">({result.extensions.length} drafted)</span></summary>
                <div className="stack" style={{ gap: 8, marginTop: 8 }}>
                  {result.extensions.map((e) => {
                    const text = extensionEmail(e, courses.find((c) => c.id === e.courseId), result.lost);
                    return (
                      <div key={e.id} className="email">
                        <pre>{text}</pre>
                        <button className="btn small" onClick={() => { navigator.clipboard?.writeText(text).catch(() => {}); setCopied(e.id); }}>{copied === e.id ? "Copied" : "Copy"}</button>
                      </div>
                    );
                  })}
                </div>
              </details>
            )}

            <div className="row" style={{ justifyContent: "flex-end" }}>
              <button className="btn" onClick={onClose}>Keep the original plan</button>
              <button className="btn primary" onClick={() => onAccept(result)}>Accept the recovery plan</button>
            </div>
          </>
        )}
        {!result && <p className="muted small">Pick how many days you lost. I&apos;ll clear them, re-plan everything after, and show you both futures before you change anything.</p>}
      </div>
    </div>
  );
}
