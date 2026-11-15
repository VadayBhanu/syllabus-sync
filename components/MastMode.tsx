"use client";

// Mast mode: Odysseus had himself tied to the mast so he could sail past the Sirens.
// This is a focus timer. If you leave the tab while it runs, the Sirens got you, and
// we count it. Finishing a session marks it done and moves your ship forward.

import { useEffect, useRef, useState } from "react";
import type { StudySession } from "@/lib/plan";
import { fmtMinutes } from "@/lib/plan";
import { ymd } from "@/lib/dates";
import { singSirens, unlockAudio, type SirenSong } from "@/lib/siren";

const SONG_KEY = "syllabus-sync:siren-song";

const LOG_KEY = "syllabus-sync:focus-log";

export interface FocusEntry {
  date: string;
  minutes: number;
  sirens: number;
  label: string;
}

export function loadFocusLog(): FocusEntry[] {
  try {
    const v = JSON.parse(localStorage.getItem(LOG_KEY) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function saveFocusLog(log: FocusEntry[]) {
  try {
    localStorage.setItem(LOG_KEY, JSON.stringify(log.slice(-500)));
  } catch {}
}

interface Props {
  session?: StudySession | null;
  onClose: () => void;
  onComplete: (session: StudySession | null | undefined, minutes: number) => void;
}

const LENGTHS = [15, 25, 50];

export default function MastMode({ session, onClose, onComplete }: Props) {
  const [length, setLength] = useState(session ? Math.min(50, Math.max(15, session.minutes >= 50 ? 50 : 25)) : 25);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [pausedLeft, setPausedLeft] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [sirens, setSirens] = useState(0);
  const [lured, setLured] = useState(false);
  const [done, setDone] = useState(false);
  const [lastMinutes, setLastMinutes] = useState(0);
  const startedAt = useRef<number>(0);
  const [log, setLog] = useState<FocusEntry[]>([]);

  useEffect(() => setLog(loadFocusLog()), []);

  // The Sirens' song: plays while you've wandered off to another tab, stops when you come back.
  const [songOn, setSongOn] = useState(true);
  const [preview, setPreview] = useState(false);
  const song = useRef<SirenSong | null>(null);
  const hush = () => {
    song.current?.stop();
    song.current = null;
  };
  useEffect(() => {
    try {
      setSongOn(localStorage.getItem(SONG_KEY) !== "off");
    } catch {}
    return () => song.current?.stop(0.3);
  }, []);
  function toggleSong() {
    const v = !songOn;
    setSongOn(v);
    try {
      localStorage.setItem(SONG_KEY, v ? "on" : "off");
    } catch {}
    if (!v) {
      hush();
      setPreview(false);
    }
  }
  function togglePreview() {
    if (preview) {
      hush();
      setPreview(false);
    } else {
      hush();
      song.current = singSirens(0.45);
      setPreview(true);
    }
  }

  const running = endsAt !== null && pausedLeft === null && !done;
  const total = length * 60_000;
  const left = done ? 0 : pausedLeft ?? (endsAt ? Math.max(0, endsAt - now) : total);
  const progress = 1 - left / total;

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [running]);

  // The Sirens: leaving the tab while tied to the mast
  useEffect(() => {
    if (!running) return;
    const onVis = () => {
      if (document.hidden) {
        setSirens((n) => n + 1);
        setLured(true);
        if (songOn && !song.current) song.current = singSirens(0.5);
      } else if (!preview) {
        hush();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, songOn, preview]);

  useEffect(() => {
    if (!running && !preview) hush();
  }, [running, preview]);

  useEffect(() => {
    if (running && left <= 0) finish(length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, running]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !running && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [running, onClose]);

  function start() {
    unlockAudio(); // allowed now, during the click, so the Sirens can sing later from a background tab
    hush();
    setPreview(false);
    startedAt.current = Date.now();
    setEndsAt(Date.now() + total);
    setNow(Date.now());
    setPausedLeft(null);
    setSirens(0);
    setDone(false);
  }

  function finish(minutes: number) {
    setDone(true);
    setLastMinutes(minutes);
    const entry: FocusEntry = { date: ymd(new Date()), minutes, sirens, label: session?.label ?? "Free focus" };
    const next = [...loadFocusLog(), entry];
    saveFocusLog(next);
    setLog(next);
    onComplete(session, minutes);
  }

  function stopEarly() {
    const minutes = Math.floor((total - left) / 60_000);
    if (minutes >= 1) finish(minutes);
    else onClose();
  }

  const mm = Math.floor(left / 60000);
  const ss = Math.floor((left % 60000) / 1000);
  const today = ymd(new Date());
  const weekMinutes = log.filter((e) => e.date > ymd(new Date(Date.now() - 7 * 86_400_000))).reduce((t, e) => t + e.minutes, 0);
  const todayMinutes = log.filter((e) => e.date === today).reduce((t, e) => t + e.minutes, 0);

  return (
    <div className="scrim mast-scrim" role="dialog" aria-modal="true" aria-label="Mast mode focus timer">
      <div className="panel mast">
        <div className="row">
          <h3 className="grow" style={{ fontSize: 22 }}>Tie yourself to the mast</h3>
          {!running && <button className="btn ghost small" onClick={onClose} aria-label="Close">×</button>}
        </div>
        <p className="muted small" style={{ marginTop: 4 }}>
          {session ? <>Focusing on <b>{session.label}</b>. </> : null}
          Odysseus had his crew tie him to the mast so he could hear the Sirens without steering into the rocks. Stay on this tab until the timer ends. If you wander off, the Sirens got you.
        </p>

        <MastScene progress={progress} lured={(lured && running) || preview} />

        <div className="mast-time" aria-live="off">
          {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
        </div>

        {lured && running && (
          <div className="notice warn small" role="status" style={{ textAlign: "center" }}>
            The Sirens called and you answered{sirens > 1 ? ` (${sirens} times)` : ""}. Back to the oars.{" "}
            <button className="btn small" onClick={() => setLured(false)}>I&apos;m back</button>
          </div>
        )}

        {done ? (
          <div className="stack" style={{ gap: 8, textAlign: "center" }}>
            <b style={{ fontSize: 18 }}>{sirens === 0 ? "You sailed past the Sirens." : `Made it, with ${sirens} Siren detour${sirens > 1 ? "s" : ""}.`}</b>
            <span className="muted small">{session ? (lastMinutes >= session.minutes * 0.6 ? "Session marked done. " : `${lastMinutes} minutes logged toward this session. `) : ""}{fmtMinutes(todayMinutes)} at the mast today, {fmtMinutes(weekMinutes)} this week.</span>
            <div className="row" style={{ justifyContent: "center" }}>
              <button className="btn" onClick={start}>Another round</button>
              <button className="btn primary" onClick={onClose}>Back to the map</button>
            </div>
          </div>
        ) : running ? (
          <div className="row" style={{ justifyContent: "center" }}>
            <button className="btn" onClick={() => setPausedLeft(left)}>Pause</button>
            <button className="btn danger" onClick={stopEarly}>Untie early</button>
          </div>
        ) : pausedLeft !== null ? (
          <div className="row" style={{ justifyContent: "center" }}>
            <button className="btn primary" onClick={() => { setEndsAt(Date.now() + pausedLeft); setNow(Date.now()); setPausedLeft(null); }}>Resume</button>
            <button className="btn danger" onClick={stopEarly}>Untie early</button>
          </div>
        ) : (
          <div className="stack" style={{ gap: 10, alignItems: "center" }}>
            <div className="tabs">
              {LENGTHS.map((l) => (
                <button key={l} role="tab" className="tab" aria-selected={length === l} onClick={() => setLength(l)}>{l} min</button>
              ))}
            </div>
            <button className="btn primary" onClick={start} style={{ padding: "10px 22px", fontSize: 16 }}>Set sail</button>
            <div className="row" style={{ gap: 6, justifyContent: "center" }}>
              <button className="btn small ghost" aria-pressed={songOn} onClick={toggleSong} title="Play the Sirens' song when you leave this tab">
                {songOn ? "🔊 Siren song on" : "🔈 Siren song off"}
              </button>
              {songOn && (
                <button className="btn small ghost" aria-pressed={preview} onClick={togglePreview}>
                  {preview ? "■ Stop the Sirens" : "♪ Hear the Sirens"}
                </button>
              )}
            </div>
            <span className="tiny muted" style={{ textAlign: "center" }}>Leave this tab mid-session and the Sirens start singing. Come back and they fall quiet.</span>
            {weekMinutes > 0 && <span className="tiny muted">{fmtMinutes(weekMinutes)} at the mast this week</span>}
          </div>
        )}
      </div>
    </div>
  );
}

/** A little ship sailing from one island to the next as the timer runs, with Sirens on a rock. */
function MastScene({ progress, lured }: { progress: number; lured: boolean }) {
  const x = 60 + progress * 280;
  const bob = Math.sin(Date.now() / 400) * 2;
  return (
    <svg viewBox="0 0 400 140" className="mast-scene" aria-hidden="true">
      <rect width="400" height="140" fill="var(--sea)" rx="12" />
      {[30, 60, 90, 120].map((y, i) => (
        <path key={y} d={`M0 ${y} q 12 -6 25 0 t 25 0 t 25 0 t 25 0 t 25 0 t 25 0 t 25 0 t 25 0 t 25 0 t 25 0 t 25 0 t 25 0 t 25 0 t 25 0 t 25 0 t 25 0`} fill="none" stroke="var(--wave)" strokeWidth="1" opacity={0.35 + i * 0.08} />
      ))}
      <ellipse cx="40" cy="104" rx="34" ry="14" fill="var(--land)" stroke="var(--land-edge)" />
      <ellipse cx="362" cy="104" rx="34" ry="14" fill="var(--land)" stroke="var(--land-edge)" />
      <text x="362" y="128" textAnchor="middle" fontSize="10" fill="var(--muted)">done</text>
      {/* Sirens' rock */}
      <path d="M190 120 L205 92 L222 120 Z" fill="var(--storm)" opacity="0.7" />
      <g fill={lured ? "var(--danger)" : "var(--muted)"}>
        <circle cx="200" cy="88" r="3.5" />
        <circle cx="212" cy="90" r="3.5" />
        <text x="206" y="78" textAnchor="middle" fontSize="12">{lured ? "♪ ♫ ♪" : "♪"}</text>
      </g>
      <path d={`M60 100 L${x} 100`} stroke="var(--accent)" strokeWidth="2" strokeDasharray="4 5" />
      <g transform={`translate(${x}, ${96 + bob})`}>
        <path d="M-18 0 L18 0 L12 10 L-12 10 Z" fill="var(--ink)" />
        <line x1="0" y1="0" x2="0" y2="-34" stroke="var(--ink)" strokeWidth="2" />
        <path d="M2 -32 Q20 -18 2 -4 Z" fill="var(--panel)" stroke="var(--ink)" />
        {/* Odysseus, tied on */}
        <circle cx="0" cy="-12" r="3" fill="var(--warn)" />
        <path d="M-4 -9 L4 -6 M-4 -5 L4 -2" stroke="var(--land-edge)" strokeWidth="1.2" />
      </g>
    </svg>
  );
}
