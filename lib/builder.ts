// AI Builder (developer level). Gemini drafts a new feature as one self-contained React
// component. It never touches the live site: the draft is checked here for anything unsafe,
// previewed in a sandboxed iframe with sample data only, and handed to a developer to review.

export interface FeatureDraft {
  name: string;
  summary: string;
  /** a single function component named Feature, JSX, no imports */
  code: string;
  tests: string[];
  risks: string[];
  offline?: boolean;
}

export interface Check {
  label: string;
  ok: boolean;
  detail?: string;
}

const BANNED: [RegExp, string][] = [
  [/\b(fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon)\b/, "makes network calls"],
  [/\b(eval|Function\s*\(|setTimeout\s*\(\s*["'`])/, "runs strings as code"],
  [/\b(localStorage|sessionStorage|indexedDB|document\.cookie)\b/, "reads or writes stored data"],
  [/\b(window\.(parent|top|opener)|parent\.postMessage|top\.location)\b/, "reaches outside its sandbox"],
  [/\bimport\s|require\s*\(/, "imports modules"],
  [/dangerouslySetInnerHTML|innerHTML\s*=/, "injects raw HTML"],
];

/** Static checks a reviewer would run before a draft goes anywhere near production. */
export function checkDraft(d: FeatureDraft): Check[] {
  const code = d.code ?? "";
  const checks: Check[] = [
    { label: "Defines one component named Feature", ok: /function\s+Feature\s*\(|const\s+Feature\s*=/.test(code) },
    { label: "Under 250 lines", ok: code.split("\n").length <= 250, detail: `${code.split("\n").length} lines` },
  ];
  for (const [re, why] of BANNED) {
    const hit = code.match(re);
    checks.push({ label: `Never ${why}`, ok: !hit, detail: hit ? `found "${hit[0]}"` : undefined });
  }
  checks.push({ label: "Comes with test cases", ok: (d.tests ?? []).length >= 2, detail: `${(d.tests ?? []).length} listed` });
  return checks;
}

/** HTML for the sandboxed preview iframe: React and Babel served by this site, the draft, nothing else. */
export function previewHtml(code: string, base = ""): string {
  const safe = code.replace(/<\/script/gi, "<\\/script");
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{font:14px/1.45 system-ui,sans-serif;margin:12px;color:#1c2433;background:#fffdf8}button{font:inherit;cursor:pointer}</style>
<script src="${base}/builder/react.production.min.js"></script>
<script src="${base}/builder/react-dom.production.min.js"></script>
<script src="${base}/builder/babel.min.js"></script>
</head><body><div id="root"></div>
<script>window.onerror=function(m){document.getElementById('root').innerHTML='<p style="color:#a32a1c">Preview error: '+String(m).replace(/</g,'&lt;')+'</p>'}</script>
<script type="text/babel" data-presets="react">
const { useState, useMemo, useEffect } = React;
${safe}
ReactDOM.createRoot(document.getElementById('root')).render(<Feature />);
</script></body></html>`;
}

/** Shown when Gemini isn't reachable, so the builder can still be demonstrated honestly. */
export const OFFLINE_DRAFT: FeatureDraft = {
  name: "Exam countdown with study streak",
  summary: "A card that counts down to the next exam and tracks how many days in a row you studied for it, with a one-tap check-in.",
  offline: true,
  code: `function Feature() {
  const exam = { title: "CSE 3320 Final exam", date: "2026-12-10" };
  const [days, setDays] = useState([true, false, true, true, true, true, true]);
  const left = Math.max(0, Math.ceil((new Date(exam.date) - new Date("2026-11-15")) / 86400000));
  let streak = 0;
  for (let i = days.length - 1; i >= 0 && days[i]; i--) streak++;
  return (
    <div style={{ border: "1px solid #e3dccb", borderRadius: 14, padding: 16, maxWidth: 360 }}>
      <div style={{ fontSize: 12, color: "#6b7280" }}>Next exam</div>
      <div style={{ fontSize: 18, fontWeight: 700 }}>{exam.title}</div>
      <div style={{ fontSize: 40, fontWeight: 800, color: "#1f5f8b" }}>{left} days</div>
      <div style={{ display: "flex", gap: 6, margin: "10px 0" }}>
        {days.map((d, i) => (
          <span key={i} title={"Day " + (i + 1)} style={{ width: 22, height: 22, borderRadius: 6, background: d ? "#f6c453" : "#e5e8ee" }} />
        ))}
      </div>
      <div style={{ marginBottom: 10 }}>Study streak: <b>{streak} day{streak === 1 ? "" : "s"}</b></div>
      <button onClick={() => setDays([...days.slice(1), true])} style={{ padding: "8px 14px", borderRadius: 999, border: 0, background: "#1f5f8b", color: "#fff" }}>
        I studied today
      </button>
    </div>
  );
}`,
  tests: [
    "Shows the number of whole days until the exam date, never negative",
    "Streak counts consecutive studied days ending today and resets after a missed day",
    "Clicking 'I studied today' adds a day and the streak grows by one",
  ],
  risks: ["Uses sample data; wiring it to real deadlines needs the app's event list passed in as a prop"],
};
