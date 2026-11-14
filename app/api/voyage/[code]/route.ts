import { NextResponse } from "next/server";
import { db } from "@/lib/mongo";

// A "voyage" is one student's semester: their courses, deadlines and study sessions,
// stored in three collections and keyed by a short shareable code.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CODE = /^[a-z]{3,12}-[a-z0-9]{4,12}$/;
const MAX_BYTES = 800_000;

type Ctx = { params: Promise<{ code: string }> };

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

const strip = <T extends Record<string, unknown>>(docs: T[]) => docs.map(({ _id, voyage, ...rest }) => (void _id, void voyage, rest));

export async function GET(_req: Request, { params }: Ctx) {
  const { code } = await params;
  if (!process.env.MONGODB_URI) return bad("Cloud sync isn't configured.", 503);
  if (!CODE.test(code)) return bad("That voyage code doesn't look right.");
  try {
    const d = await db();
    const [meta, courses, events, sessions] = await Promise.all([
      d.collection("voyages").findOne({ _id: code as unknown as never }),
      d.collection("courses").find({ voyage: code }).toArray(),
      d.collection("deadlines").find({ voyage: code }).sort({ date: 1 }).toArray(),
      d.collection("sessions").find({ voyage: code }).sort({ date: 1 }).toArray(),
    ]);
    if (!meta) return bad("No voyage with that code.", 404);
    return NextResponse.json({ courses: strip(courses), events: strip(events), sessions: strip(sessions), plan: meta.plan, updatedAt: meta.updatedAt });
  } catch (err) {
    console.error("voyage load", err);
    return bad("Couldn't reach the database.", 503);
  }
}

export async function PUT(req: Request, { params }: Ctx) {
  const { code } = await params;
  if (!process.env.MONGODB_URI) return bad("Cloud sync isn't configured.", 503);
  if (!CODE.test(code)) return bad("That voyage code doesn't look right.");
  const raw = await req.text();
  if (raw.length > MAX_BYTES) return bad("Too much data to sync.", 413);
  let body: { courses?: unknown[]; events?: unknown[]; sessions?: unknown[]; plan?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return bad("Bad JSON.");
  }
  const arr = (x: unknown) => (Array.isArray(x) ? (x.filter((v) => v && typeof v === "object") as Record<string, unknown>[]) : []);
  const courses = arr(body.courses).slice(0, 30);
  const events = arr(body.events).slice(0, 2000);
  const sessions = arr(body.sessions).slice(0, 4000);
  try {
    const d = await db();
    const now = new Date();
    // replace the whole voyage: simple, and fine at this size
    await Promise.all(["courses", "deadlines", "sessions"].map((c) => d.collection(c).deleteMany({ voyage: code })));
    const tag = (xs: Record<string, unknown>[]) => xs.map((x) => ({ ...x, voyage: code }));
    await Promise.all([
      courses.length && d.collection("courses").insertMany(tag(courses)),
      events.length && d.collection("deadlines").insertMany(tag(events)),
      sessions.length && d.collection("sessions").insertMany(tag(sessions)),
    ]);
    await d.collection("voyages").updateOne(
      { _id: code as unknown as never },
      { $set: { plan: body.plan ?? null, updatedAt: now, counts: { courses: courses.length, deadlines: events.length, sessions: sessions.length } }, $setOnInsert: { createdAt: now } },
      { upsert: true },
    );
    return NextResponse.json({ ok: true, updatedAt: now });
  } catch (err) {
    console.error("voyage save", err);
    return bad("Couldn't save to the database.", 503);
  }
}
