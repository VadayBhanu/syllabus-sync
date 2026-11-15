"use client";

import { useState } from "react";
import type { Track } from "@/lib/roadmaps";
import { searchLinks, trackMinutes } from "@/lib/roadmaps";
import { fmtMinutes } from "@/lib/plan";
import { ResLink } from "./LearnPath";

interface Props {
  track: Track;
  hoursPerWeek?: number;
  startLabel: string;
  onStart: (t: Track) => void;
  onCancel: () => void;
}

// Shown before a roadmap or project plan goes on the map: where to study each topic up front,
// and a chance to drop, rename or add topics so the voyage is yours before you set sail.
export default function RoadmapPreview({ track, hoursPerWeek, startLabel, onStart, onCancel }: Props) {
  const [draft, setDraft] = useState<Track>(() => structuredClone(track));
  const [off, setOff] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState<Record<number, string>>({});
  const isProject = draft.kind === "project";

  const final = (): Track => ({
    ...draft,
    stages: draft.stages
      .map((s, i) => ({ ...s, topics: s.topics.filter((_, j) => !off.has(`${i}:${j}`)) }))
      .filter((s) => s.topics.length || s.project),
  });
  const kept = final();
  const mins = trackMinutes(kept);
  const count = kept.stages.reduce((t, s) => t + s.topics.length, 0);

  const rename = (i: number, j: number, title: string) =>
    setDraft((d) => ({ ...d, stages: d.stages.map((s, a) => (a !== i ? s : { ...s, topics: s.topics.map((t, b) => (b === j ? { ...t, title } : t)) })) }));
  const add = (i: number) => {
    const title = (adding[i] ?? "").trim();
    if (!title) return;
    setDraft((d) => ({
      ...d,
      stages: d.stages.map((s, a) =>
        a !== i ? s : { ...s, topics: [...s.topics, { title, minutes: 120, goal: "Added by you", check: isProject ? "" : `Explain "${title}" in your own words with one example.`, resources: searchLinks(d.name, title) }] },
      ),
    }));
    setAdding((x) => ({ ...x, [i]: "" }));
  };

  return (
    <section className="panel stack preview" style={{ gap: 12 }} aria-label={`Preview of ${draft.name}`}>
      <div className="row" style={{ alignItems: "flex-start" }}>
        <div className="grow">
          <div className="tiny muted">{isProject ? "Your project plan" : "Your roadmap"}, before it goes on the map</div>
          <h3 style={{ margin: "2px 0" }}>{draft.name}</h3>
          <div className="small muted">{draft.blurb}</div>
        </div>
        <a className="btn small ghost" href={draft.roadmap.url} target="_blank" rel="noreferrer">{draft.roadmap.label} ↗</a>
      </div>
      <div className="small">
        <b>{count}</b> {isProject ? "tasks" : "topics"} in {kept.stages.length} stages · about {fmtMinutes(mins)} of work
        {hoursPerWeek ? <> · about {Math.ceil(mins / 60 / hoursPerWeek)} weeks at {hoursPerWeek} h/week</> : null}
        <span className="muted"> · Untick anything you already know, rename topics, or add your own.</span>
      </div>

      {draft.stages.map((s, i) => (
        <div key={i} className="stage-pre">
          <div className="row"><span className="stage-n">{i + 1}</span><b className="grow">{s.title}</b></div>
          <ul className="topics">
            {s.topics.map((t, j) => {
              const k = `${i}:${j}`;
              const on = !off.has(k);
              return (
                <li key={k} className={on ? "" : "skip"}>
                  <input type="checkbox" checked={on} aria-label={`Include ${t.title}`} onChange={() => setOff((o) => { const n = new Set(o); if (n.has(k)) n.delete(k); else n.add(k); return n; })} />
                  <div className="grow">
                    <input className="inline-edit" size={Math.max(12, t.title.length + 1)} value={t.title} onChange={(e) => rename(i, j, e.target.value)} aria-label="Topic name" />
                    <span className="tiny muted"> · {fmtMinutes(t.minutes)}</span>
                    {on && (
                      <div className="res">
                        <span className="tiny muted" style={{ alignSelf: "center" }}>Study it at:</span>
                        {t.resources.map((r) => <ResLink key={r.url} r={r} />)}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          {s.project && <div className="small" style={{ margin: "0 0 6px 30px" }}>🛠 <b>{s.project.title}</b> <span className="muted">· {s.project.goal}</span></div>}
          {s.certs?.length ? <div className="res" style={{ margin: "0 0 6px 30px" }}><span className="tiny muted" style={{ alignSelf: "center" }}>Certify it:</span>{s.certs.map((r) => <ResLink key={r.url} r={r} />)}</div> : null}
          {s.earn && <div className="tiny muted" style={{ margin: "0 0 6px 30px" }}>💰 After this: {s.earn.canDo}</div>}
          <div className="row" style={{ margin: "0 0 4px 30px", flexWrap: "nowrap" }}>
            <input className="textin" style={{ padding: "4px 8px", fontSize: 13 }} value={adding[i] ?? ""} onChange={(e) => setAdding((x) => ({ ...x, [i]: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && add(i)} placeholder={isProject ? "Add a task to this stage" : "Add your own topic to this stage"} aria-label={`Add to ${s.title}`} />
            <button className="btn small" onClick={() => add(i)} disabled={!(adding[i] ?? "").trim()}>Add</button>
          </div>
        </div>
      ))}

      <div className="row">
        <button className="btn primary" disabled={!count} onClick={() => onStart(kept)}>{startLabel}</button>
        <button className="btn ghost" onClick={onCancel}>Back</button>
      </div>
    </section>
  );
}
