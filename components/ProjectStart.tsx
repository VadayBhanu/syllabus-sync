"use client";

import { useState } from "react";
import { projectTemplate, sanitizeTrack, type Track } from "@/lib/roadmaps";
import { addDays, ymd } from "@/lib/dates";

interface Props {
  onPreview: (track: Track, opts: { start: string; hoursPerWeek: number; due?: string }, note?: string) => void;
  ai?: boolean;
  compact?: boolean;
}

const STATIC_PREVIEW = process.env.NEXT_PUBLIC_STATIC === "1";

// Personal projects: a goal and a deadline become milestones and tasks on the voyage map.
export default function ProjectStart({ onPreview, ai, compact }: Props) {
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [start, setStart] = useState(() => ymd(new Date()));
  const [due, setDue] = useState(() => addDays(ymd(new Date()), 42));
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function plan() {
    if (!name.trim() && !goal.trim()) return;
    setNote(null);
    const opts = { start, hoursPerWeek: 5, due: due > start ? due : undefined };
    let fallback: string | undefined;
    if (ai && !STATIC_PREVIEW) {
      setBusy(true);
      try {
        const res = await fetch("/api/roadmap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind: "project", name, goal: goal || name, due }),
        });
        const data = await res.json();
        const t = res.ok ? sanitizeTrack(data.track, goal || name, "project") : null;
        if (t) {
          if (name.trim()) t.name = name.trim().slice(0, 60);
          onPreview(t, opts);
          return;
        }
        fallback = `${data.error ?? "Gemini's plan didn't look right."} Used the standard project milestones instead; edit them below.`;
      } catch {
        fallback = "Couldn't reach Gemini. Used the standard project milestones instead; edit them below.";
      } finally {
        setBusy(false);
      }
    }
    onPreview(projectTemplate(name || goal, goal), opts, fallback);
  }

  return (
    <div className={compact ? "panel stack" : "stack"} style={{ gap: 10 }}>
      {compact ? <h3 style={{ fontSize: 17 }}>Plan another project</h3> : null}
      <p className="small muted" style={{ margin: 0 }}>
        Building something: an app, a research project, a startup idea, a portfolio piece? Describe it and set a date. You get milestones and tasks on the voyage map, fitted to your deadline, with where to learn whatever each task needs.
      </p>
      <input className="textin" value={name} onChange={(e) => setName(e.target.value)} placeholder="Project name, e.g. Campus food-share app" aria-label="Project name" />
      <textarea className="paste" style={{ minHeight: 80 }} value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="What should it do, and for whom? e.g. A web app where dorms post leftover food and students claim it." aria-label="What should it do?" />
      <div className="row small" style={{ gap: 8 }}>
        <label className="row" style={{ gap: 6 }}>Start <input type="date" className="textin" style={{ width: "auto" }} value={start} onChange={(e) => e.target.value && setStart(e.target.value)} aria-label="Start date" /></label>
        <label className="row" style={{ gap: 6 }}>Done by <input type="date" className="textin" style={{ width: "auto" }} value={due} onChange={(e) => e.target.value && setDue(e.target.value)} aria-label="Done by" /></label>
      </div>
      <div className="row">
        <button className="btn primary small" disabled={busy || (!name.trim() && !goal.trim())} onClick={plan}>
          {busy ? "Planning with Gemini…" : "Plan my project"}
        </button>
      </div>
      {note && <div className="notice" role="status">{note}</div>}
    </div>
  );
}
