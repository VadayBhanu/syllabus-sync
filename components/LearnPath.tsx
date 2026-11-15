"use client";

import { useState } from "react";
import type { Course, SyllabusEvent } from "@/lib/types";
import { progress } from "@/lib/learn";
import { AI_TUTOR_RULES } from "@/lib/roadmaps";
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

type Link = NonNullable<SyllabusEvent["links"]>[number];

const KIND_ICON: Record<string, string> = { video: "▶", course: "🎓", cert: "🏅", docs: "📘", practice: "🧩", search: "🔎" };

function ResLink({ r }: { r: Link }) {
  return (
    <a href={r.url} target="_blank" rel="noreferrer" className={`res-${r.kind ?? "docs"}`}>
      {r.kind ? <span aria-hidden="true">{KIND_ICON[r.kind]} </span> : null}
      {r.label}
      {r.cost && <span className={`cost ${r.cost === "Paid" ? "paid" : ""}`}>{r.cost}</span>}
    </a>
  );
}

const quiz = (title: string) =>
  window.dispatchEvent(new CustomEvent("blaze:ask", { detail: `Quiz me on "${title}" with one question at a time. Don't give me the answers until I try.` }));

export default function LearnPath({ courses, events, today, onToggle, onOpen, onReschedule }: Props) {
  const learning = courses.filter((c) => c.learning);
  const [rulesOpen, setRulesOpen] = useState(true);
  if (!learning.length) return <section className="panel muted">No learning roadmaps yet. Pick one under “Learn a skill”.</section>;
  return (
    <div className="stack">
      <details className="panel tutor" open={rulesOpen} onToggle={(e) => setRulesOpen((e.target as HTMLDetailsElement).open)}>
        <summary><b>Learn with AI, not by AI</b> <span className="tiny muted">· why every topic asks you to prove it</span></summary>
        <ol className="small">
          {AI_TUTOR_RULES.map((r) => <li key={r}>{r}</li>)}
        </ol>
        <div className="tiny muted">Ticking a topic opens a short explain-it-back question. With Gemini on, it reads your answer like a tutor and tells you what's missing.</div>
      </details>
      {learning.map((c) => <Path key={c.id} course={c} events={events} today={today} onToggle={onToggle} onOpen={onOpen} onReschedule={onReschedule} />)}
    </div>
  );
}

function Path({ course, events, today, onToggle, onOpen, onReschedule }: { course: Course } & Omit<Props, "courses">) {
  const p = progress(course, events, today);
  const L = course.learning!;
  const [pace, setPace] = useState(L.hoursPerWeek);
  const openStage = p.stages.findIndex((s) => s.done < s.total);
  const proved = events.filter((e) => e.courseId === course.id && e.proof?.verdict === "pass").length;
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
        <span><b>{p.done}</b> of {p.total} done{proved ? <span className="muted"> ({proved} proved to Gemini)</span> : null}</span>
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
          {L.origin === "gemini" ? "Outline drafted by Gemini." : "Starter outline."} Topic and certification links are searches, so pick sources you trust. Click a topic to rename it or change its date.
        </div>
      )}

      {p.stages.map((s, i) => {
        const info = L.stageInfo?.find((x) => x.title === s.title);
        return (
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
                  <input type="checkbox" checked={!!e.done} onChange={() => onToggle(e.id)} aria-label={e.done ? `Mark ${e.title} not done` : `Prove and mark ${e.title} done`} />
                  <div className="grow">
                    <button className="linkish" onClick={() => onOpen(e)}>
                      {e.kind === "project" ? "🛠 " : ""}<b>{e.title}</b>
                    </button>
                    <span className="tiny muted"> · {e.minutes ? fmtMinutes(e.minutes) : ""} · by {prettyDate(e.date, false)}</span>
                    {e.proof && <span className={`proof ${e.proof.verdict}`} title={e.proof.answer}>{e.proof.verdict === "pass" ? "✓ proved" : "self-checked"}</span>}
                    {e.goal && <div className="tiny muted">{e.goal}</div>}
                    {e.links?.length ? (
                      <div className="res">
                        {e.links.map((r) => <ResLink key={r.url} r={r} />)}
                        {e.kind !== "project" && !e.done && <button className="res-quiz" onClick={() => quiz(e.title)}>💬 Quiz me</button>}
                      </div>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
            {(info?.earn || info?.certs?.length) && (
              <div className="earn">
                {info?.earn && (
                  <>
                    <div className="earn-h">💰 Put it to work</div>
                    <div className="small"><b>After this stage you can:</b> {info.earn.canDo}</div>
                    <ul className="small">
                      {info.earn.gigs.map((g) => <li key={g}>{g}</li>)}
                    </ul>
                    <div className="small"><b>Show it:</b> {info.earn.showIt}</div>
                  </>
                )}
                {info?.certs?.length ? (
                  <div className="res" style={{ marginTop: 6 }}>
                    {info.certs.map((r) => <ResLink key={r.url} r={r} />)}
                  </div>
                ) : null}
                <div className="tiny muted" style={{ marginTop: 4 }}>Opportunities, not promises: what pays depends on your portfolio, location and effort.</div>
              </div>
            )}
          </details>
        );
      })}
    </section>
  );
}
