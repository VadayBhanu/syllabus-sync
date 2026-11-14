"use client";

// The Oracle: Odysseus went to the underworld to ask Tiresias what lay ahead.
// Students ask a simpler question: what do I need on the rest of this class?

import { useEffect, useMemo, useState } from "react";
import type { Course } from "@/lib/types";
import { LETTERS, oracle, parseGrading, type GradeCategory } from "@/lib/grades";

const KEY = "syllabus-sync:oracle";

interface Saved {
  cats?: GradeCategory[];
  scores: Record<string, number | undefined>;
  target: number;
}

function loadAll(): Record<string, Saved> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") ?? {};
  } catch {
    return {};
  }
}

const letter = (g: number) => LETTERS.find(([, min]) => g >= min)?.[0] ?? "F";

export default function Oracle({ courses }: { courses: Course[] }) {
  const graded = courses.filter((c) => c.text);
  const [courseId, setCourseId] = useState(graded[0]?.id ?? courses[0]?.id ?? "");
  const [all, setAll] = useState<Record<string, Saved>>({});
  const [whatIf, setWhatIf] = useState(85);

  useEffect(() => setAll(loadAll()), []);
  const course = courses.find((c) => c.id === courseId);
  const parsed = useMemo(() => parseGrading(course?.text ?? ""), [course]);
  const saved: Saved = all[courseId] ?? { scores: {}, target: 90 };
  const cats = saved.cats ?? parsed;

  const update = (patch: Partial<Saved>) => {
    const next = { ...all, [courseId]: { ...saved, ...patch } };
    setAll(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
  };

  const r = oracle(cats, saved.scores, saved.target);
  const total = cats.reduce((t, c) => t + c.weight, 0);
  const earned = cats.reduce((t, c) => {
    const sc = saved.scores[c.name];
    return typeof sc === "number" ? t + (sc / 100) * c.weight : t;
  }, 0);
  const projected = total ? (earned + (whatIf / 100) * r.remainingWeight) / total * 100 : 0;

  let verdict: { text: string; tone: "ok" | "warn" | "danger" };
  if (!cats.length) verdict = { text: "Add your grading categories below and I'll tell you what you need.", tone: "warn" };
  else if (r.needed === null) verdict = { text: `Everything's graded. You finished with ${r.projected}% (${letter(r.projected ?? 0)}).`, tone: "ok" };
  else if (r.needed <= 0) verdict = { text: `You've already locked in the ${letter(saved.target)}. Even a zero on the rest keeps it.`, tone: "ok" };
  else if (r.needed > 100)
    verdict = { text: `Even the gods can't get you to ${saved.target}% now: you'd need ${r.needed}% on the remaining ${r.remainingWeight}%. Aim one letter lower.`, tone: "danger" };
  else
    verdict = {
      text: `To finish with ${saved.target}% (${letter(saved.target)}), you need to average ${r.needed}% on the remaining ${r.remainingWeight}% of the grade.`,
      tone: r.needed > 90 ? "warn" : "ok",
    };

  if (!courses.length) return <section className="panel"><p className="muted">Import a syllabus first.</p></section>;

  return (
    <section className="panel stack" style={{ gap: 14 }}>
      <div className="row">
        <h3 style={{ fontSize: 20 }} className="grow">The Oracle</h3>
        <select className="btn small" value={courseId} onChange={(e) => setCourseId(e.target.value)} aria-label="Course">
          {courses.map((c) => <option key={c.id} value={c.id}>{c.code}</option>)}
        </select>
        <select className="btn small" value={saved.target} onChange={(e) => update({ target: +e.target.value })} aria-label="Target grade">
          {LETTERS.map(([l, v]) => <option key={l} value={v}>Aim for {l} ({v}%)</option>)}
        </select>
      </div>
      <p className="muted small" style={{ margin: 0 }}>
        Tiresias told Odysseus what lay ahead. The Oracle tells you what you need on the rest of the class, using the grade weights from your syllabus.
      </p>

      <div className={`oracle-verdict ${verdict.tone}`} role="status">
        {r.current !== null && <div className="oracle-now">{r.current}%<span> so far ({letter(r.current)})</span></div>}
        <div>{verdict.text}</div>
      </div>

      <table className="oracle-table">
        <thead>
          <tr><th>Category</th><th>Weight</th><th>Your score %</th><th /></tr>
        </thead>
        <tbody>
          {cats.map((c, i) => (
            <tr key={c.name + i}>
              <td>{saved.cats ? <input className="textin" value={c.name} onChange={(e) => update({ cats: cats.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)) })} aria-label="Category name" /> : c.name}</td>
              <td>
                {saved.cats ? (
                  <input className="textin num" inputMode="decimal" value={c.weight} onChange={(e) => update({ cats: cats.map((x, k) => (k === i ? { ...x, weight: Math.max(0, +e.target.value || 0) } : x)) })} aria-label="Weight" />
                ) : `${c.weight}%`}
              </td>
              <td>
                <input
                  className="textin num"
                  inputMode="decimal"
                  placeholder="not yet"
                  value={saved.scores[c.name] ?? ""}
                  onChange={(e) => {
                    const v = e.target.value.trim();
                    const n = Number(v);
                    update({ scores: { ...saved.scores, [c.name]: v === "" || isNaN(n) ? undefined : Math.max(0, Math.min(120, n)) } });
                  }}
                  aria-label={`${c.name} score`}
                />
              </td>
              <td>{saved.cats && <button className="btn ghost small danger" onClick={() => update({ cats: cats.filter((_, k) => k !== i) })} aria-label="Remove">×</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="row small">
        <span className="muted grow">
          {parsed.length && !saved.cats ? `Read from the ${course?.code} syllabus.` : saved.cats ? "Edited by you." : "No breakdown found in this syllabus."}
          {total && Math.abs(total - 100) > 0.5 ? ` Weights add up to ${total}%.` : ""}
        </span>
        <button className="btn small" onClick={() => update({ cats: [...cats, { name: `Category ${cats.length + 1}`, weight: 10 }] })}>+ Category</button>
        {saved.cats && parsed.length > 0 && <button className="btn small ghost" onClick={() => update({ cats: undefined })}>Use syllabus weights</button>}
      </div>

      {r.remainingWeight > 0 && cats.length > 0 && (
        <div className="stack" style={{ gap: 6 }}>
          <label className="small">
            What if I average <b>{whatIf}%</b> on the rest?
            <input type="range" min={40} max={100} value={whatIf} onChange={(e) => setWhatIf(+e.target.value)} style={{ width: "100%" }} />
          </label>
          <div className="small">
            Final grade: <b style={{ fontSize: 18 }}>{Math.round(projected * 10) / 10}%</b> ({letter(projected)})
          </div>
        </div>
      )}
    </section>
  );
}
