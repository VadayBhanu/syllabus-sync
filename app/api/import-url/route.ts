import { NextResponse } from "next/server";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

// Fetches a public syllabus page, PDF or calendar feed (e.g. a Canvas .ics link) for the
// browser. Only public http(s) addresses: private networks and localhost are refused.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 8 * 1024 * 1024;

function privateIp(ip: string): boolean {
  if (isIP(ip) === 6) {
    const l = ip.toLowerCase();
    if (l === "::1" || l.startsWith("fc") || l.startsWith("fd") || l.startsWith("fe80")) return true;
    const v4 = /::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(l);
    return v4 ? privateIp(v4[1]) : false;
  }
  const [a, b] = ip.split(".").map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
}

async function safeUrl(raw: string): Promise<URL | string> {
  let url: URL;
  try {
    url = new URL(raw.trim().replace(/^webcal:\/\//i, "https://"));
  } catch {
    return "That doesn't look like a link.";
  }
  if (!["http:", "https:"].includes(url.protocol)) return "Only http and https links work.";
  if (url.username || url.password) return "Links with passwords in them aren't allowed.";
  try {
    const addrs = await lookup(url.hostname, { all: true });
    if (!addrs.length || addrs.some((a) => privateIp(a.address))) return "That address isn't public.";
  } catch {
    return "Couldn't find that website.";
  }
  return url;
}

function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|noscript|svg|head)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h[1-6]|section|article|table|ul|ol)>/gi, "\n")
    .replace(/<\/(td|th)>/gi, "  |  ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

export async function POST(req: Request) {
  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  let target = await safeUrl(body.url ?? "");
  if (typeof target === "string") return NextResponse.json({ error: target }, { status: 400 });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    // follow redirects by hand so each hop is checked too
    let res: Response | null = null;
    for (let hop = 0; hop < 4; hop++) {
      res = await fetch(target, { redirect: "manual", signal: controller.signal, headers: { "User-Agent": "SyllabusSync/1.0 (student calendar tool)", Accept: "*/*" } });
      if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
        const next = await safeUrl(new URL(res.headers.get("location")!, target).toString());
        if (typeof next === "string") return NextResponse.json({ error: next }, { status: 400 });
        target = next;
        continue;
      }
      break;
    }
    if (!res || !res.ok) {
      const code = res?.status ?? 0;
      return NextResponse.json(
        { error: code === 401 || code === 403 ? "That page needs a login. Download it or copy its text instead." : `The site answered with an error (${code}).` },
        { status: 502 },
      );
    }
    const len = Number(res.headers.get("content-length") ?? 0);
    if (len > MAX_BYTES) return NextResponse.json({ error: "That file is too big." }, { status: 413 });
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_BYTES) return NextResponse.json({ error: "That file is too big." }, { status: 413 });
    const type = (res.headers.get("content-type") ?? "").toLowerCase();
    const name = decodeURIComponent(target.pathname.split("/").pop() || target.hostname);

    if (type.includes("pdf") || buf.subarray(0, 5).toString() === "%PDF-") {
      return NextResponse.json({ kind: "pdf", name, base64: buf.toString("base64") });
    }
    const text = buf.toString("utf8");
    if (type.includes("calendar") || /BEGIN:VCALENDAR/.test(text.slice(0, 2000))) return NextResponse.json({ kind: "ics", name, text });
    if (type.includes("html") || /<html|<body|<div/i.test(text.slice(0, 3000))) {
      const t = htmlToText(text);
      if (/sign in|log ?in|single sign-on|password/i.test(t.slice(0, 1500)) && t.length < 4000)
        return NextResponse.json({ error: "That page is behind a login. Open it yourself and copy the text, or download the PDF." }, { status: 422 });
      return NextResponse.json({ kind: "text", name, text: t.slice(0, 200_000) });
    }
    return NextResponse.json({ kind: "text", name, text: text.slice(0, 200_000) });
  } catch (err) {
    return NextResponse.json({ error: (err as Error)?.name === "AbortError" ? "That site took too long to answer." : "Couldn't fetch that link." }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}
