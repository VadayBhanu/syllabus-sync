"use client";

import { useRef, useState } from "react";
import { extractPdfText, PdfError } from "@/lib/pdf";
import { looksLikeIcs, parseIcs, type IcsCourseGroup } from "@/lib/icsImport";

interface Props {
  onText: (text: string, fileName: string, asCode?: string) => Promise<void> | void;
  onCalendar: (groups: IcsCourseGroup[], label: string) => void;
  onSamples: () => void;
  compact?: boolean;
  ai?: boolean;
  useAi?: boolean;
  setUseAi?: (v: boolean) => void;
}

type Source = "file" | "link" | "canvas" | "paste";

// The GitHub Pages preview is a static build with no server routes.
const STATIC_PREVIEW = process.env.NEXT_PUBLIC_STATIC === "1";

const SOURCES: { id: Source; label: string }[] = [
  { id: "file", label: "PDF or file" },
  { id: "link", label: "Link" },
  { id: "canvas", label: "Canvas calendar" },
  { id: "paste", label: "Paste (MyMav, Canvas, notes)" },
];

const PASTE_KINDS = ["Syllabus", "MyMav class schedule", "Canvas page", "Other notes"];

export default function Upload({ onText, onCalendar, onSamples, compact, ai, useAi, setUseAi }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<Source>("file");
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pasted, setPasted] = useState("");
  const [pasteKind, setPasteKind] = useState(PASTE_KINDS[0]);
  const [pasteName, setPasteName] = useState("");
  const [link, setLink] = useState("");

  const reading = (name: string) => setBusy(ai && useAi ? `Reading ${name} with Gemini…` : `Reading ${name}…`);

  async function handleText(text: string, name: string, asCode?: string) {
    if (looksLikeIcs(text)) {
      const groups = parseIcs(text);
      if (!groups.length) throw new PdfError("That calendar has no events in it.", "empty");
      onCalendar(groups, name);
      return;
    }
    if (!text.trim()) throw new PdfError(`${name} is empty.`, "empty");
    reading(name);
    await onText(text, name, asCode);
  }

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    for (const file of Array.from(files)) {
      const name = file.name || "syllabus";
      try {
        setBusy(`Reading ${name}…`);
        const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(name);
        const isText = file.type.startsWith("text/") || /\.(txt|md|csv|ics|html?)$/i.test(name);
        if (isPdf) {
          const { text } = await extractPdfText(file);
          reading(name);
          await onText(text, name);
        } else if (isText) {
          await handleText(await file.text(), name);
        } else if (/\.docx?$/i.test(name)) {
          throw new PdfError("Word files aren't supported yet. Save it as PDF (File → Save As → PDF) and drop that in.", "invalid");
        } else {
          throw new PdfError(`${name} isn't a PDF, text or calendar file.`, "invalid");
        }
      } catch (err) {
        console.warn(err);
        setError(err instanceof PdfError ? err.message : `Something went wrong reading ${name}. Try pasting the text instead.`);
        if (err instanceof PdfError && err.code === "empty") setSource("paste");
      } finally {
        setBusy(null);
      }
    }
    if (input.current) input.current.value = "";
  }

  async function importLink(kind: "link" | "canvas") {
    const url = link.trim();
    if (!url) return;
    if (STATIC_PREVIEW) {
      setError(kind === "canvas"
        ? "This preview has no server to fetch links. Open the feed link in your browser to download the .ics file, then drop it in under \"PDF or file\"."
        : "This preview has no server to fetch links. Download the PDF and drop it in, or paste the text.");
      return;
    }
    setError(null);
    setBusy("Fetching…");
    try {
      const res = await fetch("/api/import-url", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) });
      const data = await res.json();
      if (!res.ok) throw new PdfError(data.error ?? "Couldn't fetch that link.", "unknown");
      const name = kind === "canvas" ? "Canvas calendar" : data.name || "Linked syllabus";
      if (data.kind === "pdf") {
        const bytes = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0));
        const { text } = await extractPdfText(new File([bytes], name.endsWith(".pdf") ? name : name + ".pdf", { type: "application/pdf" }));
        reading(name);
        await onText(text, name);
      } else if (data.kind === "ics") {
        await handleText(data.text, name);
      } else {
        if (kind === "canvas") throw new PdfError("That link isn't a calendar feed. In Canvas, open Calendar and use the \"Calendar Feed\" link at the bottom right.", "invalid");
        await handleText(data.text, name);
      }
      setLink("");
    } catch (err) {
      setError(err instanceof PdfError ? err.message : "Couldn't import that link.");
    } finally {
      setBusy(null);
    }
  }

  async function importPaste() {
    const label = pasteName.trim() || (pasteKind === "Syllabus" ? "Pasted syllabus" : pasteKind);
    setError(null);
    try {
      // a schedule or notes is its own source, so it never replaces a course's syllabus
      const asCode = pasteKind === "Syllabus" ? pasteName.trim() || undefined : label;
      await handleText(pasteKind === "Syllabus" ? pasted : `${pasteKind}\n${pasted}`, label, asCode);
      setPasted("");
      setPasteName("");
    } catch (err) {
      setError(err instanceof PdfError ? err.message : "Couldn't read that text.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={compact ? "panel stack" : "stack"} style={{ gap: 10 }}>
      {compact && <h3 style={{ fontSize: 17 }}>Add a source</h3>}
      <div className="srcs" role="tablist" aria-label="Where is your syllabus?">
        {SOURCES.map((s) => (
          <button key={s.id} role="tab" aria-selected={source === s.id} className="src" onClick={() => { setSource(s.id); setError(null); }}>
            {s.label}
          </button>
        ))}
      </div>

      {source === "file" && (
        <div
          className={`drop ${over ? "over" : ""} ${compact ? "compact" : ""}`}
          role="button"
          tabIndex={0}
          aria-label="Upload a syllabus PDF, text or calendar file"
          onClick={() => input.current?.click()}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); handleFiles(e.dataTransfer.files); }}
        >
          <input ref={input} type="file" accept=".pdf,.txt,.md,.ics,.html,application/pdf,text/plain,text/calendar" multiple hidden onChange={(e) => handleFiles(e.target.files)} />
          {busy ? <b>{busy}</b> : compact ? (
            <span><b>Add more syllabi</b><br /><span className="muted small">Drop one or several PDFs, or click to pick them</span></span>
          ) : (
            <>
              <h2>Drop all your syllabi at once</h2>
              <span className="muted">Select or drag in every course's PDF together (or add them one by one). Each becomes its own colour-coded course. Calendar (.ics) files work too.</span>
            </>
          )}
        </div>
      )}

      {(source === "link" || source === "canvas") && (
        <div className="stack" style={{ gap: 8 }}>
          {source === "canvas" ? (
            <p className="small muted" style={{ margin: 0 }}>
              In UTA Canvas, open <b>Calendar</b>, click <b>Calendar Feed</b> at the bottom right, and copy that link. It brings in every assignment and exam date from all your courses. No password needed, and the link only reads your calendar.
            </p>
          ) : (
            <p className="small muted" style={{ margin: 0 }}>
              Paste a link to a public syllabus page or PDF. Pages behind a login (Canvas pages, MyMav) can&apos;t be fetched, so use Paste for those.
            </p>
          )}
          <div className="row" style={{ flexWrap: "nowrap" }}>
            <input
              className="textin"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && importLink(source)}
              placeholder={source === "canvas" ? "https://mavs.instructure.com/feeds/calendars/user_….ics" : "https://…/syllabus.pdf"}
              aria-label={source === "canvas" ? "Canvas calendar feed link" : "Syllabus link"}
            />
            <button className="btn primary small" disabled={!link.trim() || !!busy} onClick={() => importLink(source)}>
              {busy ?? "Import"}
            </button>
          </div>
        </div>
      )}

      {source === "paste" && (
        <div className="stack" style={{ gap: 8 }}>
          <div className="row">
            <select className="btn small" value={pasteKind} onChange={(e) => setPasteKind(e.target.value)} aria-label="What are you pasting?">
              {PASTE_KINDS.map((k) => <option key={k}>{k}</option>)}
            </select>
            <input className="textin" style={{ flex: 1 }} value={pasteName} onChange={(e) => setPasteName(e.target.value)} placeholder="Name it (optional), e.g. CSE 3318" aria-label="Name" />
          </div>
          <p className="tiny muted" style={{ margin: 0 }}>
            {pasteKind === "MyMav class schedule"
              ? "In MyMav, open your class schedule, select it all and copy. Blaze will know your class times and rooms."
              : pasteKind === "Canvas page"
                ? "Open the Canvas syllabus or assignments page, select all, copy and paste here."
                : "Paste the syllabus text. Dates are pulled out, and Blaze can answer questions about all of it."}
          </p>
          <textarea
            className="paste"
            placeholder={"e.g.\nFall 2026\nHomework 1 due Sep 4\nMidterm Exam Oct 14, 7 PM\nOffice hours: Tue 2-4 PM, ERB 555"}
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
          />
          <div className="row">
            <button className="btn primary small" disabled={!pasted.trim() || !!busy} onClick={importPaste}>{busy ?? "Add it"}</button>
          </div>
        </div>
      )}

      {error && <div className="notice error" role="alert">{error}</div>}
      <div className="row">
        {!compact && <button className="btn small primary" onClick={onSamples}>Try two sample UTA syllabi</button>}
        {!compact && <a className="btn small" href={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/samples/hist1311-syllabus.pdf`} download>Sample PDF 1</a>}
        {!compact && <a className="btn small" href={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/samples/phys1443-syllabus.pdf`} download>Sample PDF 2</a>}
        {ai && setUseAi && (
          <label className="row small" style={{ gap: 6 }} title="Gemini reads messy layouts; every date it finds is checked against the syllabus text">
            <input type="checkbox" checked={!!useAi} onChange={(e) => setUseAi(e.target.checked)} /> Read with Gemini
          </label>
        )}
      </div>
    </div>
  );
}
