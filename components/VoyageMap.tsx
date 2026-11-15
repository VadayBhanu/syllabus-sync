"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Course, EventKind, SyllabusEvent } from "@/lib/types";
import { KIND_LABEL } from "@/lib/types";
import { findCyclops, type Hazard } from "@/lib/conflicts";
import { addDays, daysBetween, prettyDate, prettyTime, weekStart, ymd } from "@/lib/dates";

interface Props {
  events: SyllabusEvent[];
  hazards: Hazard[];
  courses: Map<string, Course>;
  now: Date;
  onOpen: (e: SyllabusEvent) => void;
  onToggle: (id: string) => void;
}

// How much each kind of item weighs on a week. Drives island size and how rough the sea gets.
const LOAD: Partial<Record<EventKind, number>> = { exam: 4, project: 3, quiz: 1.5, assignment: 1.2, lab: 1.2 };

// Wide screens get a 6-week-per-row chart; phones get a narrower canvas with 3 per row
// so labels stay readable instead of being shrunk to nothing.
const LAYOUTS = {
  wide: { W: 1000, PER_ROW: 6, PAD_X: 90 },
  narrow: { W: 420, PER_ROW: 3, PAD_X: 62 },
};
const ROW_H = 180;
const PAD_TOP = 110;

interface Week {
  index: number;
  start: string;
  items: SyllabusEvent[];
  load: number;
  hasExam: boolean;
  holiday: boolean;
  hazard?: Hazard;
  x: number;
  y: number;
}

export default function VoyageMap({ events, hazards, courses, now, onOpen, onToggle }: Props) {
  const today = ymd(now);
  const [narrow, setNarrow] = useState(false);
  useLayoutEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const { W, PER_ROW, PAD_X } = narrow ? LAYOUTS.narrow : LAYOUTS.wide;

  const weeks = useMemo<Week[]>(() => {
    const dated = events.filter((e) => e.kind !== "admin" || events.length < 3);
    if (!dated.length) return [];
    const sorted = [...dated].sort((a, b) => a.date.localeCompare(b.date));
    const first = weekStart(sorted[0].date);
    const last = weekStart(sorted[sorted.length - 1].endDate ?? sorted[sorted.length - 1].date);
    const count = Math.min(40, Math.floor(daysBetween(first, last) / 7) + 1);
    const step = (W - PAD_X * 2) / (PER_ROW - 1);
    const out: Week[] = [];
    for (let i = 0; i < count; i++) {
      const start = addDays(first, i * 7);
      const end = addDays(start, 6);
      const items = events
        .filter((e) => e.date <= end && (e.endDate ?? e.date) >= start)
        .sort((a, b) => (a.date + (a.time ?? "99")).localeCompare(b.date + (b.time ?? "99")));
      const load = items.reduce((s, e) => s + (e.done ? 0 : (e.minutes ? e.minutes / 180 : LOAD[e.kind] ?? 0)), 0);
      const row = Math.floor(i / PER_ROW);
      const col = i % PER_ROW;
      const x = row % 2 === 0 ? PAD_X + col * step : W - PAD_X - col * step;
      // a little vertical wobble so it reads as a route, not a spreadsheet
      const y = PAD_TOP + row * ROW_H + (col % 2 === 0 ? -10 : 12);
      const hz = hazards
        .filter((h) => h.kind !== "holiday" && h.date <= end && h.endDate >= start)
        .sort((a, b) => (a.kind === "clash" ? -1 : 1) - (b.kind === "clash" ? -1 : 1))[0];
      out.push({
        index: i,
        start,
        items,
        load,
        hasExam: items.some((e) => e.kind === "exam"),
        holiday: items.some((e) => e.kind === "holiday") && load < 2,
        hazard: hz,
        x,
        y,
      });
    }
    return out;
  }, [events, hazards, W, PER_ROW, PAD_X]);

  const rows = Math.ceil(weeks.length / PER_ROW);
  const H = PAD_TOP + (rows - 1) * ROW_H + 140;

  // Current position, in weeks since the start (fractional), clamped to the route.
  const pos = weeks.length ? Math.max(0, Math.min(weeks.length - 1, daysBetween(weeks[0].start, today) / 7)) : 0;
  const currentIdx = weeks.findIndex((w) => today >= w.start && today <= addDays(w.start, 6));

  const [selected, setSelected] = useState<number | null>(null);
  const nextBusy = weeks.findIndex((w) => w.start >= today && w.items.length > 0);
  const sel = selected ?? (currentIdx >= 0 ? currentIdx : nextBusy >= 0 ? nextBusy : 0);
  const selWeek = weeks[sel] ?? weeks[0];

  // Measure each leg of the route so the ship can sit exactly on the curve.
  const segRefs = useRef<(SVGPathElement | null)[]>([]);
  const [ship, setShip] = useState<{ x: number; y: number; angle: number } | null>(null);
  useLayoutEffect(() => {
    if (!weeks.length) return;
    const i = Math.min(Math.floor(pos), weeks.length - 2);
    const seg = segRefs.current[i];
    if (!seg || weeks.length < 2) {
      setShip({ x: weeks[0].x, y: weeks[0].y, angle: 0 });
      return;
    }
    const len = seg.getTotalLength();
    const t = Math.max(0, Math.min(1, pos - i));
    const p = seg.getPointAtLength(t * len);
    const q = seg.getPointAtLength(Math.min(len, t * len + 2));
    const angle = (Math.atan2(q.y - p.y, q.x - p.x) * 180) / Math.PI;
    setShip({ x: p.x, y: p.y, angle });
  }, [weeks, pos]);

  if (!weeks.length) {
    return <section className="panel"><p className="muted">No dated items yet. Import a syllabus or add a deadline to chart the voyage.</p></section>;
  }

  const legs = weeks.slice(0, -1).map((a, i) => {
    const b = weeks[i + 1];
    if (Math.floor(a.index / PER_ROW) === Math.floor(b.index / PER_ROW)) {
      const mx = (a.x + b.x) / 2;
      return `M${a.x},${a.y} C${mx},${a.y} ${mx},${b.y} ${b.x},${b.y}`;
    }
    // turning around at the end of a row: swing out past the edge
    const swing = Math.min(70, PAD_X - 14);
    const out = a.x > W / 2 ? swing : -swing;
    return `M${a.x},${a.y} C${a.x + out},${a.y} ${b.x + out},${b.y} ${b.x},${b.y}`;
  });

  const islandR = (w: Week) => (w.items.some((e) => LOAD[e.kind] || e.minutes) ? 13 + Math.min(w.load, 12) * 2.1 : 12);
  const startR = Math.max(12, islandR(weeks[0]));
  const endR = Math.max(12, islandR(weeks[weeks.length - 1]));
  const cyclops = findCyclops(events, today);
  const daysLeft = Math.max(0, daysBetween(today, addDays(weeks[weeks.length - 1].start, 6)));
  const passed = weeks.filter((w) => addDays(w.start, 6) < today).length;
  const examsLeft = events.filter((e) => e.kind === "exam" && e.date >= today && !e.done).length;

  return (
    <section className="panel" style={{ padding: 12 }}>
      <div className="row small" style={{ padding: "0 4px 8px" }}>
        <b style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 18 }}>Ship's log</b>
        <span className="muted">
          {today < weeks[0].start
            ? `Setting sail in ${daysBetween(today, weeks[0].start)} days.`
            : daysLeft === 0
              ? "Home in Ithaca. The semester is done."
              : `Week ${Math.min(weeks.length, passed + 1)} of ${weeks.length} · ${daysLeft} days to Ithaca · ${examsLeft} exam${examsLeft === 1 ? "" : "s"} still ahead`}
        </span>
      </div>

      <svg className="map" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Semester voyage map. Each island is a week; bigger islands mean heavier weeks.">
        <defs>
          <pattern id="waves" width="60" height="24" patternUnits="userSpaceOnUse">
            <path d="M0 12 q7.5 -6 15 0 t15 0 t15 0 t15 0" fill="none" stroke="var(--wave)" strokeWidth="1" opacity="0.35" />
          </pattern>
          <radialGradient id="shallows">
            <stop offset="55%" stopColor="var(--sea)" stopOpacity="0" />
            <stop offset="100%" stopColor="var(--sea-deep)" stopOpacity="0.9" />
          </radialGradient>
        </defs>
        <rect x="0" y="0" width={W} height={H} fill="url(#waves)" />
        <rect x="0" y="0" width={W} height={H} fill="url(#shallows)" />

        {/* compass rose */}
        <g transform={`translate(${W - 44}, 44)`} opacity="0.55" aria-hidden="true">
          <circle r="22" fill="none" stroke="var(--storm)" />
          <path d="M0 -26 L5 0 L0 26 L-5 0 Z" fill="var(--storm)" />
          <path d="M-26 0 L0 5 L26 0 L0 -5 Z" fill="var(--storm)" opacity="0.5" />
          <text y="-30" textAnchor="middle" fontSize="11" fill="var(--storm)">N</text>
        </g>

        {/* rough water around heavy weeks */}
        {weeks.map((w) =>
          w.load >= 4 ? (
            <g key={`storm-${w.index}`} aria-hidden="true" opacity={Math.min(0.9, 0.25 + w.load / 14)}>
              {Array.from({ length: Math.min(7, Math.round(w.load / 1.5)) }).map((_, k) => {
                const ang = (k / 7) * Math.PI * 2 + w.index;
                const r = 46 + (k % 3) * 9;
                const sx = w.x + Math.cos(ang) * r;
                const sy = w.y + Math.sin(ang) * r * 0.6;
                return <path key={k} d={`M${sx - 10},${sy} q5 -6 10 0 t10 0`} fill="none" stroke="var(--storm)" strokeWidth="1.6" strokeLinecap="round" />;
              })}
            </g>
          ) : null,
        )}

        {/* the route: solid behind us, dashed ahead */}
        {legs.map((d, i) => (
          <path
            key={`leg-${i}`}
            ref={(el) => {
              segRefs.current[i] = el;
            }}
            d={d}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={i < Math.floor(pos) ? 3 : 2}
            strokeDasharray={i < Math.floor(pos) ? undefined : "6 7"}
            opacity={i < Math.floor(pos) ? 0.9 : 0.55}
          />
        ))}

        {/* islands */}
        {weeks.map((w) => {
          const graded = w.items.filter((e) => LOAD[e.kind] || e.minutes);
          const r = graded.length ? 13 + Math.min(w.load, 12) * 2.1 : 0;
          const isSel = w.index === sel;
          const label = `Week ${w.index + 1}, ${prettyDate(w.start, false)}: ${graded.length} graded item${graded.length === 1 ? "" : "s"}${w.hazard ? ", " + w.hazard.epithet : ""}`;
          return (
            <g
              key={w.index}
              className="island"
              tabIndex={0}
              role="button"
              aria-label={label}
              aria-pressed={isSel}
              onClick={() => setSelected(w.index)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setSelected(w.index))}
            >
              <title>{label}</title>
              <circle cx={w.x} cy={w.y} r={Math.max(r, 14) + 12} fill="transparent" />
              {isSel && <circle cx={w.x} cy={w.y} r={Math.max(r, 10) + 9} fill="none" stroke="var(--accent)" strokeWidth="2" strokeDasharray="3 4" />}
              {r > 0 ? (
                <>
                  <path className="land" d={blob(w.x, w.y, r, w.index)} fill="var(--land)" stroke="var(--land-edge)" strokeWidth="1.5" />
                  {cyclops && w.items.some((e) => e.id === cyclops.id) && (
                    <g aria-label="The Cyclops: your biggest exam">
                      <ellipse cx={w.x + r * 0.55} cy={w.y + r * 0.2} rx={6} ry={4.2} fill="#fff" stroke="var(--ink)" strokeWidth="1" />
                      <circle cx={w.x + r * 0.55} cy={w.y + r * 0.2} r={2.2} fill="var(--danger)" />
                    </g>
                  )}
                  {w.hasExam && (
                    <path d={`M${w.x - r * 0.45},${w.y + r * 0.15} L${w.x - r * 0.1},${w.y - r * 0.55} L${w.x + 0.05 * r},${w.y - r * 0.25} L${w.x + r * 0.22},${w.y - r * 0.5} L${w.x + r * 0.5},${w.y + r * 0.15} Z`} fill="var(--land-edge)" opacity="0.75" />
                  )}
                  {/* one flag per item, in the course colour */}
                  {graded.slice(0, 8).map((e, k) => {
                    const ang = -Math.PI / 2 + ((k - (Math.min(graded.length, 8) - 1) / 2) * 0.55);
                    const fx = w.x + Math.cos(ang) * (r - 2);
                    const fy = w.y + Math.sin(ang) * (r - 2) * 0.85;
                    const col = courses.get(e.courseId)?.color ?? "var(--accent)";
                    return (
                      <g key={e.id} opacity={e.done ? 0.35 : 1}>
                        <line x1={fx} y1={fy} x2={fx} y2={fy - 11} stroke="var(--ink)" strokeWidth="1" />
                        <path d={`M${fx},${fy - 11} l8,3 l-8,3 Z`} fill={col} />
                      </g>
                    );
                  })}
                </>
              ) : w.holiday ? (
                <g>
                  <circle cx={w.x} cy={w.y} r="11" fill="var(--panel)" stroke="var(--ok)" strokeWidth="1.5" />
                  <text x={w.x} y={w.y + 4} textAnchor="middle" fontSize="12" fill="var(--ok)">⚓</text>
                </g>
              ) : (
                <circle cx={w.x} cy={w.y} r="5" fill="var(--panel)" stroke="var(--accent)" strokeWidth="1.5" />
              )}
              <text x={w.x} y={w.y + Math.max(r, 12) + 18} textAnchor="middle" fontSize="12" fill="var(--muted)">
                Wk {w.index + 1} · {prettyDate(w.start, false)}
              </text>
              {w.hazard ? (
                <text x={w.x} y={w.y - Math.max(r, 10) - 18} textAnchor="middle" fontSize="12.5" fontWeight="600" fill="var(--danger)">
                  {cyclops && w.items.some((e) => e.id === cyclops.id) ? `Cyclops · ${w.hazard.epithet}` : w.hazard.epithet}
                </text>
              ) : cyclops && w.items.some((e) => e.id === cyclops.id) ? (
                <text x={w.x} y={w.y - Math.max(r, 10) - 18} textAnchor="middle" fontSize="12.5" fontWeight="600" fill="var(--danger)">The Cyclops</text>
              ) : w.holiday && r === 0 ? (
                <text x={w.x} y={w.y - 18} textAnchor="middle" fontSize="12" fill="var(--ok)">Safe harbor</text>
              ) : null}
            </g>
          );
        })}

        {/* start and end */}
        <text x={weeks[0].x} y={weeks[0].y + startR + 40} textAnchor="middle" fontSize="15" fontFamily="Fraunces, Georgia, serif" fontWeight="700" fill="var(--ink)">Troy</text>
        <text x={weeks[0].x} y={weeks[0].y + startR + 54} textAnchor="middle" fontSize="11" fill="var(--muted)">first deadline</text>
        <text x={weeks[weeks.length - 1].x} y={weeks[weeks.length - 1].y + endR + 40} textAnchor="middle" fontSize="15" fontFamily="Fraunces, Georgia, serif" fontWeight="700" fill="var(--ink)">Ithaca</text>
        <text x={weeks[weeks.length - 1].x} y={weeks[weeks.length - 1].y + endR + 54} textAnchor="middle" fontSize="11" fill="var(--muted)">last one, then home</text>

        {/* the ship (you) */}
        {ship && (
          <g transform={`translate(${ship.x}, ${ship.y - 4}) scale(${Math.abs(ship.angle) > 90 ? -1 : 1}, 1)`} aria-hidden="true" style={{ transition: "transform 0.6s ease" }}>
            <path d="M-15 2 L15 2 L10 10 L-10 10 Z" fill="var(--ink)" />
            <line x1="0" y1="2" x2="0" y2="-20" stroke="var(--ink)" strokeWidth="1.6" />
            <path d="M1 -19 Q13 -10 1 0 Z" fill="var(--panel)" stroke="var(--ink)" strokeWidth="1" />
            <path d="M-1 -16 Q-9 -9 -1 -2 Z" fill="var(--panel)" stroke="var(--ink)" strokeWidth="1" />
          </g>
        )}
        {ship && (
          <text x={Math.max(40, Math.min(W - 40, ship.x))} y={ship.y - 30} textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--accent)">you are here</text>
        )}
      </svg>

      <div className="maplegend" style={{ padding: "0 4px" }}>
        <span>Island size = how heavy the week is</span>
        <span>Flags = one per graded item, in the course colour</span>
        <span>Peak = exam week</span>
        <span style={{ color: "var(--danger)" }}>Scylla &amp; Charybdis = two big things on one day</span>
        <span style={{ color: "var(--danger)" }}>Storm = 3+ items in 3 days</span>
        <span style={{ color: "var(--danger)" }}>Cyclops (eye) = your biggest exam ahead</span>
      </div>

      {selWeek && (
        <div style={{ padding: "14px 4px 0" }}>
          <div className="row">
            <h3 style={{ fontSize: 18 }}>
              Week {selWeek.index + 1}: {prettyDate(selWeek.start, false)} to {prettyDate(addDays(selWeek.start, 6), false)}
            </h3>
            {selWeek.hazard && <span className="badge hz">{selWeek.hazard.epithet}</span>}
            <span className="grow" />
            <button className="btn small" disabled={sel <= 0} onClick={() => setSelected(Math.max(0, sel - 1))} aria-label="Previous week">‹</button>
            <button className="btn small" disabled={sel >= weeks.length - 1} onClick={() => setSelected(Math.min(weeks.length - 1, sel + 1))} aria-label="Next week">›</button>
          </div>
          {selWeek.hazard && <p className="small" style={{ color: "var(--danger)", margin: "4px 0" }}>{selWeek.hazard.message}</p>}
          {selWeek.items.length === 0 ? (
            <p className="muted small">Open water. Nothing due this week.</p>
          ) : (
            selWeek.items.map((e) => {
              const c = courses.get(e.courseId);
              return (
                <div key={e.id} className={`evt ${e.done ? "done" : ""}`}>
                  <input type="checkbox" checked={!!e.done} onChange={() => onToggle(e.id)} aria-label={`Mark ${e.title} done`} style={{ marginTop: 4 }} />
                  <div>
                    <div className="ttl">{e.title}</div>
                    <div className="row tiny muted" style={{ gap: 6 }}>
                      <span className="dot" style={{ background: c?.color }} />
                      <span>{c?.code}</span>
                      <span>·</span>
                      <span>{prettyDate(e.date)}{e.endDate ? ` to ${prettyDate(e.endDate, false)}` : ""}{e.time ? `, ${prettyTime(e.time)}` : ""}</span>
                      <span className={`badge ${e.kind === "exam" ? "exam" : ""}`}>{KIND_LABEL[e.kind]}</span>
                      {e.weight ? <span>{e.weight}%</span> : null}
                      {e.confidence !== "high" && <span className="badge low">check</span>}
                    </div>
                  </div>
                  <button className="btn small" onClick={() => onOpen(e)}>Edit</button>
                </div>
              );
            })
          )}
        </div>
      )}
    </section>
  );
}

/** A lumpy, island-shaped closed path. Seeded so each week keeps its shape between renders. */
function blob(cx: number, cy: number, r: number, seed: number): string {
  const n = 9;
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const wobble = 0.8 + 0.35 * fract(Math.sin((seed + 1) * 12.9898 + i * 78.233) * 43758.5453);
    pts.push([cx + Math.cos(a) * r * wobble, cy + Math.sin(a) * r * wobble * 0.78]);
  }
  // smooth closed curve through the points (Catmull-Rom to Bezier)
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d + "Z";
}

function fract(x: number) {
  return x - Math.floor(x);
}
