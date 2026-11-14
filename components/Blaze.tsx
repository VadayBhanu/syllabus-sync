"use client";

import { useEffect, useRef, useState } from "react";
import type { Course, SyllabusEvent } from "@/lib/types";
import type { StudySession } from "@/lib/plan";
import { buildContext, checkCitations, offlineAnswer, type BlazeMessage } from "@/lib/blaze";

interface Props {
  courses: Course[];
  events: SyllabusEvent[];
  sessions: StudySession[];
  online: boolean;
}

const STARTERS = [
  "What do I need to do this week?",
  "How is my grade calculated in each class?",
  "What's the late work policy?",
  "When and where is my next exam?",
];

export default function Blaze({ courses, events, sessions, online }: Props) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<BlazeMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [msgs, busy]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function ask(q: string) {
    const question = q.trim();
    if (!question || busy) return;
    const history: BlazeMessage[] = [...msgs, { role: "user", text: question }];
    setMsgs(history);
    setInput("");
    setBusy(true);
    let reply: BlazeMessage;
    if (!online) {
      reply = offlineAnswer(question, courses, events);
    } else {
      try {
        const res = await fetch("/api/blaze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: history.map((m) => ({ role: m.role, text: m.text })),
            context: buildContext(courses, events, sessions),
          }),
        });
        const data = await res.json();
        if (res.ok) {
          reply = { role: "blaze", text: data.answer, citations: checkCitations(data.citations ?? [], courses), followUps: data.followUps };
        } else {
          reply = { ...offlineAnswer(question, courses, events), text: `${data.error ?? "Blaze is offline."} Here's what I can find on my own:\n\n${offlineAnswer(question, courses, events).text}` };
        }
      } catch {
        reply = offlineAnswer(question, courses, events);
      }
    }
    setMsgs((m) => [...m, reply]);
    setBusy(false);
  }

  const last = msgs[msgs.length - 1];

  return (
    <>
      {!open && (
        <button className="blaze-fab" onClick={() => setOpen(true)} aria-label="Ask Blaze, your study assistant">
          <Horse /> Ask Blaze
        </button>
      )}
      {open && (
        <aside className="blaze" role="dialog" aria-label="Blaze study assistant">
          <header className="blaze-head">
            <Horse />
            <div className="grow">
              <b>Blaze</b>
              <div className="tiny muted">{online ? "The wooden horse with your answers inside · Gemini" : "Offline mode: deadlines and syllabus search"}</div>
            </div>
            {msgs.length > 0 && <button className="btn ghost small" onClick={() => setMsgs([])}>New chat</button>}
            <button className="btn ghost small" onClick={() => setOpen(false)} aria-label="Close Blaze">×</button>
          </header>

          <div className="blaze-body" ref={scroller} aria-live="polite">
            {msgs.length === 0 && (
              <div className="small">
                <p style={{ marginTop: 0 }}>
                  I&apos;m Blaze, the wooden horse. The Greeks hid soldiers inside me; you&apos;ve hidden answers inside your{" "}
                  {courses.length ? `${courses.length} syllab${courses.length > 1 ? "i" : "us"}` : "syllabi"}. Ask about grading, policies, office hours or what&apos;s due, and I&apos;ll
                  open the hatch and show you the exact line each answer came from.
                </p>
                {!courses.length && <p className="muted">Upload a syllabus first so I have something to read.</p>}
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={`msg from-${m.role}`}>
                {m.role === "blaze" && <span className="avatar"><Horse size={22} /></span>}
              <div className={`bubble from-${m.role}`}>
                <div style={{ whiteSpace: "pre-wrap" }}>{m.text}</div>
                {m.citations && m.citations.length > 0 && (
                  <div className="cites">
                    {m.citations.map((c, k) => (
                      <div key={k} className={`cite ${c.verified ? "" : "unverified"}`} title={c.verified ? "Found in the syllabus" : "Couldn't find this exact line in the syllabus"}>
                        <span className="tiny"><b>{c.course}</b> {c.verified ? "✓" : "⚠ unverified"}</span>
                        <div>“{c.quote}”</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              </div>
            ))}
            {busy && <div className="bubble from-blaze muted">Opening the hatch…</div>}
          </div>

          <div className="blaze-foot">
            <div className="row" style={{ gap: 6, marginBottom: 8 }}>
              {(msgs.length === 0 ? STARTERS : !busy && last?.role === "blaze" ? last.followUps ?? [] : []).map((s) => (
                <button key={s} className="btn small" onClick={() => ask(s)}>{s}</button>
              ))}
            </div>
            <form
              className="row"
              style={{ flexWrap: "nowrap" }}
              onSubmit={(e) => {
                e.preventDefault();
                ask(input);
              }}
            >
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    ask(input);
                  }
                }}
                placeholder="Ask about any class…"
                aria-label="Message Blaze"
                className="blaze-input"
              />
              <button className="btn primary" disabled={!input.trim() || busy}>Send</button>
            </form>
          </div>
        </aside>
      )}
    </>
  );
}

/** Blaze is a wooden horse on wheels, with a little hatch where the answers hide. Original artwork. */
export function Horse({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path d="M7 14 Q2.5 15.5 3.5 21" fill="none" stroke="#7a4b22" strokeWidth="1.6" strokeLinecap="round" />
      <rect x="3" y="25" width="26" height="2.6" rx="1" fill="#7a4b22" />
      <circle cx="8" cy="28.6" r="2.1" fill="#4a2c12" />
      <circle cx="24" cy="28.6" r="2.1" fill="#4a2c12" />
      <circle cx="8" cy="28.6" r="0.7" fill="#c8894a" />
      <circle cx="24" cy="28.6" r="0.7" fill="#c8894a" />
      <rect x="8" y="18" width="2.6" height="7.2" fill="#a8703a" />
      <rect x="12.4" y="18" width="2.6" height="7.2" fill="#a8703a" />
      <rect x="18.6" y="18" width="2.6" height="7.2" fill="#a8703a" />
      <rect x="22.6" y="18" width="2.6" height="7.2" fill="#a8703a" />
      <path d="M21 13.5 L24.6 4.6 L28 5.8 L25.8 14 Z" fill="#c8894a" />
      <rect x="6" y="11.5" width="20.5" height="8.5" rx="3" fill="#c8894a" />
      <path d="M8 14 H24 M8 17.3 H24" stroke="#a8703a" strokeWidth="0.6" />
      <rect x="13" y="13.2" width="5.4" height="4.8" rx="0.6" fill="#f6c453" stroke="#4a2c12" strokeWidth="0.9" />
      <path d="M15.7 13.2 V18" stroke="#4a2c12" strokeWidth="0.6" />
      <path d="M24 3.8 L31 5.8 L30.4 9.2 L25.6 8.4 Z" fill="#c8894a" />
      <path d="M25 4.2 L25.8 1.2 L27.4 4.6 Z" fill="#a8703a" />
      <path d="M24.4 5 L21.6 12.6" stroke="#7a4b22" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="27.6" cy="6.2" r="0.7" fill="#2a1808" />
    </svg>
  );
}
