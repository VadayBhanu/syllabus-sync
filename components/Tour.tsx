"use client";

// A guided tour for demos: walks through each feature, switching views and
// highlighting the part of the page it's talking about.

import { useEffect, useState } from "react";

export type TourView = "voyage" | "plan" | "oracle" | "calendar" | "list";

interface Step {
  view?: TourView;
  target?: string;
  title: string;
  text: string;
}

const STEPS: Step[] = [
  { view: "voyage", target: ".map", title: "Your semester as a voyage", text: "Every week is an island on the way from Troy to Ithaca. Bigger islands mean heavier weeks, flags are deadlines in each course's colour, and the ship is you, today." },
  { view: "voyage", target: ".split aside .panel", title: "The dangers, named", text: "Scylla & Charybdis: two big things on one day. Storm: three graded items in three days. The Cyclops is your biggest exam ahead, and the Lotus-eaters are past work you never checked off." },
  { target: ".nextup", title: "Countdowns", text: "The next deadlines across every class, counting down live." },
  { view: "plan", target: ".split > div > .panel", title: "A work plan that fits your life", text: "Study sessions spread over the days before each deadline, within the hours you have. Overloaded days turn red. Move, resize or rename anything, and press ⛵ Focus to start a session." },
  { view: "plan", target: ".mast-btn", title: "Mast mode", text: "Tie yourself to the mast like Odysseus. A focus timer where switching tabs means the Sirens got you." },
  { view: "oracle", target: ".oracle-verdict", title: "The Oracle", text: "It reads the grade weights from your syllabus and tells you exactly what you need on the rest of the class." },
  { view: "voyage", target: ".blaze-fab", title: "Blaze, the wooden horse", text: "Ask anything about your syllabi, by typing or out loud, and keep asking follow-ups. Every answer shows the line it came from, and Blaze can plan your week. You confirm every change." },
  { target: ".topbar .btn.primary", title: "Take it everywhere", text: "One click exports every deadline, with reminders, to Google, Apple or Outlook calendar." },
];

interface Props {
  onView: (v: TourView) => void;
  onClose: () => void;
}

export default function Tour({ onView, onClose }: Props) {
  const [i, setI] = useState(0);
  const step = STEPS[i];

  useEffect(() => {
    if (step.view) onView(step.view);
    let el: Element | null = null;
    const t = setTimeout(() => {
      el = step.target ? document.querySelector(step.target) : null;
      if (el) {
        el.classList.add("tour-glow");
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 120);
    return () => {
      clearTimeout(t);
      el?.classList.remove("tour-glow");
      document.querySelectorAll(".tour-glow").forEach((x) => x.classList.remove("tour-glow"));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setI((n) => Math.min(STEPS.length - 1, n + 1));
      if (e.key === "ArrowLeft") setI((n) => Math.max(0, n - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="tour" role="dialog" aria-label="Guided tour">
      <div className="tiny muted">Step {i + 1} of {STEPS.length}</div>
      <b style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 18 }}>{step.title}</b>
      <p className="small" style={{ margin: "4px 0 10px" }}>{step.text}</p>
      <div className="row">
        <button className="btn small ghost" onClick={onClose}>End tour</button>
        <span className="grow" />
        <button className="btn small" disabled={i === 0} onClick={() => setI(i - 1)}>Back</button>
        {i < STEPS.length - 1 ? (
          <button className="btn small primary" onClick={() => setI(i + 1)}>Next</button>
        ) : (
          <button className="btn small primary" onClick={onClose}>Start sailing</button>
        )}
      </div>
    </div>
  );
}
