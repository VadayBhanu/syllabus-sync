"use client";

// Autopilot dashboard: widgets and custom trackers the student asked Trojan for, plus the
// AI Builder, where Gemini drafts a whole new feature for review without touching the app.

import { useState } from "react";
import type { Course, SyllabusEvent } from "@/lib/types";
import { GRADED } from "@/lib/types";
import type { StudySession } from "@/lib/plan";
import { fmtMinutes } from "@/lib/plan";
import { addDays, daysBetween, prettyDate } from "@/lib/dates";
import { progressOf, streakOf, type Tracker } from "@/lib/trackers";
import { loadFocusLog } from "./MastMode";
import { checkDraft, OFFLINE_DRAFT, previewHtml, type FeatureDraft } from "@/lib/builder";

interface Props {
  courses: Course[];
  events: SyllabusEvent[];
  sessions: StudySession[];
  today: string;
  trackers: Tracker[];
  ai: boolean;
  onTrackers: (t: Tracker[]) => void;
  onAsk: (q: string) => void;
}

export default function Dashboard({ courses, events, sessions, today, trackers, ai, onTrackers, onAsk }: Props) {
  const code = (id: string) => courses.find((c) => c.id === id)?.code ?? "";
  const graded = events.filter((e) => GRADED.includes(e.kind));
  const week = graded.filter((e) => !e.done && e.date >= today && e.date <= addDays(today, 6));
  const nextExam = graded.filter((e) => e.kind === "exam" && !e.done && e.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0];
  const planned = sessions.filter((s) => !s.removed && s.date >= today && s.date <= addDays(today, 6));
  const plannedMin = planned.reduce((t, s) => t + s.minutes, 0);
  const doneMin = planned.filter((s) => s.done).reduce((t, s) => t + s.minutes, 0);
  const focus = (() => {
    try {
      return loadFocusLog().filter((e) => e.date > addDays(today, -7)).reduce((t, e) => t + e.minutes, 0);
    } catch {
      return 0;
    }
  })();
  const done = graded.filter((e) => e.done || e.date < today).length;

  const log = (id: string, delta: number) =>
    onTrackers(trackers.map((t) => (t.id !== id ? t : { ...t, log: { ...t.log, [today]: Math.max(0, (t.log[today] ?? 0) + delta) } })));

  return (
    <section className="stack" style={{ gap: 12 }}>
      <div className="panel">
        <div className="row">
          <h3 className="grow" style={{ fontSize: 18 }}>Autopilot dashboard</h3>
          <span className="tiny muted">Ask Trojan to add trackers: “track my gym sessions 3 times a week”</span>
        </div>
        <div className="dgrid">
          <div className="dcard">
            <div className="tiny muted">Due in the next 7 days</div>
            <div className="dbig">{week.length}</div>
            <div className="tiny">{week.slice(0, 3).map((e) => `${code(e.courseId)} ${e.title}`).join(" · ") || "Nothing graded"}</div>
          </div>
          <div className="dcard">
            <div className="tiny muted">Next exam</div>
            <div className="dbig">{nextExam ? `${daysBetween(today, nextExam.date)}d` : "–"}</div>
            <div className="tiny">{nextExam ? `${code(nextExam.courseId)} ${nextExam.title}, ${prettyDate(nextExam.date, false)}` : "No exams ahead"}</div>
          </div>
          <div className="dcard">
            <div className="tiny muted">Work plan this week</div>
            <div className="dbig">{plannedMin ? Math.round((doneMin / plannedMin) * 100) : 0}%</div>
            <div className="tiny">{fmtMinutes(doneMin)} of {fmtMinutes(plannedMin)} done · {fmtMinutes(focus)} at the mast</div>
          </div>
          <div className="dcard">
            <div className="tiny muted">Semester voyage</div>
            <div className="dbig">{graded.length ? Math.round((done / graded.length) * 100) : 0}%</div>
            <div className="tiny">{done} of {graded.length} graded items behind you</div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="row">
          <h3 className="grow" style={{ fontSize: 17 }}>My trackers</h3>
          <button className="btn small" onClick={() => onAsk("Track my gym sessions 3 times a week")}>+ Ask Trojan for one</button>
        </div>
        {!trackers.length && <p className="muted small">No trackers yet. Tell Trojan what you want to keep count of: office hours, LeetCode problems, pages read, gym, sleep.</p>}
        <div className="dgrid">
          {trackers.map((t) => {
            const p = progressOf(t, today);
            const pct = Math.min(1, p / t.target);
            const streak = streakOf(t, today);
            return (
              <div key={t.id} className="dcard">
                <div className="row">
                  <b className="grow small">{t.title}</b>
                  <button className="btn ghost small" title="Remove tracker" onClick={() => onTrackers(trackers.filter((x) => x.id !== t.id))}>×</button>
                </div>
                <svg viewBox="0 0 36 36" width="64" height="64" aria-hidden="true">
                  <circle cx="18" cy="18" r="15" fill="none" stroke="var(--line)" strokeWidth="4" />
                  <circle cx="18" cy="18" r="15" fill="none" stroke={pct >= 1 ? "#2f9e57" : "var(--accent)"} strokeWidth="4" strokeDasharray={`${pct * 94.2} 94.2`} transform="rotate(-90 18 18)" strokeLinecap="round" />
                  <text x="18" y="21" textAnchor="middle" fontSize="9" fontWeight="700" fill="currentColor">{p}/{t.target}</text>
                </svg>
                <div className="tiny muted">{t.unit} this {t.period}{streak ? ` · 🔥 ${streak} ${t.period}${streak > 1 ? "s" : ""} in a row` : ""}</div>
                <div className="row" style={{ gap: 4 }}>
                  <button className="btn small" onClick={() => log(t.id, -1)} aria-label={`Remove one from ${t.title}`}>−</button>
                  <button className="btn small primary" onClick={() => log(t.id, 1)} aria-label={`Log one for ${t.title}`}>+1</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Builder ai={ai} />
    </section>
  );
}

function Builder({ ai }: { ai: boolean }) {
  const [idea, setIdea] = useState("A study-group finder card that shows which classmates are free at the same time as me this week");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<FeatureDraft | null>(null);
  const [note, setNote] = useState("");
  const [tab, setTab] = useState<"preview" | "code" | "tests">("preview");

  const build = async () => {
    setBusy(true);
    setNote("");
    let d: FeatureDraft | null = null;
    if (ai) {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 55_000);
      try {
        const r = await fetch("/api/builder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idea }), signal: ctl.signal });
        const j = await r.json();
        if (r.ok && j.code) d = j;
        else setNote(`${j.error ?? "Gemini couldn't draft that."} Showing a saved example draft instead.`);
      } catch {
        setNote("Gemini didn't answer in time. Showing a saved example draft instead.");
      } finally {
        clearTimeout(timer);
      }
    } else setNote("Gemini isn't connected on this copy of the site. Showing a saved example draft.");
    setDraft(d ?? OFFLINE_DRAFT);
    setTab("preview");
    setBusy(false);
  };

  const checks = draft ? checkDraft(draft) : [];
  const safe = checks.every((c) => c.ok);
  return (
    <div className="panel stack" style={{ gap: 10 }}>
      <div>
        <h3 style={{ fontSize: 17 }}>AI Builder <span className="badge">developer mode</span></h3>
        <p className="muted small" style={{ margin: "4px 0 0" }}>
          Describe a feature. Gemini drafts it as a React component, SyllabusSync checks the code for anything unsafe, and you see it running in a sealed preview.
          Nothing is deployed: the draft goes to a developer for review and tests.
        </p>
      </div>
      <textarea className="paste" rows={2} value={idea} onChange={(e) => setIdea(e.target.value)} aria-label="Describe a feature" />
      <div className="row">
        <button className="btn primary small" disabled={busy || idea.trim().length < 8} onClick={build}>{busy ? "Gemini is drafting…" : "Draft this feature"}</button>
        {note && <span className="tiny muted">{note}</span>}
      </div>
      {draft && (
        <div className="stack" style={{ gap: 8 }}>
          <div>
            <b>{draft.name}</b> {draft.offline && <span className="badge low">saved example</span>}
            <div className="small">{draft.summary}</div>
          </div>
          <div className="bchecks">
            {checks.map((c) => (
              <span key={c.label} className={`tiny ${c.ok ? "ok" : "bad"}`}>{c.ok ? "✓" : "✗"} {c.label}{c.detail && !c.ok ? ` (${c.detail})` : ""}</span>
            ))}
          </div>
          <div className="tabs">
            {(["preview", "code", "tests"] as const).map((t) => (
              <button key={t} role="tab" className="tab" aria-selected={tab === t} onClick={() => setTab(t)}>{t === "preview" ? "Sandboxed preview" : t === "code" ? "Code" : "Tests and risks"}</button>
            ))}
          </div>
          {tab === "preview" &&
            (safe ? (
              <iframe className="bframe" title="Feature preview" sandbox="allow-scripts" srcDoc={previewHtml(draft.code, (typeof window !== "undefined" ? window.location.origin : "") + (process.env.NEXT_PUBLIC_BASE_PATH ?? ""))} />
            ) : (
              <div className="notice warn small">The draft failed a safety check, so it isn&apos;t run. Ask Gemini to redo it without that.</div>
            ))}
          {tab === "code" && <pre className="bcode">{draft.code}</pre>}
          {tab === "tests" && (
            <div className="small">
              <b>Tests to run before shipping</b>
              <ul>{draft.tests.map((t, i) => <li key={i}>{t}</li>)}</ul>
              {draft.risks.length > 0 && (
                <>
                  <b>Watch out for</b>
                  <ul>{draft.risks.map((t, i) => <li key={i}>{t}</li>)}</ul>
                </>
              )}
            </div>
          )}
          <div className="row">
            <button className="btn small" onClick={() => navigator.clipboard?.writeText(draft.code).catch(() => {})}>Copy code</button>
            <a className="btn small" download={`${draft.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "feature"}.jsx`} href={`data:text/plain;charset=utf-8,${encodeURIComponent(draft.code)}`}>Download for review</a>
            <span className="tiny muted">The preview runs on sample data in a sealed frame with no access to your data, your login or this page.</span>
          </div>
        </div>
      )}
    </div>
  );
}
