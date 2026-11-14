import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    ai: Boolean(process.env.GEMINI_API_KEY),
    sync: Boolean(process.env.MONGODB_URI),
  });
}
