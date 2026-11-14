// Client-side PDF text extraction. The file never leaves the browser.

export class PdfError extends Error {
  constructor(message: string, public readonly code: "password" | "invalid" | "empty" | "too-big" | "unknown") {
    super(message);
  }
}

const MAX_BYTES = 20 * 1024 * 1024;

export async function extractPdfText(file: File): Promise<{ text: string; pages: number }> {
  if (file.size > MAX_BYTES) throw new PdfError("That PDF is over 20 MB. Syllabi are usually much smaller, so this might be the wrong file.", "too-big");
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/pdf.worker.min.mjs`;

  const data = new Uint8Array(await file.arrayBuffer());
  let doc;
  try {
    doc = await pdfjs.getDocument({ data, isEvalSupported: false }).promise;
  } catch (err: unknown) {
    const name = (err as { name?: string })?.name;
    if (name === "PasswordException") throw new PdfError("This PDF is password-protected. Open it, print to a new PDF, and try again.", "password");
    if (name === "InvalidPDFException") throw new PdfError("This file doesn't look like a valid PDF. It may be corrupted or misnamed.", "invalid");
    throw new PdfError("Couldn't open this PDF. Try pasting the syllabus text instead.", "unknown");
  }

  const pages: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    pages.push(itemsToLines(content.items as TextItem[]));
  }
  await doc.destroy();
  const text = pages.join("\n");
  if (text.replace(/\s/g, "").length < 20)
    throw new PdfError("No text found in this PDF. It's probably a scanned image. Paste the text instead, or use a text-based PDF from Canvas.", "empty");
  return { text, pages: doc.numPages };
}

interface TextItem {
  str: string;
  transform: number[];
  width: number;
  hasEOL?: boolean;
}

/**
 * pdf.js gives us loose text fragments with coordinates. Group fragments that sit on
 * the same baseline into one line, left to right, so table rows like
 * "Week 4 | Sep 18 | Homework 2 due" stay together.
 */
export function itemsToLines(items: TextItem[]): string {
  const rows: { y: number; parts: { x: number; w: number; s: string }[] }[] = [];
  for (const it of items) {
    if (!it.str || !it.transform) continue;
    const x = it.transform[4];
    const y = it.transform[5];
    let row = rows.find((r) => Math.abs(r.y - y) < 3);
    if (!row) {
      row = { y, parts: [] };
      rows.push(row);
    }
    row.parts.push({ x, w: it.width, s: it.str });
  }
  rows.sort((a, b) => b.y - a.y);
  return rows
    .map((r) => {
      r.parts.sort((a, b) => a.x - b.x);
      let out = "";
      let lastEnd = -Infinity;
      for (const p of r.parts) {
        const gap = p.x - lastEnd;
        if (out && gap > 18) out += "  |  ";
        else if (out && gap > 1 && !out.endsWith(" ") && !p.s.startsWith(" ")) out += " ";
        out += p.s;
        lastEnd = p.x + p.w;
      }
      return out.trim();
    })
    .filter(Boolean)
    .join("\n");
}
