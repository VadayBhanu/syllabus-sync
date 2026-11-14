"use client";

import { useRef, useState } from "react";
import { extractPdfText, PdfError } from "@/lib/pdf";

interface Props {
  onText: (text: string, fileName: string) => Promise<void> | void;
  onSamples: () => void;
  compact?: boolean;
  ai?: boolean;
  useAi?: boolean;
  setUseAi?: (v: boolean) => void;
}

export default function Upload({ onText, onSamples, compact, ai, useAi, setUseAi }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pasting, setPasting] = useState(false);
  const [pasted, setPasted] = useState("");

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    for (const file of Array.from(files)) {
      const name = file.name || "syllabus";
      try {
        setBusy(`Reading ${name}…`);
        const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(name);
        const isText = file.type.startsWith("text/") || /\.(txt|md|csv)$/i.test(name);
        if (isPdf) {
          const { text } = await extractPdfText(file);
          if (ai && useAi) setBusy(`Reading ${name} with Gemini…`);
          await onText(text, name);
        } else if (isText) {
          const text = await file.text();
          if (!text.trim()) throw new PdfError(`${name} is empty.`, "empty");
          if (ai && useAi) setBusy(`Reading ${name} with Gemini…`);
          await onText(text, name);
        } else if (/\.docx?$/i.test(name)) {
          throw new PdfError("Word files aren't supported yet. Save it as PDF (File → Save As → PDF) and drop that in.", "invalid");
        } else {
          throw new PdfError(`${name} isn't a PDF or text file.`, "invalid");
        }
      } catch (err) {
        console.warn(err);
        setError(err instanceof PdfError ? err.message : `Something went wrong reading ${name}. Try pasting the text instead.`);
        if (err instanceof PdfError && err.code === "empty") setPasting(true);
      } finally {
        setBusy(null);
      }
    }
    if (input.current) input.current.value = "";
  }

  return (
    <div className="stack" style={{ gap: 10 }}>
      <div
        className={`drop ${over ? "over" : ""} ${compact ? "compact" : ""}`}
        role="button"
        tabIndex={0}
        aria-label="Upload a syllabus PDF"
        onClick={() => input.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        <input ref={input} type="file" accept=".pdf,.txt,.md,application/pdf,text/plain" multiple hidden onChange={(e) => handleFiles(e.target.files)} />
        {busy ? (
          <b>{busy}</b>
        ) : compact ? (
          <span><b>Add another syllabus</b><br /><span className="muted small">Drop a PDF here or click to browse</span></span>
        ) : (
          <>
            <h2>Drop your syllabus PDFs</h2>
            <span className="muted">or click to browse. Several at once is fine.</span>
          </>
        )}
      </div>
      {error && <div className="notice error" role="alert">{error}</div>}
      <div className="row">
        <button className="btn small" onClick={() => setPasting((p) => !p)}>{pasting ? "Hide paste box" : "Paste text instead"}</button>
        {!compact && <button className="btn small primary" onClick={onSamples}>Try two sample UTA syllabi</button>}
        {ai && setUseAi && (
          <label className="row small" style={{ gap: 6 }} title="Gemini reads messy layouts; every date it finds is checked against the syllabus text">
            <input type="checkbox" checked={!!useAi} onChange={(e) => setUseAi(e.target.checked)} /> Read with Gemini
          </label>
        )}
      </div>
      {pasting && (
        <div className="stack" style={{ gap: 8 }}>
          <textarea
            className="paste"
            placeholder={"Paste the schedule part of your syllabus here, e.g.\nFall 2026\nHomework 1 due Sep 4\nMidterm Exam Oct 14, 7 PM"}
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
          />
          <div className="row">
            <button
              className="btn primary small"
              disabled={!pasted.trim()}
              onClick={async () => {
                setBusy(ai && useAi ? "Reading with Gemini…" : "Reading…");
                await onText(pasted, "Pasted syllabus");
                setBusy(null);
                setPasted("");
                setPasting(false);
                setError(null);
              }}
            >
              Chart these dates
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
