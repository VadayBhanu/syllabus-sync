// One place that talks to Gemini. Google retires model names and busy models return 503,
// so we try the configured model first and fall back to others instead of failing the demo.

// Free-tier keys get a small daily quota per model, so spreading over several models keeps
// Gemini features alive longer before the app drops to its offline mode.
const FALLBACKS = ["gemini-3.5-flash", "gemini-3.8-flash", "gemini-3.7-flash", "gemini-flash-latest", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite"];

export interface GeminiResult {
  ok: boolean;
  status: number;
  /** concatenated text of the first candidate */
  text: string;
  model?: string;
  timedOut?: boolean;
}

export async function generate(key: string, body: unknown, totalMs = 45_000, perTryMs = 25_000, fast = false): Promise<GeminiResult> {
  // "fast" asks for light thinking, which cuts long structured answers from ~50s to ~15s.
  // If a model rejects that setting, we retry it once without.
  let req = body as { generationConfig?: Record<string, unknown> };
  if (fast) req = { ...req, generationConfig: { ...(req.generationConfig ?? {}), thinkingConfig: { thinkingLevel: "low" } } };
  const models = [...new Set([process.env.GEMINI_MODEL, ...FALLBACKS].filter(Boolean) as string[])];
  const deadline = Date.now() + totalMs;
  let last: GeminiResult = { ok: false, status: 502, text: "" };
  for (const model of models) {
    const left = deadline - Date.now();
    if (left < 3000) break;
    const controller = new AbortController();
    // don't let one slow model eat the whole budget
    const timer = setTimeout(() => controller.abort(), Math.min(left, perTryMs));
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        signal: controller.signal,
        body: JSON.stringify(req),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
        return { ok: true, status: 200, text, model };
      }
      const detail = (await res.text()).slice(0, 300);
      console.error("gemini", model, res.status, detail);
      last = { ok: false, status: res.status, text: "", model };
      // bad key or bad request won't get better with another model
      if (res.status === 400 && fast && /thinking/i.test(detail)) {
        // this model doesn't take thinking settings; try it again plainly
        clearTimeout(timer);
        return generate(key, body, Math.max(5000, deadline - Date.now()), perTryMs, false);
      }
      if (res.status === 400 || res.status === 401 || res.status === 403) return last;
    } catch (err) {
      last = { ok: false, status: 504, text: "", model, timedOut: (err as Error)?.name === "AbortError" };
    } finally {
      clearTimeout(timer);
    }
  }
  return last;
}
