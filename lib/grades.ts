// Pulls the grading breakdown out of a syllabus ("Homework 25%, Midterm 25% ...") and
// answers the question every student asks in week 12: what do I need on the rest?

export interface GradeCategory {
  name: string;
  weight: number;
}

const DATEISH = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2}\b|\b\d{1,2}\/\d{1,2}\b|\b20\d{2}-\d{2}-\d{2}\b/i;

function clean(name: string) {
  return name
    .replace(/\(\s*\d+\s*(total)?\s*\)/gi, "")
    .replace(/\.{2,}|[:\-–|•]+$/g, " ")
    .replace(/^[\s\-–•*|]+/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function parseGrading(text: string): GradeCategory[] {
  const found: GradeCategory[] = [];
  for (const line of text.split("\n")) {
    if (DATEISH.test(line)) continue; // schedule lines like "Oct 14 Midterm (25%)" aren't the breakdown
    for (const seg of line.split(/[,;]|\.\s+| and (?=[A-Z])/)) {
      let nameRaw: string | undefined;
      let w = NaN;
      const a = /^\s*([A-Za-z][A-Za-z0-9 &/'()\-–.]{1,40}?)\s*[:\-–.|]*\s*\(?\s*(\d{1,2}(?:\.\d+)?)\s*%\s*\)?\s*\.?\s*$/.exec(seg);
      const b = /^\s*(\d{1,2}(?:\.\d+)?)\s*%\s*[:\-–]?\s*([A-Za-z][A-Za-z0-9 &/'()\-–]{1,40})\s*$/.exec(seg);
      if (a) [nameRaw, w] = [a[1], parseFloat(a[2])];
      else if (b) [nameRaw, w] = [b[2], parseFloat(b[1])];
      if (!nameRaw) continue;
      const name = clean(nameRaw);
      if (!name || name.length < 3 || w <= 0 || w > 70) continue;
      if (/\b(late|penalty|off|deduct|curve|bonus|extra credit|lose|per day)\b/i.test(seg)) continue;
      if (!found.some((f) => f.name.toLowerCase() === name.toLowerCase())) found.push({ name, weight: w });
    }
  }
  const total = found.reduce((t, c) => t + c.weight, 0);
  // only trust it if it looks like a real breakdown
  return found.length >= 2 && total >= 80 && total <= 110 ? found : [];
}

export interface OracleResult {
  /** grade so far, on the graded part only (0-100), or null if nothing graded */
  current: number | null;
  gradedWeight: number;
  remainingWeight: number;
  /** average needed on everything not yet graded to reach the target, or null if nothing left */
  needed: number | null;
  /** final grade if you score the same as now on the rest */
  projected: number | null;
}

export function oracle(cats: GradeCategory[], scores: Record<string, number | undefined>, target: number): OracleResult {
  const total = cats.reduce((t, c) => t + c.weight, 0) || 100;
  let earned = 0;
  let graded = 0;
  for (const c of cats) {
    const s = scores[c.name];
    if (typeof s === "number" && !isNaN(s)) {
      earned += (s / 100) * c.weight;
      graded += c.weight;
    }
  }
  const remaining = total - graded;
  const current = graded ? (earned / graded) * 100 : null;
  const needed = remaining > 0 ? ((target / 100) * total - earned) / remaining * 100 : null;
  const projected = current === null ? null : current;
  return {
    current: current === null ? null : round(current),
    gradedWeight: graded,
    remainingWeight: remaining,
    needed: needed === null ? null : round(needed),
    projected: projected === null ? null : round(remaining > 0 ? projected : (earned / total) * 100),
  };
}

const round = (n: number) => Math.round(n * 10) / 10;

export const LETTERS: [string, number][] = [["A", 90], ["B", 80], ["C", 70], ["D", 60]];
