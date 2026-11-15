import { NextResponse } from "next/server";
import { generate } from "@/lib/gemini";

// Sends syllabus text to Gemini and asks for structured deadlines, each with the exact
// line it came from. The browser then verifies those quotes (lib/verify.ts).

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_CHARS = 60_000;

const schema = {
  type: "OBJECT",
  properties: {
    courseCode: { type: "STRING", nullable: true },
    courseName: { type: "STRING", nullable: true },
    term: { type: "STRING", nullable: true, description: "e.g. Fall 2026" },
    events: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          date: { type: "STRING", description: "YYYY-MM-DD" },
          endDate: { type: "STRING", nullable: true, description: "YYYY-MM-DD, only for multi-day items" },
          time: { type: "STRING", nullable: true, description: "HH:MM 24-hour, only if stated" },
          kind: { type: "STRING", enum: ["exam", "quiz", "project", "assignment", "lab", "reading", "holiday", "admin", "other"] },
          weight: { type: "NUMBER", nullable: true, description: "percent of final grade if stated" },
          sourceQuote: { type: "STRING", description: "the exact text from the syllabus this came from, copied verbatim" },
        },
        required: ["title", "date", "kind", "sourceQuote"],
      },
    },
  },
  required: ["events"],
};

function prompt(text: string, today: string) {
  return `You read college course syllabi and pull out every dated thing a student has to act on: exams, quizzes, homework, projects, labs, readings with dates, no-class days, and academic deadlines like the last day to drop.

Rules:
- Only include items that have a specific calendar date in the text. Skip "Week 5" style items that have no date.
- Skip plain lecture topics that nobody hands in or sits.
- Work out the year from the term (for example "Fall 2026"). If no year appears anywhere, assume the semester closest to ${today}.
- sourceQuote must be copied character for character from the syllabus, usually one line. Never paraphrase it.
- Keep titles short and natural, like "Homework 3" or "Midterm exam".
- Do not invent anything. If unsure, leave it out.

Syllabus text:
"""
${text}
"""`;
}

export async function POST(req: Request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ error: "AI extraction isn't configured on this server." }, { status: 503 });

  let body: { text?: string; today?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const text = (body.text ?? "").slice(0, MAX_CHARS);
  if (text.trim().length < 20) return NextResponse.json({ error: "Not enough text to read." }, { status: 400 });
  const today = /^\d{4}-\d{2}-\d{2}$/.test(body.today ?? "") ? body.today! : new Date().toISOString().slice(0, 10);

  const r = await generate(key, {
    contents: [{ role: "user", parts: [{ text: prompt(text, today) }] }],
    generationConfig: { temperature: 0, responseMimeType: "application/json", responseSchema: schema },
  });
  if (!r.ok) {
    const msg = r.timedOut ? "AI took too long. Using the built-in parser." : r.status === 429 || r.status === 503 ? "AI is busy right now. Using the built-in parser." : "AI extraction failed. Using the built-in parser.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
  let parsed;
  try {
    parsed = JSON.parse(r.text);
  } catch {
    return NextResponse.json({ error: "AI returned something unreadable. Using the built-in parser." }, { status: 502 });
  }
  if (!Array.isArray(parsed?.events)) return NextResponse.json({ error: "AI returned no events." }, { status: 502 });
  return NextResponse.json({ model: r.model, result: parsed });
}
