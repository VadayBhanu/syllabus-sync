"use client";

// The star chart: concepts are stars, prerequisites are the lines between them.
// Gold = you know it, dim gold = taught but never checked, orange = suspected gap,
// red = confirmed gap, blue = ready to learn next, grey = not reachable yet.

import { useEffect, useMemo, useState } from "react";
import type { Course, SyllabusEvent } from "@/lib/types";
import type { StudySession } from "@/lib/plan";
import { fmtMinutes } from "@/lib/plan";
import { addDays, prettyDate } from "@/lib/dates";
import { grade, mapFor, masteryOf, prerequisites, rootGaps, startOfMap, suspectsFrom, type KnowledgeState, type Mastery } from "@/lib/knowledge";
import { ResLink } from "./LearnPath";

interface Props {
  courses: Course[];
  events: SyllabusEvent[];
  today: string;
  /** set when Trojan opened this after a bad quiz */
  failedHint?: { score?: number } | null;
  onPractice: (sessions: Omit<StudySession, "id">[]) => void;
  onMessy?: () => void;
}

const KEY = "syllabus-sync:knowledge:";
const LABEL: Record<Mastery, string> = { known: "Known (checked)", covered: "Taught, not checked", suspect: "Suspected gap", gap: "Confirmed gap", next: "Learn next", locked: "Not yet" };

export default function KnowledgeMap({ courses, events, today, failedHint, onPractice, onMessy }: Props) {
  const course = courses.find((c) => mapFor(c.code));
  const map = course ? mapFor(course.code)! : null;
  const [state, setState] = useState<KnowledgeState>(() => (map ? startOfMap(map) : { status: {} }));
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(failedHint?.score ?? 52);
  const [q, setQ] = useState(0);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!map || !course) return;
    try {
      const v = JSON.parse(localStorage.getItem(KEY + course.code) ?? "null");
      if (v?.status) setState(v);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course?.code]);
  useEffect(() => {
    if (!course) return;
    try {
      localStorage.setItem(KEY + course.code, JSON.stringify(state));
    } catch {}
  }, [state, course]);

  const mastery = useMemo(() => (map ? masteryOf(map, state, today) : {}), [map, state, today]);
  if (!map || !course) {
    return (
      <section className="panel">
        <h3 style={{ fontSize: 18 }}>Star chart</h3>
        <p className="muted small">The star chart maps what you know, where you&apos;re struggling, and what to learn next. In this build it&apos;s charted for CSE 3320 Operating Systems (concurrency).</p>
        {onMessy && <button className="btn small primary" onClick={onMessy}>Load the 5-syllabus semester</button>}
      </section>
    );
  }

  const concept = (id: string) => map.concepts.find((c) => c.id === id)!;
  const quiz = map.assessments.find((a) => a.id === "quiz4")!;
  const quizEvent = events.find((e) => e.courseId === course.id && quiz.match.test(e.title));
  const diag = state.diagnostic ?? [];
  const inDiag = diag.length > 0 && !state.failed?.id.endsWith(":graded");
  const graded = state.failed?.id.endsWith(":graded");
  const roots = graded ? rootGaps(map, state) : [];
  const gaps = map.concepts.filter((c) => state.status[c.id] === "gap");
  const next = map.concepts.filter((c) => mastery[c.id] === "next");
  const nextExam = events.filter((e) => e.courseId === course.id && !e.done && e.date > today && (e.kind === "exam" || e.kind === "quiz") && !quiz.match.test(e.title)).sort((a, b) => a.date.localeCompare(b.date))[0];

  const failQuiz = () => {
    const base = startOfMap(map);
    const sus = suspectsFrom(map, quiz, base);
    const status = { ...base.status };
    for (const id of sus) status[id] = "suspect";
    setState({ status, failed: { id: quiz.id, score }, diagnostic: sus, answers: {} });
    setQ(0);
    setAdded(false);
    setPicked(null);
  };
  const answer = (id: string, i: number) => setState((s) => ({ ...s, answers: { ...(s.answers ?? {}), [id]: i } }));
  const finish = () => setState((s) => ({ ...grade(s, map), failed: { id: (s.failed?.id ?? quiz.id) + ":graded", score: s.failed?.score ?? score } }));
  const reset = () => {
    setState(startOfMap(map));
    setQ(0);
    setAdded(false);
  };

  const assign = () => {
    const order = [...roots, ...gaps.map((g) => g.id).filter((id) => !roots.includes(id))];
    const target = nextExam ?? quizEvent;
    onPractice(
      order.map((id, i) => ({
        eventId: target?.id ?? "",
        courseId: course.id,
        date: addDays(today, i + 1),
        minutes: concept(id).practice.minutes,
        label: `Practice: ${concept(id).label} (${concept(id).practice.task})`,
        pinned: true,
      })),
    );
    setAdded(true);
  };

  const sel = picked ? concept(picked) : null;
  const W = 640;
  const H = 400;
  const px = (x: number) => 30 + (x / 100) * (W - 60);
  const py = (y: number) => 30 + (y / 100) * (H - 60);

  return (
    <section className="panel stack" style={{ gap: 12 }}>
      <div className="row">
        <div className="grow">
          <h3 style={{ fontSize: 18 }}>Star chart: {course.code} {map.title}</h3>
          <div className="muted tiny">Odysseus steered by the stars. These are yours: what you know, where you&apos;re lost, and the next star to steer for.</div>
        </div>
        {(state.failed || Object.keys(state.status).length > 1) && <button className="btn ghost small" onClick={reset}>Reset chart</button>}
      </div>

      <div className="kgrid">
        <svg viewBox={`0 0 ${W} ${H}`} className="kmap" role="img" aria-label="Knowledge map">
          <rect width={W} height={H} rx="14" className="ksky" />
          {Array.from({ length: 40 }, (_, i) => (
            <circle key={i} cx={(i * 97) % W} cy={(i * 53) % H} r={i % 3 ? 0.8 : 1.3} className="kdust" />
          ))}
          {map.concepts.flatMap((c) =>
            c.needs.map((n) => {
              const a = concept(n);
              const hot = (mastery[c.id] === "gap" || mastery[c.id] === "suspect") && (mastery[n] === "gap" || mastery[n] === "suspect");
              return <line key={c.id + n} x1={px(a.x)} y1={py(a.y)} x2={px(c.x)} y2={py(c.y)} className={`kline ${hot ? "hot" : ""} ${mastery[c.id] === "locked" ? "dim" : ""}`} />;
            }),
          )}
          {map.concepts.map((c) => {
            const m = mastery[c.id];
            const root = roots.includes(c.id);
            return (
              <g key={c.id} className={`kstar k-${m} ${picked === c.id ? "picked" : ""} ${root ? "root" : ""}`} transform={`translate(${px(c.x)},${py(c.y)})`} onClick={() => setPicked(c.id)} style={{ cursor: "pointer" }}>
                {root && <circle r="24" className="kring" />}
                <circle r={m === "locked" ? 7 : 11} className="kdot" />
                {m === "known" && <path d="M-4 0 L-1 3 L5 -4" className="ktick" />}
                {m === "gap" && <text y="4" textAnchor="middle" className="kmark">!</text>}
                {m === "suspect" && <text y="4" textAnchor="middle" className="kmark">?</text>}
                <text y={m === "locked" ? 20 : 26} textAnchor="middle" className="klabel">{c.label}</text>
              </g>
            );
          })}
        </svg>

        <div className="stack" style={{ gap: 10 }}>
          <div className="klegend tiny">
            {(["known", "covered", "suspect", "gap", "next", "locked"] as Mastery[]).map((m) => (
              <span key={m}><i className={`kswatch k-${m}`} /> {LABEL[m]}</span>
            ))}
          </div>

          {!state.failed && (
            <div className="kcard">
              <b>How did a quiz go?</b>
              <div className="small muted">Log a bad result and I&apos;ll work out which concept is really missing before assigning practice.</div>
              <div className="row small" style={{ gap: 6, marginTop: 6 }}>
                {quiz.title}{quizEvent ? ` (${prettyDate(quizEvent.date, false)})` : ""}:
                <input type="number" min={0} max={100} value={score} onChange={(e) => setScore(Number(e.target.value))} style={{ width: 56 }} aria-label="Score" />%
                <button className="btn small primary" onClick={failQuiz}>It went badly</button>
              </div>
            </div>
          )}

          {inDiag && (
            <div className="kcard">
              {q === 0 && Object.keys(state.answers ?? {}).length === 0 && (
                <div className="small" style={{ marginBottom: 8 }}>
                  {quiz.title} at <b>{state.failed?.score}%</b> covered {quiz.covers.map((id) => concept(id).label).join(", ")}. Any of the {diag.length} orange stars could be the real gap, including the ones underneath. Instead of drilling all of them, answer {diag.length} quick questions (about 2 minutes).
                </div>
              )}
              {(() => {
                const id = diag[q];
                const c = concept(id);
                const a = state.answers?.[id];
                return (
                  <div className="stack" style={{ gap: 6 }}>
                    <div className="tiny muted">Check {q + 1} of {diag.length} · {c.label}</div>
                    <b className="small">{c.question.q}</b>
                    {c.question.options.map((o, i) => (
                      <button
                        key={i}
                        className={`btn small kopt ${a === undefined ? "" : i === c.question.answer ? "right" : a === i ? "wrong" : ""}`}
                        disabled={a !== undefined}
                        onClick={() => answer(id, i)}
                      >
                        {o}
                      </button>
                    ))}
                    {a !== undefined && <div className="tiny">{a === c.question.answer ? "✓ " : "✗ "}{c.question.explain}</div>}
                    {a !== undefined && (q < diag.length - 1 ? <button className="btn small primary" onClick={() => setQ(q + 1)}>Next</button> : <button className="btn small primary" onClick={finish}>See my real gap</button>)}
                  </div>
                );
              })()}
            </div>
          )}

          {graded && (
            <div className="kcard">
              {roots.length ? (
                <>
                  <b>The real gap: {roots.map((id) => concept(id).label).join(" and ")}</b>
                  <div className="small" style={{ marginTop: 4 }}>
                    {(() => {
                      const above = gaps.filter((g) => !roots.includes(g.id)).map((g) => g.label);
                      const cleared = diag.filter((id) => state.status[id] === "known").map((id) => concept(id).label);
                      return (
                        <>
                          {above.length ? `${above.join(" and ")} ${above.length > 1 ? "look" : "looks"} shaky too, but ${above.length > 1 ? "they sit" : "it sits"} on top of ${roots.map((id) => concept(id).label).join(" and ")}. Fix the foundation first. ` : ""}
                          {cleared.length ? `You showed you know ${cleared.join(", ")}, so no practice there.` : ""}
                        </>
                      );
                    })()}
                  </div>
                  <div className="stack" style={{ gap: 6, marginTop: 8 }}>
                    {[...roots, ...gaps.map((g) => g.id).filter((id) => !roots.includes(id))].map((id, i) => (
                      <div key={id} className="small">
                        <b>{i + 1}. {concept(id).label}</b> <span className="muted tiny">{fmtMinutes(concept(id).practice.minutes)}</span>
                        <div className="tiny">{concept(id).practice.task}</div>
                        <div className="row" style={{ gap: 4, marginTop: 2 }}>{concept(id).practice.links.map((r) => <ResLink key={r.url} r={r} />)}</div>
                      </div>
                    ))}
                  </div>
                  <button className="btn small primary" style={{ marginTop: 8 }} disabled={added} onClick={assign}>
                    {added ? "✓ Added to your work plan" : `Add this practice to my work plan${nextExam ? `, before ${nextExam.title} (${prettyDate(nextExam.date, false)})` : ""}`}
                  </button>
                </>
              ) : (
                <>
                  <b>No real gap found</b>
                  <div className="small">You answered every check correctly, so the quiz was probably a bad day, not a missing concept. Review your quiz mistakes once and move on.</div>
                </>
              )}
            </div>
          )}

          {next.length > 0 && (
            <div className="kcard">
              <b>Learn next</b>
              <div className="small">{next.map((c) => `${c.label} (taught ${prettyDate(c.taught, false)})`).join(", ")}. {roots.length ? "Once the gap above is fixed." : "Everything it needs is in place."}</div>
            </div>
          )}

          {sel && (
            <div className="kcard">
              <b>{sel.label}</b> <span className={`pill k-${mastery[sel.id]}`}>{LABEL[mastery[sel.id]]}</span>
              <div className="tiny muted">Taught {prettyDate(sel.taught, false)}{sel.needs.length ? ` · builds on ${sel.needs.map((n) => concept(n).label).join(", ")}` : ""}</div>
              {prerequisites(map, [sel.id]).length > 0 && <div className="tiny">Underneath it: {prerequisites(map, [sel.id]).map((n) => concept(n).label).join(" → ")}</div>}
              <div className="tiny" style={{ marginTop: 4 }}>Practice: {sel.practice.task}</div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
