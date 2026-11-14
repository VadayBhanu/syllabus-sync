"use client";

import { useEffect, useRef, useState } from "react";
import type { SavedState } from "@/lib/storage";

const KEY = "syllabus-sync:voyage-code";
const WORDS = ["ithaca", "aeolus", "circe", "athena", "argos", "nestor", "pylos", "scheria", "helios", "telemachus"];

function newCode() {
  const w = WORDS[Math.floor(Math.random() * WORDS.length)];
  const n = Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => "abcdefghjkmnpqrstuvwxyz23456789"[b % 31]).join("");
  return `${w}-${n}`;
}

interface Props {
  state: SavedState;
  onLoad: (s: SavedState) => void;
}

export default function CloudSync({ state, onLoad }: Props) {
  const [code, setCode] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [entry, setEntry] = useState("");
  const skipNext = useRef(false);

  useEffect(() => {
    try {
      setCode(localStorage.getItem(KEY));
    } catch {}
  }, []);

  // autosave a moment after anything changes
  useEffect(() => {
    if (!code) return;
    if (skipNext.current) {
      skipNext.current = false;
      return;
    }
    setStatus("Saving…");
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/voyage/${code}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(state) });
        const data = await res.json();
        setStatus(res.ok ? `Saved ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : data.error ?? "Save failed");
      } catch {
        setStatus("Offline. Saved on this device only.");
      }
    }, 1200);
    return () => clearTimeout(t);
  }, [state, code]);

  const start = () => {
    const c = newCode();
    try {
      localStorage.setItem(KEY, c);
    } catch {}
    setCode(c);
  };

  const join = async () => {
    const c = entry.trim().toLowerCase();
    setStatus("Loading…");
    try {
      const res = await fetch(`/api/voyage/${encodeURIComponent(c)}`);
      const data = await res.json();
      if (!res.ok) return setStatus(data.error ?? "Couldn't load that voyage");
      skipNext.current = true;
      onLoad({ courses: data.courses ?? [], events: data.events ?? [], sessions: data.sessions ?? [], plan: data.plan ?? undefined });
      try {
        localStorage.setItem(KEY, c);
      } catch {}
      setCode(c);
      setEntry("");
      setStatus("Loaded from the cloud");
    } catch {
      setStatus("Couldn't reach the server");
    }
  };

  return (
    <section className="panel small">
      <h3 style={{ fontSize: 17, marginBottom: 4 }}>Take it with you</h3>
      {code ? (
        <>
          <p className="muted" style={{ margin: "0 0 6px" }}>Your voyage code. Enter it on your phone or laptop to pick up where you left off.</p>
          <div className="row">
            <code style={{ fontSize: 16, fontWeight: 600 }}>{code}</code>
            <button className="btn small ghost" onClick={() => navigator.clipboard?.writeText(code).then(() => setStatus("Copied"), () => {})}>Copy</button>
          </div>
          <div className="tiny muted" style={{ marginTop: 4 }}>{status}</div>
        </>
      ) : (
        <>
          <p className="muted" style={{ margin: "0 0 6px" }}>Save your courses, deadlines and study plan to the cloud and open them anywhere.</p>
          <button className="btn small primary" onClick={start}>Save to cloud</button>
        </>
      )}
      <div className="row" style={{ marginTop: 8 }}>
        <input value={entry} onChange={(e) => setEntry(e.target.value)} placeholder="ithaca-x7k2m9" aria-label="Voyage code" style={{ flex: 1, minWidth: 0, border: "1px solid var(--line)", borderRadius: 8, padding: "4px 8px", background: "var(--bg)" }} />
        <button className="btn small" disabled={!entry.trim()} onClick={join}>Open</button>
      </div>
      {!code && status && <div className="tiny muted" style={{ marginTop: 4 }}>{status}</div>}
    </section>
  );
}
