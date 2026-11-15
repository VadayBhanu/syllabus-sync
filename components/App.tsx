"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Course, ParseReport, SyllabusEvent } from "@/lib/types";
import { GRADED } from "@/lib/types";
import { parseSyllabus } from "@/lib/parser";
import { verifyAi } from "@/lib/verify";
import { icsGroupText, type IcsCourseGroup } from "@/lib/icsImport";
import type { ParseResult } from "@/lib/types";
import { findHazards } from "@/lib/conflicts";
import { buildIcs } from "@/lib/ics";
import { COURSE_COLORS, load, save, uid } from "@/lib/storage";
import { SAMPLES } from "@/lib/sample";
import Upload from "./Upload";
import NextUp from "./NextUp";
import VoyageMap from "./VoyageMap";
import CalendarView from "./CalendarView";
import EventList from "./EventList";
import EventEditor from "./EventEditor";
import Hazards from "./Hazards";
import WorkPlan from "./WorkPlan";
import CloudSync from "./CloudSync";
import Blaze from "./Blaze";
import MastMode from "./MastMode";
import Oracle from "./Oracle";
import Tour from "./Tour";
import LearnStart from "./LearnStart";
import LearnPath from "./LearnPath";
import { reschedule, trackToCourse } from "@/lib/learn";
import type { Track } from "@/lib/roadmaps";
import { applyAction } from "@/lib/actions";
import { buildPlan, type StudySession } from "@/lib/plan";
import { ymd } from "@/lib/dates";

type View = "voyage" | "learn" | "plan" | "oracle" | "calendar" | "list";

interface ImportNote {
  course: string;
  report: ParseReport;
  review: number;
}

export default function App() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [events, setEvents] = useState<SyllabusEvent[]>([]);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [view, setView] = useState<View>("voyage");
  const [editing, setEditing] = useState<SyllabusEvent | "new" | null>(null);
  const [notes, setNotes] = useState<ImportNote[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [ready, setReady] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [touring, setTouring] = useState(false);
  const [focus, setFocus] = useState<{ session: StudySession | null } | null>(null);
  const [planOpts, setPlanOpts] = useState({ dailyMinutes: 180, weekends: true });
  const [server, setServer] = useState({ ai: false, sync: false });
  const [useAi, setUseAi] = useState(true);
  const [mode, setMode] = useState<"syllabus" | "learn">("syllabus");

  useEffect(() => {
    fetch("/api/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => s && setServer(s))
      .catch(() => {});
  }, []);

  // Gemini first when it's available, checked against the text; regex parser otherwise or on any failure.
  const extract = useCallback(
    async (text: string): Promise<ParseResult> => {
      if (server.ai && useAi) {
        try {
          const res = await fetch("/api/extract", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, today: ymd(new Date()) }),
          });
          const data = await res.json();
          if (res.ok && data.result) return verifyAi(data.result, text, new Date());
          const r = parseSyllabus(text, new Date());
          r.report.warnings.push(data.error ?? "AI unavailable, used the built-in parser.");
          return r;
        } catch {
          const r = parseSyllabus(text, new Date());
          r.report.warnings.push("Couldn't reach the AI, used the built-in parser.");
          return r;
        }
      }
      return parseSyllabus(text, new Date());
    },
    [server.ai, useAi],
  );

  // restore from this browser
  useEffect(() => {
    const s = load();
    if (s) {
      setCourses(s.courses);
      setEvents(s.events);
      setSessions(s.sessions ?? []);
      if (s.plan) setPlanOpts(s.plan);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) save({ courses, events, sessions, plan: planOpts });
  }, [courses, events, sessions, planOpts, ready]);

  const today = ymd(now);
  // Rebuild the untouched parts of the plan whenever deadlines or preferences change.
  const rebuild = useCallback(
    (keepEdits = true) =>
      setSessions((prev) => buildPlan(events, keepEdits ? prev : prev.filter((x) => x.done), { ...planOpts, today }, () => uid("s"))),
    [events, planOpts, today],
  );
  useEffect(() => {
    if (ready) rebuild();
  }, [ready, rebuild]);

  // countdowns tick every 30s
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const visible = useMemo(() => events.filter((e) => !hidden.has(e.courseId)), [events, hidden]);
  const hazards = useMemo(() => findHazards(visible), [visible]);
  const courseById = useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses]);

  // Several files can import back to back (multi-select, drag in a stack), faster than React
  // re-renders, so imports read and update this ref instead of a possibly stale `courses`.
  const coursesRef = useRef(courses);
  coursesRef.current = courses;

  const importText = useCallback(
    async (text: string, fileName: string, asCode?: string) => {
      const result = await extract(text);
      const courses = coursesRef.current;
      const code = asCode ?? result.courseCode ?? fileName.replace(/\.[a-z]+$/i, "").slice(0, 24) ?? "Course";
      // re-importing the same course replaces it instead of doubling every deadline
      const existing = courses.find((c) => c.code === code);
      const courseId = existing?.id ?? uid("c");
      const color = existing?.color ?? COURSE_COLORS[courses.length % COURSE_COLORS.length];
      const course: Course = {
        id: courseId,
        code,
        name: result.courseName ?? "",
        color,
        term: result.term,
        fileName,
        text: text.slice(0, 40_000),
      };
      const newEvents: SyllabusEvent[] = result.events.map((e) => ({ ...e, id: uid(), courseId }));
      coursesRef.current = existing ? courses.map((c) => (c.id === courseId ? course : c)) : [...courses, course];
      setCourses((cs) => (existing ? cs.map((c) => (c.id === courseId ? course : c)) : [...cs, course]));
      setEvents((es) => [...es.filter((e) => e.courseId !== courseId || e.manual), ...newEvents]);
      setNotes((ns) => [
        { course: code, report: result.report, review: newEvents.filter((e) => e.confidence !== "high").length },
        ...ns.filter((n) => n.course !== code),
      ].slice(0, 4));
      setToast(
        result.events.length
          ? `${code}: ${result.events.length} items charted${existing ? " (replaced the old import)" : ""}`
          : asCode
            ? `${code}: saved. Blaze can answer questions about it.`
            : `${code}: no deadlines found. You can add them by hand.`,
      );
    },
    [extract],
  );

  // Calendar feeds (Canvas etc.) arrive already structured: one course per bracketed course code.
  const importCalendar = useCallback(
    (groups: IcsCourseGroup[], label: string) => {
      let cs = [...coursesRef.current];
      let es = [...latest.current.events];
      let total = 0;
      for (const g of groups) {
        const existing = cs.find((c) => c.code === g.code);
        const id = existing?.id ?? uid("c");
        const c: Course = existing
          ? { ...existing, text: [existing.text, icsGroupText(g)].filter(Boolean).join("\n\n").slice(0, 40_000) }
          : { id, code: g.code, name: g.name, color: COURSE_COLORS[cs.length % COURSE_COLORS.length], fileName: label, text: icsGroupText(g) };
        cs = existing ? cs.map((x) => (x.id === id ? c : x)) : [...cs, c];
        // skip items we already have (same course, same day, similar title)
        const fresh = g.events.filter((e) => !es.some((x) => x.courseId === id && x.date === e.date && x.title.toLowerCase().slice(0, 12) === e.title.toLowerCase().slice(0, 12)));
        es = [...es, ...fresh.map((e) => ({ ...e, id: uid(), courseId: id }))];
        total += fresh.length;
      }
      coursesRef.current = cs;
      latest.current = { ...latest.current, courses: cs, events: es };
      setCourses(cs);
      setEvents(es);
      setToast(`${label}: ${total} new item${total === 1 ? "" : "s"} from ${groups.length} course${groups.length === 1 ? "" : "s"}`);
    },
    [],
  );

  const loadSamples = () => {
    // import sequentially so the second sees the first course
    let cs: Course[] = [...courses];
    let es: SyllabusEvent[] = [...events];
    const ns: ImportNote[] = [];
    for (const s of SAMPLES) {
      const r = parseSyllabus(s.text, new Date());
      const code = r.courseCode ?? s.label;
      const existing = cs.find((c) => c.code === code);
      const id = existing?.id ?? uid("c");
      const c: Course = { id, code, name: r.courseName ?? "", color: existing?.color ?? COURSE_COLORS[cs.length % COURSE_COLORS.length], term: r.term, fileName: s.fileName, text: s.text };
      cs = existing ? cs.map((x) => (x.id === id ? c : x)) : [...cs, c];
      es = [...es.filter((e) => e.courseId !== id), ...r.events.map((e) => ({ ...e, id: uid(), courseId: id }))];
      ns.push({ course: code, report: r.report, review: r.events.filter((e) => e.confidence !== "high").length });
    }
    setCourses(cs);
    setEvents(es);
    setNotes(ns);
    setToast("Loaded two sample syllabi");
  };

  const startLearning = (track: Track, opts: { start: string; hoursPerWeek: number }) => {
    const cs = coursesRef.current;
    const { course, events: es } = trackToCourse(track, opts, COURSE_COLORS[cs.length % COURSE_COLORS.length], uid);
    // a second roadmap for the same goal gets its own code so chips stay distinct
    if (cs.some((c) => c.code === course.code)) course.code = `${course.code}${cs.filter((c) => c.code.startsWith(course.code)).length + 1}`;
    const next = [...cs, course];
    coursesRef.current = next;
    latest.current = { ...latest.current, courses: next, events: [...latest.current.events, ...es] };
    setCourses(next);
    setEvents((prev) => [...prev, ...es]);
    setView("learn");
    setToast(`${track.name}: ${es.length} stops charted, one study plan built`);
  };

  const replanLearning = (courseId: string, hoursPerWeek: number) => {
    setEvents((es) => reschedule(es, courseId, today, hoursPerWeek));
    setCourses((cs) => cs.map((c) => (c.id === courseId && c.learning ? { ...c, learning: { ...c.learning, hoursPerWeek } } : c)));
    setToast("Re-planned the rest of the roadmap from today");
  };

  const upsertEvent = (e: SyllabusEvent) => {
    setEvents((es) => (es.some((x) => x.id === e.id) ? es.map((x) => (x.id === e.id ? e : x)) : [...es, e]));
    setEditing(null);
  };

  const deleteEvent = (id: string) => {
    setEvents((es) => es.filter((e) => e.id !== id));
    setEditing(null);
  };

  const toggleDone = (id: string) => setEvents((es) => es.map((e) => (e.id === id ? { ...e, done: !e.done } : e)));

  const removeCourse = (id: string) => {
    if (confirmRemove !== id) {
      setConfirmRemove(id);
      setTimeout(() => setConfirmRemove((c) => (c === id ? null : c)), 4000);
      return;
    }
    setCourses((cs) => cs.filter((c) => c.id !== id));
    setEvents((es) => es.filter((e) => e.courseId !== id));
    setConfirmRemove(null);
  };

  const exportIcs = () => {
    const list = visible;
    if (!list.length) return;
    const blob = new Blob([buildIcs(list, courses)], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "syllabus-sync.ics";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setToast(`Exported ${list.length} events. Open the file to add them to your calendar.`);
  };

  const clearAll = () => {
    if (confirmRemove !== "__all") {
      setConfirmRemove("__all");
      setTimeout(() => setConfirmRemove((c) => (c === "__all" ? null : c)), 4000);
      return;
    }
    setCourses([]);
    setEvents([]);
    setSessions([]);
    setNotes([]);
    setConfirmRemove(null);
  };

  const latest = useRef({ courses, events, sessions, plan: planOpts });
  latest.current = { courses, events, sessions, plan: planOpts };
  const syncState = useMemo(() => ({ courses, events, sessions, plan: planOpts }), [courses, events, sessions, planOpts]);
  const empty = ready && courses.length === 0;
  const graded = visible.filter((e) => GRADED.includes(e.kind));

  return (
    <div className="wrap">
      <header className="topbar">
        <div className="brand">
          <Logo />
          <div>
            <h1>SyllabusSync</h1>
            <p>Every deadline in your semester, charted.</p>
          </div>
        </div>
        {!empty && (
          <div className="row">
            <button className="btn" onClick={() => setTouring(true)}>Take the tour</button>
            <button className="btn mast-btn" onClick={() => setFocus({ session: null })} title="Focus timer">⛵ Mast mode</button>
            <button className="btn" onClick={() => setEditing("new")}>+ Add deadline</button>
            <button className="btn primary" onClick={exportIcs} disabled={!visible.length}>Export to calendar (.ics)</button>
          </div>
        )}
      </header>

      {!ready ? null : empty ? (
        <section className="hero">
          <div>
            <h2>{mode === "learn" ? "Learning on your own? Chart the voyage." : "Your semester is a voyage. Here is the map."}</h2>
            {mode === "learn" ? (
              <p>
                Pick a goal like AI or cyber security and SyllabusSync turns it into stages and topics on the voyage map, spreads the
                study time over your week, gives every topic free, well-known resources, and links the full community roadmap on
                roadmap.sh. Tick topics off as you go and ask Blaze what to learn next.
              </p>
            ) : (
            <p>
              Drop in a syllabus PDF and SyllabusSync pulls out every exam, quiz, project and homework date, puts them on one
              calendar, warns you about the weeks where everything lands at once, and exports it all to Google, Apple or Outlook
              calendar. Your files stay in your browser.
            </p>
            )}
          </div>
          <div className="stack" style={{ gap: 10 }}>
          <div className="mode-switch" role="tablist" aria-label="How are you learning?">
            <button role="tab" aria-selected={mode === "syllabus"} onClick={() => setMode("syllabus")}>I have syllabi</button>
            <button role="tab" aria-selected={mode === "learn"} onClick={() => setMode("learn")}>I&apos;m learning on my own</button>
          </div>
          {mode === "syllabus" ? (
            <>
              <button className="btn primary" style={{ justifySelf: "start", padding: "10px 18px" }} onClick={() => { loadSamples(); setTouring(true); }}>
                ▶ Take the 60-second guided demo
              </button>
              <Upload onText={importText} onCalendar={importCalendar} onSamples={loadSamples} ai={server.ai} useAi={useAi} setUseAi={setUseAi} />
            </>
          ) : (
            <LearnStart onStart={startLearning} ai={server.ai} />
          )}
          </div>
        </section>
      ) : (
        <div className="stack">
          <div className="row">
            {courses.map((c) => (
              <span key={c.id} className={`chip ${hidden.has(c.id) ? "off" : ""}`}>
                <button
                  className="btn ghost small"
                  style={{ padding: "0 4px" }}
                  aria-pressed={!hidden.has(c.id)}
                  title={hidden.has(c.id) ? "Show this course" : "Hide this course"}
                  onClick={() =>
                    setHidden((h) => {
                      const n = new Set(h);
                      if (n.has(c.id)) n.delete(c.id);
                      else n.add(c.id);
                      return n;
                    })
                  }
                >
                  <span className="dot" style={{ background: c.color }} /> <b>{c.code}</b>
                  {c.name ? <span className="muted"> {c.name}</span> : null}
                </button>
                <button className="btn ghost small danger" style={{ padding: "0 6px" }} onClick={() => removeCourse(c.id)} title="Remove course">
                  {confirmRemove === c.id ? "Remove?" : "×"}
                </button>
              </span>
            ))}
            <span className="grow" />
            <button className="btn ghost small" onClick={clearAll}>{confirmRemove === "__all" ? "Click again to clear everything" : "Start over"}</button>
          </div>

          {notes.length > 0 && (
            <div className="stack" style={{ gap: 8 }}>
              {notes.map((n) => (
                <ImportSummary key={n.course} note={n} onReview={() => setView("list")} onClose={() => setNotes((ns) => ns.filter((x) => x !== n))} />
              ))}
            </div>
          )}

          <NextUp events={graded} courses={courseById} now={now} onOpen={(e) => setEditing(e)} />

          <div className="row">
            <div className="tabs" role="tablist" aria-label="View">
              {(["voyage", ...(courses.some((c) => c.learning) ? ["learn"] : []), "plan", "oracle", "calendar", "list"] as View[]).map((v) => (
                <button key={v} role="tab" className="tab" aria-selected={view === v} onClick={() => setView(v)}>
                  {v === "voyage" ? "Voyage map" : v === "learn" ? "Learning path" : v === "plan" ? "Work plan" : v === "oracle" ? "The Oracle" : v === "calendar" ? "Calendar" : "All deadlines"}
                </button>
              ))}
            </div>
          </div>

          <div className="split">
            <div>
              {view === "voyage" && <VoyageMap events={visible} hazards={hazards} courses={courseById} now={now} onOpen={(e) => setEditing(e)} onToggle={toggleDone} />}
              {view === "plan" && (
                <WorkPlan
                  sessions={sessions.filter((x) => !hidden.has(x.courseId) && !x.removed)}
                  events={new Map(visible.map((e) => [e.id, e]))}
                  courses={courseById}
                  today={today}
                  dailyMinutes={planOpts.dailyMinutes}
                  weekends={planOpts.weekends}
                  onOptions={(o) => setPlanOpts((p) => ({ ...p, ...o }))}
                  onChange={(x) => setSessions((ss) => ss.map((y) => (y.id === x.id ? x : y)))}
                  onDelete={(id) => setSessions((ss) => ss.map((y) => (y.id === id ? { ...y, removed: true, pinned: true } : y)))}
                  onRebuild={() => rebuild(false)}
                  onFocus={(x) => setFocus({ session: x })}
                />
              )}
              {view === "learn" && (
                <LearnPath courses={courses.filter((c) => !hidden.has(c.id))} events={events} today={today} onToggle={toggleDone} onOpen={(e) => setEditing(e)} onReschedule={replanLearning} />
              )}
              {view === "oracle" && <Oracle courses={courses} />}
              {view === "calendar" && <CalendarView events={visible} hazards={hazards} courses={courseById} now={now} onOpen={(e) => setEditing(e)} />}
              {view === "list" && <EventList events={visible} hazards={hazards} courses={courseById} onOpen={(e) => setEditing(e)} onToggle={toggleDone} />}
            </div>
            <aside className="stack">
              <Hazards
                hazards={hazards}
                events={visible}
                courses={courseById}
                onMarkDone={(ids) => {
                  const set = new Set(ids);
                  setEvents((es) => es.map((e) => (set.has(e.id) ? { ...e, done: true } : e)));
                  setToast(`${ids.length} past items checked off`);
                }}
              />
              {server.sync && (
                <CloudSync
                  state={syncState}
                  onLoad={(st) => {
                    setCourses(st.courses);
                    setEvents(st.events);
                    setSessions(st.sessions ?? []);
                    if (st.plan) setPlanOpts(st.plan);
                  }}
                />
              )}
              <Upload compact onText={importText} onCalendar={importCalendar} onSamples={loadSamples} ai={server.ai} useAi={useAi} setUseAi={setUseAi} />
              <LearnStart compact onStart={startLearning} ai={server.ai} />
            </aside>
          </div>
        </div>
      )}

      {editing && (
        <EventEditor
          event={editing === "new" ? null : editing}
          courses={courses}
          onSave={upsertEvent}
          onDelete={deleteEvent}
          onClose={() => setEditing(null)}
          onNewCourse={(c) => setCourses((cs) => [...cs, { ...c, color: COURSE_COLORS[cs.length % COURSE_COLORS.length] }])}
        />
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
      {touring && !empty && <Tour onView={(v) => setView(v)} onClose={() => setTouring(false)} />}
      {focus && (
        <MastMode
          session={focus.session}
          onClose={() => setFocus(null)}
          onComplete={(x, minutes) => {
            if (!x) return;
            // a session counts as done once you've put in most of it; otherwise shrink what's left
            setSessions((ss) =>
              ss.map((y) =>
                y.id !== x.id ? y : minutes >= y.minutes * 0.6 ? { ...y, done: true, pinned: true } : { ...y, minutes: Math.max(15, y.minutes - minutes), pinned: true },
              ),
            );
          }}
        />
      )}
      {ready && (
        <Blaze
          courses={courses}
          events={events}
          sessions={sessions}
          online={server.ai}
          dailyMinutes={planOpts.dailyMinutes}
          onAction={(a) => {
            if (a.type === "export_calendar") {
              exportIcs();
              return undefined;
            }
            if (a.type === "rebalance_plan") {
              rebuild(false);
              return undefined;
            }
            // several actions can be applied in one go, so chain them off the latest state
            const r = applyAction(latest.current, a, (p) => uid(p));
            if (r.error || !r.state) return r.error ?? "Couldn't apply that.";
            latest.current = r.state;
            setCourses(r.state.courses);
            setEvents(r.state.events);
            setSessions(r.state.sessions);
            setPlanOpts(r.state.plan);
            return undefined;
          }}
        />
      )}

      <footer className="footer">
        Built solo at HackUTA 2026. Syllabus files are read in your browser and never uploaded anywhere.
      </footer>
    </div>
  );
}

function ImportSummary({ note, onReview, onClose }: { note: ImportNote; onReview: () => void; onClose: () => void }) {
  const r = note.report;
  const warn = r.warnings.length > 0 || note.review > 0;
  return (
    <div className={`notice ${warn ? "warn" : ""}`}>
      <div className="row">
        <span className="grow">
          <b>{note.course}</b>: read {r.linesRead} lines, found {r.datesFound} dates, kept {r.eventsKept}.
          {r.termLabel ? ` Term: ${r.termLabel}.` : ""}
          {r.skippedNoKeyword ? ` Skipped ${r.skippedNoKeyword} lecture-only date${r.skippedNoKeyword > 1 ? "s" : ""}.` : ""}
          {r.invalidDates.length ? ` Ignored impossible date${r.invalidDates.length > 1 ? "s" : ""}: ${r.invalidDates.join(", ")}.` : ""}
          {note.review > 0 ? ` ${note.review} item${note.review > 1 ? "s" : ""} worth a second look.` : ""}
          {r.warnings.map((w) => " " + w)}
        </span>
        {note.review > 0 && <button className="btn small" onClick={onReview}>Review</button>}
        <button className="btn ghost small" onClick={onClose} aria-label="Dismiss">×</button>
      </div>
    </div>
  );
}

function Logo() {
  return (
    <svg width="38" height="38" viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="20" r="19" fill="var(--accent)" />
      <path d="M9 25 Q20 31 31 25 L28 29 Q20 33 12 29 Z" fill="var(--accent-ink)" />
      <path d="M20 8 L20 25" stroke="var(--accent-ink)" strokeWidth="1.6" />
      <path d="M20 9 Q28 15 20 23 Z" fill="var(--accent-ink)" />
      <path d="M19 11 Q13 16 19 22 Z" fill="var(--accent-ink)" opacity="0.7" />
    </svg>
  );
}
