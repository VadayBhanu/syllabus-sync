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
          <Flame /> Ask Blaze
        </button>
      )}
      {open && (
        <aside className="blaze" role="dialog" aria-label="Blaze study assistant">
          <header className="blaze-head">
            <Flame />
            <div className="grow">
              <b>Blaze</b>
              <div className="tiny muted">{online ? "Answers from your syllabi, powered by Gemini" : "Offline mode: deadlines and syllabus search"}</div>
            </div>
            {msgs.length > 0 && <button className="btn ghost small" onClick={() => setMsgs([])}>New chat</button>}
            <button className="btn ghost small" onClick={() => setOpen(false)} aria-label="Close Blaze">×</button>
          </header>

          <div className="blaze-body" ref={scroller} aria-live="polite">
            {msgs.length === 0 && (
              <div className="small">
                <p style={{ marginTop: 0 }}>
                  Hey, I&apos;m Blaze. Ask me anything about your {courses.length ? `${courses.length} course${courses.length > 1 ? "s" : ""}` : "courses"}: grading, policies,
                  office hours, what&apos;s due. I only answer from your syllabi and show you the line I got it from.
                </p>
                {!courses.length && <p className="muted">Upload a syllabus first so I have something to read.</p>}
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={`bubble from-${m.role}`}>
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
            ))}
            {busy && <div className="bubble from-blaze muted">Blaze is reading your syllabi…</div>}
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

function Flame() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2c1 4 5 5.5 5 11a5 5 0 0 1-10 0c0-2.5 1.2-4 2.5-5 .2 2 1 3 2 3.5C11 9 11 5 12 2z" fill="#e8743b" />
      <path d="M12 12c.6 1.8 2.5 2.4 2.5 4.6a2.5 2.5 0 0 1-5 0c0-1.3.7-2.1 1.4-2.6.2.8.6 1.2 1.1 1.4-.2-1.1-.3-2.2 0-3.4z" fill="#f6c453" />
    </svg>
  );
}
