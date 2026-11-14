"use client";

import { useEffect, useState } from "react";
import type { Course, EventKind, SyllabusEvent } from "@/lib/types";
import { KIND_LABEL } from "@/lib/types";
import { uid } from "@/lib/storage";
import { ymd } from "@/lib/dates";

interface Props {
  event: SyllabusEvent | null;
  courses: Course[];
  onSave: (e: SyllabusEvent) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  onNewCourse: (c: Omit<Course, "color">) => void;
}

export default function EventEditor({ event, courses, onSave, onDelete, onClose, onNewCourse }: Props) {
  const [title, setTitle] = useState(event?.title ?? "");
  const [date, setDate] = useState(event?.date ?? ymd(new Date()));
  const [endDate, setEndDate] = useState(event?.endDate ?? "");
  const [time, setTime] = useState(event?.time ?? "");
  const [kind, setKind] = useState<EventKind>(event?.kind ?? "assignment");
  const [courseId, setCourseId] = useState(event?.courseId ?? courses[0]?.id ?? "__new");
  const [newCourse, setNewCourse] = useState("");
  const [weight, setWeight] = useState(event?.weight?.toString() ?? "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return setError("Give it a name.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return setError("Pick a date.");
    if (endDate && endDate < date) return setError("End date is before the start date.");
    const w = weight ? Number(weight) : undefined;
    if (w !== undefined && (Number.isNaN(w) || w < 0 || w > 100)) return setError("Weight should be a percentage between 0 and 100.");
    let cid = courseId;
    if (cid === "__new") {
      const code = newCourse.trim() || "Personal";
      const existing = courses.find((c) => c.code.toLowerCase() === code.toLowerCase());
      cid = existing?.id ?? uid("c");
      if (!existing) onNewCourse({ id: cid, code, name: "" });
    }
    onSave({
      id: event?.id ?? uid(),
      courseId: cid,
      title: title.trim(),
      date,
      endDate: endDate || undefined,
      time: time || undefined,
      kind,
      weight: w,
      // once a person has looked at it, it's no longer a guess
      confidence: "high",
      note: undefined,
      source: event?.source,
      manual: event ? event.manual : true,
      done: event?.done,
    });
  }

  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="panel modal" onSubmit={submit} role="dialog" aria-modal="true" aria-label={event ? "Edit deadline" : "Add deadline"}>
        <h3 style={{ marginBottom: 12 }}>{event ? "Edit deadline" : "Add a deadline"}</h3>
        {event?.note && <div className="notice warn small" style={{ marginBottom: 10 }}>Parser note: {event.note}</div>}
        {event?.source && (
          <div className="small muted" style={{ marginBottom: 10 }}>
            From the syllabus: <i>“{event.source}”</i>
          </div>
        )}
        <label className="field">
          Title
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Homework 3" />
        </label>
        <div className="grid2">
          <label className="field">
            Date
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </label>
          <label className="field">
            Time (optional)
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </label>
        </div>
        <div className="grid2">
          <label className="field">
            Type
            <select value={kind} onChange={(e) => setKind(e.target.value as EventKind)}>
              {(Object.keys(KIND_LABEL) as EventKind[]).map((k) => (
                <option key={k} value={k}>{KIND_LABEL[k]}</option>
              ))}
            </select>
          </label>
          <label className="field">
            Weight % (optional)
            <input inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="20" />
          </label>
        </div>
        <div className="grid2">
          <label className="field">
            Course
            <select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.code}</option>
              ))}
              <option value="__new">New course…</option>
            </select>
          </label>
          {courseId === "__new" ? (
            <label className="field">
              Course name
              <input value={newCourse} onChange={(e) => setNewCourse(e.target.value)} placeholder="HIST 1311" />
            </label>
          ) : (
            <label className="field">
              Ends (for multi-day)
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </label>
          )}
        </div>
        {error && <div className="notice error small" style={{ marginBottom: 10 }}>{error}</div>}
        <div className="row">
          {event && <button type="button" className="btn danger" onClick={() => onDelete(event.id)}>Delete</button>}
          <span className="grow" />
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn primary">Save</button>
        </div>
      </form>
    </div>
  );
}
