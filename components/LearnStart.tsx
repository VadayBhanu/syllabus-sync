"use client";

import { useState } from "react";
import { TRACKS, matchTrack, outlineFor, sanitizeTrack, trackMinutes, type Track } from "@/lib/roadmaps";
import { ymd } from "@/lib/dates";

interface Props {
  onStart: (track: Track, opts: { start: string; hoursPerWeek: number }) => void;
  ai?: boolean;
  compact?: boolean;
}

const STATIC_PREVIEW = process.env.NEXT_PUBLIC_STATIC === "1";
const PACES = [3, 5, 8, 12, 20];

export default function LearnStart({ onStart, ai, compact }: Props) {
  const [hours, setHours] = useState(5);
  const [start, setStart] = useState(() => ymd(new Date()));
  const [goal, setGoal] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const weeks = (t: Track) => Math.ceil(trackMinutes(t) / (hours * 60));

  async function custom() {
    const g = goal.trim();
    if (!g) return;
    setNote(null);
    const curated = matchTrack(g);
    if (curated && !ai) {
      onStart(curated, { start, hoursPerWeek: hours });
      setGoal("");
      return;
    }
    if (ai && !STATIC_PREVIEW) {
      setBusy(true);
      try {
        const res = await fetch("/api/roadmap", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ goal: g }) });
        const data = await res.json();
        const t = res.ok ? sanitizeTrack(data.track, g) : null;
        if (t) {
          onStart(t, { start, hoursPerWeek: hours });
          setGoal("");
          return;
        }
        setNote(`${data.error ?? "Gemini's roadmap didn't look right."} Used a starter outline instead.`);
      } catch {
        setNote("Couldn't reach Gemini. Used a starter outline instead.");
      } finally {
        setBusy(false);
      }
    }
    onStart(curated ?? outlineFor(g), { start, hoursPerWeek: hours });
    setGoal("");
  }

  return (
    <div className={compact ? "panel stack" : "stack"} style={{ gap: 10 }} data-tour="learn">
      {compact ? <h3 style={{ fontSize: 17 }}>Learn a skill</h3> : null}
      <p className="small muted" style={{ margin: 0 }}>
        No syllabus? Pick what you want to learn and get a staged roadmap on the same voyage map, with a study plan, free resources for every topic, and Blaze to ask about it.
      </p>
      <div className="row small" style={{ gap: 8 }}>
        <label className="row" style={{ gap: 6 }}>
          Pace
          <select className="btn small" value={hours} onChange={(e) => setHours(Number(e.target.value))} aria-label="Hours per week">
            {PACES.map((h) => <option key={h} value={h}>{h} h / week</option>)}
          </select>
        </label>
        <label className="row" style={{ gap: 6 }}>
          Start
          <input type="date" className="textin" style={{ width: "auto" }} value={start} onChange={(e) => e.target.value && setStart(e.target.value)} aria-label="Start date" />
        </label>
      </div>
      <div className={compact ? "stack" : "tracks"} style={compact ? { gap: 6 } : undefined}>
        {TRACKS.map((t) => (
          <button key={t.id} className="track" onClick={() => onStart(t, { start, hoursPerWeek: hours })}>
            <b>{t.name}</b>
            {!compact && <span className="small muted">{t.blurb}</span>}
            <span className="tiny muted">
              {t.stages.length} stages · {t.stages.reduce((s, x) => s + x.topics.length, 0)} topics · about {weeks(t)} weeks at {hours} h/week
            </span>
          </button>
        ))}
      </div>
      <div className="row" style={{ flexWrap: "nowrap" }}>
        <input
          className="textin"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && custom()}
          placeholder="Or type any goal: quantum computing, Rust, UX design…"
          aria-label="What do you want to learn?"
        />
        <button className="btn primary small" disabled={!goal.trim() || busy} onClick={custom}>
          {busy ? "Drafting with Gemini…" : "Build roadmap"}
        </button>
      </div>
      {note && <div className="notice" role="status">{note}</div>}
      <p className="tiny muted" style={{ margin: 0 }}>
        Topic outlines are written by us (or drafted by Gemini for custom goals) and link to the matching{" "}
        <a href="https://roadmap.sh" target="_blank" rel="noreferrer">roadmap.sh</a> roadmap for the full community map. roadmap.sh content is not copied.
      </p>
    </div>
  );
}
