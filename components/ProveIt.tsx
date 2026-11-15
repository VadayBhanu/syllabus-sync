"use client";

import { useState } from "react";
import type { SyllabusEvent } from "@/lib/types";
import { selfCheck } from "@/lib/learn";

const STATIC_PREVIEW = process.env.NEXT_PUBLIC_STATIC === "1";

interface Props {
  event: SyllabusEvent;
  ai?: boolean;
  onPass: (proof: NonNullable<SyllabusEvent["proof"]>) => void;
  onClose: () => void;
}

type Verdict = { verdict: "pass" | "almost" | "not_yet"; feedback: string; followUp?: string };

// The gate in front of "done": explain it back in your own words before the topic counts.
export default function ProveIt({ event, ai, onPass, onClose }: Props) {
  const isProject = event.kind === "project";
  const [answer, setAnswer] = useState("");
  const [link, setLink] = useState("");
  const [pasted, setPasted] = useState(0);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [result, setResult] = useState<Verdict | null>(null);
  const [tries, setTries] = useState(0);
  const graded = ai && !STATIC_PREVIEW && !isProject;
  const words = answer.trim().split(/\s+/).filter(Boolean).length;

  const full = () => (isProject ? `${link.trim()}\n${answer.trim()}` : answer.trim());

  async function submit() {
    setProblem(null);
    const p = selfCheck(answer, { pastedChars: pasted, isProject, link });
    if (p) return setProblem(p);
    if (!graded) {
      onPass({ answer: full(), verdict: "self", at: new Date().toISOString() });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: event.title, goal: event.goal, question: event.check, answer }),
      });
      const data = await res.json();
      if (!res.ok) {
        setProblem(`${data.error ?? "Couldn't check that."} You can try again, or tick it as self-checked.`);
        setTries((t) => t + 2);
        return;
      }
      setResult(data);
      setTries((t) => t + 1);
      if (data.verdict === "pass") onPass({ answer: full(), verdict: "pass", feedback: data.feedback, at: new Date().toISOString() });
    } catch {
      setProblem("Couldn't reach the tutor. You can tick it as self-checked.");
      setTries((t) => t + 2);
    } finally {
      setBusy(false);
    }
  }

  const quiz = () => {
    window.dispatchEvent(new CustomEvent("blaze:ask", { detail: `Quiz me on "${event.title}" with one question at a time. Don't give me the answers until I try.` }));
    onClose();
  };

  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="panel modal stack prove" role="dialog" aria-modal="true" aria-label={`Prove it: ${event.title}`} style={{ gap: 10 }}>
        <div>
          <div className="tiny muted">Prove it before you tick it</div>
          <h3 style={{ margin: "2px 0 0" }}>{event.title}</h3>
        </div>
        <div className="prove-q">{event.check}</div>
        {isProject && (
          <input className="textin" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://github.com/you/project or a live demo" aria-label="Project link" />
        )}
        <textarea
          className="paste"
          style={{ minHeight: 140 }}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onPaste={(e) => setPasted((n) => n + e.clipboardData.getData("text").length)}
          placeholder={isProject ? "What was the hardest decision, and what would you change?" : "Explain it like you're teaching a classmate. Use your own example."}
          aria-label="Your answer"
          autoFocus
        />
        <div className="tiny muted">
          {words} words · {graded ? "Gemini reads it like a tutor: it points out gaps but won't give you the answer." : "Self-check: be honest with yourself, it's your learning."}
        </div>
        {problem && <div className="notice warn small">{problem}</div>}
        {result && (
          <div className={`notice small ${result.verdict === "pass" ? "ok" : "warn"}`}>
            <b>{result.verdict === "pass" ? "You've got it." : result.verdict === "almost" ? "Almost there." : "Not yet."}</b> {result.feedback}
            {result.followUp && result.verdict !== "pass" && <div style={{ marginTop: 6 }}><i>Think about: {result.followUp}</i></div>}
          </div>
        )}
        <div className="row">
          <button className="btn primary small" disabled={busy || !answer.trim()} onClick={submit}>
            {busy ? "Checking…" : graded ? (result ? "Check again" : "Check my answer") : "Tick it off"}
          </button>
          <button className="btn small" onClick={quiz} title="Practise with Trojan first">Quiz me with Trojan</button>
          <span className="grow" />
          {graded && tries >= 2 && answer.trim() && (
            <button className="btn ghost small" onClick={() => onPass({ answer: full(), verdict: "self", feedback: result?.feedback, at: new Date().toISOString() })}>
              Tick as self-checked
            </button>
          )}
          <button className="btn ghost small" onClick={onClose}>Later</button>
        </div>
      </div>
    </div>
  );
}
