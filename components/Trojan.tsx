"use client";

import { useEffect, useRef, useState } from "react";
import type { Course, SyllabusEvent } from "@/lib/types";
import type { StudySession } from "@/lib/plan";
import { fromUiString, parseCommand, type UiCommand } from "@/lib/commands";
import { buildContext, checkCitations, offlineAnswer, type TrojanAction, type TrojanMessage } from "@/lib/blaze";

interface Props {
  courses: Course[];
  events: SyllabusEvent[];
  sessions: StudySession[];
  online: boolean;
  dailyMinutes: number;
  /** apply one confirmed action; returns an error message if it couldn't */
  onAction: (a: TrojanAction) => string | undefined;
  /** run an app command (theme, navigation, timer...) and return what to say */
  onCommand?: (c: UiCommand) => string;
}

const STARTERS = [
  "What do I need to do this week?",
  "How is my grade calculated in each class?",
  "Plan my study time for the next 3 days",
  "When and where is my next exam?",
];

export default function Trojan({ courses, events, sessions, online, dailyMinutes, onAction, onCommand }: Props) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<TrojanMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  // Voice: browser speech recognition to ask, speech synthesis to answer. No keys needed.
  const [speak, setSpeak] = useState(false);
  const [listening, setListening] = useState(false);
  const [canListen, setCanListen] = useState(false);
  const recog = useRef<SpeechRec | null>(null);
  const speakRef = useRef(false);
  speakRef.current = speak;
  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
    setCanListen(!!(w.SpeechRecognition || w.webkitSpeechRecognition));
  }, []);

  function say(text: string) {
    try {
      if (!("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text.replace(/[•“”]/g, "").slice(0, 600));
      u.rate = 1.03;
      window.speechSynthesis.speak(u);
    } catch {}
  }

  function listen() {
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
    const R = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!R) return;
    if (listening) {
      recog.current?.stop();
      return;
    }
    const r = new R();
    r.lang = "en-US";
    r.interimResults = true;
    r.onresult = (e) => {
      const res = e.results[e.results.length - 1];
      const t = res[0].transcript;
      setInput(t);
      if (res.isFinal) {
        r.stop();
        setSpeak(true);
        ask(t);
      }
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    recog.current = r;
    setListening(true);
    r.start();
  }
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

  // Other parts of the app (e.g. "Quiz me" on a learning topic) can open Trojan with a question.
  const askRef = useRef<(q: string) => void>(() => {});
  useEffect(() => {
    const onAsk = (e: Event) => {
      const q = (e as CustomEvent<string>).detail;
      if (typeof q !== "string" || !q.trim()) return;
      setOpen(true);
      setTimeout(() => askRef.current(q), 50);
    };
    window.addEventListener("blaze:ask", onAsk);
    return () => window.removeEventListener("blaze:ask", onAsk);
  }, []);

  async function ask(q: string) {
    const question = q.trim();
    if (!question || busy) return;
    const history: TrojanMessage[] = [...msgs, { role: "user", text: question }];
    setMsgs(history);
    setInput("");
    setBusy(true);
    let reply: TrojanMessage;
    // app commands ("dark mode", "open the oracle", "plan my day") run here, instantly and offline
    const cmd = onCommand ? parseCommand(question, courses.map((c) => c.code)) : null;
    if (cmd && onCommand) {
      reply = { role: "blaze", text: onCommand(cmd) };
    } else if (!online) {
      reply = offlineAnswer(question, courses, events);
    } else {
      try {
        const res = await fetch("/api/blaze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: history.map((m) => ({ role: m.role, text: m.text })),
            context: buildContext(courses, events, sessions, new Date(), dailyMinutes),
          }),
        });
        const data = await res.json();
        if (res.ok) {
          reply = {
            role: "blaze",
            text: data.answer,
            citations: checkCitations(data.citations ?? [], courses),
            followUps: data.followUps,
            actions: (data.actions ?? [])
              .filter((a: TrojanAction) => a?.type && a?.summary)
              .map((a: TrojanAction) => {
                // UI commands are harmless, so they run now; data changes wait for Apply
                if (a.type !== "ui") return { ...a, status: "pending" as const };
                const c = fromUiString(a.command ?? "");
                if (!c || !onCommand) return { ...a, status: "failed" as const, error: "unknown command" };
                onCommand(c);
                return { ...a, status: "applied" as const };
              }),
          };
        } else {
          reply = { ...offlineAnswer(question, courses, events), text: `${data.error ?? "Trojan is offline."} Here's what I can find on my own:\n\n${offlineAnswer(question, courses, events).text}` };
        }
      } catch {
        reply = offlineAnswer(question, courses, events);
      }
    }
    setMsgs((m) => [...m, reply]);
    if (speakRef.current) say(reply.text + (reply.actions?.length ? " I've lined up some changes for you to confirm." : ""));
    setBusy(false);
  }

  const last = msgs[msgs.length - 1];

  // Apply (or skip) one of Trojan's proposed changes, or all pending ones in a message.
  function resolve(mi: number, which: number | "all", apply: boolean) {
    setMsgs((ms) =>
      ms.map((m, i) => {
        if (i !== mi || !m.actions) return m;
        const actions = m.actions.map((a, k) => {
          if ((which !== "all" && k !== which) || a.status !== "pending") return a;
          if (!apply) return { ...a, status: "skipped" as const };
          const err = onAction(a);
          return err ? { ...a, status: "failed" as const, error: err } : { ...a, status: "applied" as const };
        });
        return { ...m, actions };
      }),
    );
  }

  askRef.current = ask;
  return (
    <>
      {!open && (
        <button className="blaze-fab" onClick={() => setOpen(true)} aria-label="Ask Trojan, your study assistant">
          <Horse /> Ask Trojan
        </button>
      )}
      {open && (
        <aside className="blaze" role="dialog" aria-label="Trojan study assistant">
          <header className="blaze-head">
            <Horse />
            <div className="grow">
              <b>Trojan</b>
              <div className="tiny muted">{online ? "The wooden horse with your answers inside · Gemini" : "Offline mode: deadlines and syllabus search"}</div>
            </div>
            <button
              className="btn ghost small"
              aria-pressed={speak}
              title={speak ? "Trojan reads answers aloud" : "Turn on spoken answers"}
              onClick={() => {
                if (speak) window.speechSynthesis?.cancel();
                setSpeak(!speak);
              }}
            >
              {speak ? "🔊" : "🔈"}
            </button>
            {msgs.length > 0 && <button className="btn ghost small" onClick={() => setMsgs([])}>New chat</button>}
            <button className="btn ghost small" onClick={() => setOpen(false)} aria-label="Close Trojan">×</button>
          </header>

          <div className="blaze-body" ref={scroller} aria-live="polite">
            {msgs.length === 0 && (
              <div className="small">
                <p style={{ marginTop: 0 }}>
                  I&apos;m Trojan, the wooden horse. The Greeks hid soldiers inside me; you&apos;ve hidden answers inside your{" "}
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
                {m.actions && m.actions.length > 0 && (
                  <div className="actions">
                    <div className="tiny muted">Trojan wants to make {m.actions.length === 1 ? "this change" : `${m.actions.length} changes`}. Nothing happens until you apply.</div>
                    {m.actions.map((a, k) => (
                      <div key={k} className={`action ${a.status}`}>
                        <span className="grow">{a.summary}</span>
                        {a.status === "pending" ? (
                          <>
                            <button className="btn small primary" onClick={() => resolve(i, k, true)}>Apply</button>
                            <button className="btn small ghost" onClick={() => resolve(i, k, false)}>Skip</button>
                          </>
                        ) : (
                          <span className="tiny">{a.status === "applied" ? "✓ Done" : a.status === "skipped" ? "Skipped" : `Couldn't: ${a.error}`}</span>
                        )}
                      </div>
                    ))}
                    {m.actions.filter((a) => a.status === "pending").length > 1 && (
                      <button className="btn small" onClick={() => resolve(i, "all", true)}>Apply all</button>
                    )}
                  </div>
                )}
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
                aria-label="Message Trojan"
                className="blaze-input"
              />
              {canListen && (
                <button type="button" className={`btn ${listening ? "listening" : ""}`} onClick={listen} aria-label={listening ? "Stop listening" : "Ask Trojan out loud"} title="Ask out loud">
                  {listening ? "● Listening" : "🎙"}
                </button>
              )}
              <button className="btn primary" disabled={!input.trim() || busy}>Send</button>
            </form>
          </div>
        </aside>
      )}
    </>
  );
}

/** Trojan is a wooden horse on wheels, with a little hatch where the answers hide. Original artwork. */
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

interface SpeechRec {
  lang: string;
  interimResults: boolean;
  onresult: ((e: { results: { isFinal: boolean; 0: { transcript: string } }[] & { length: number } }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}
