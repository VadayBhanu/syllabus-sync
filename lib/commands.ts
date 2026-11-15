// App commands Trojan can run without asking Gemini: theme, navigation, timers, export and
// "plan my day". Parsed locally so they're instant, work offline and cost no AI quota.
// Typos are forgiven ("drak mode", "opne the oracel").

import { parseTracker, type TrackerSpec } from "./trackers";

export type View = "voyage" | "learn" | "plan" | "oracle" | "knowledge" | "dashboard" | "calendar" | "list";
export type UiCommand =
  | { type: "theme"; value: "dark" | "light" | "system" }
  | { type: "mode"; value: "academic" | "learning" | "project" }
  | { type: "view"; value: View }
  | { type: "mast" }
  | { type: "tour" }
  | { type: "export" }
  | { type: "plan_today" }
  | { type: "recover"; days: number }
  | { type: "gaps"; score?: number }
  | { type: "tracker"; spec: TrackerSpec }
  | { type: "dashboard" }
  | { type: "course"; value: "hide" | "show"; course: string };

const VOCAB = [
  "dark", "light", "night", "theme", "mode", "switch", "turn", "open", "show", "hide", "go",
  "voyage", "map", "work", "plan", "schedule", "today", "todays", "oracle", "calendar", "list", "deadlines",
  "learning", "path", "project", "academic", "syllabus", "study", "self", "mast", "focus", "timer", "pomodoro",
  "tour", "demo", "take", "start", "stop", "export", "download", "prepare", "build", "make", "university", "roadmap", "grade", "calculator",
  "failed", "quiz", "knowledge", "chart", "star", "dashboard", "tracker", "gaps", "struggling",
  "sick", "lost", "lose", "missed", "semester", "save", "days", "three", "recover", "recovery",
];

function lev(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      // swapped letters ("drak", "oracel") count as one typo
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + 1);
    }
  return dp[a.length][b.length];
}

/** Lowercase, strip punctuation, and snap near-miss words to the app's vocabulary. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9 -]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => {
      if (w.length < 4 || VOCAB.includes(w)) return w;
      let best = w;
      let bestD = w.length >= 7 ? 3 : 2;
      for (const v of VOCAB) {
        const dist = lev(w, v);
        if (dist < bestD) {
          best = v;
          bestD = dist;
        }
      }
      return best;
    })
    .join(" ");
}

const VIEWS: [RegExp, View][] = [
  [/\b(voyage|map)\b/, "voyage"],
  [/\b(oracle|grade calculator|grades?)\b/, "oracle"],
  [/\b(star chart|knowledge|skills? map|gaps)\b/, "knowledge"],
  [/\bcalendar\b/, "calendar"],
  [/\b(learning path|roadmap|project plan|path)\b/, "learn"],
  [/\b(work plan|plan|schedule|study plan|sessions)\b/, "plan"],
  [/\b(list|deadlines|all tasks|all topics)\b/, "list"],
];

/** A command if the message is one, otherwise null (and it goes to Trojan as a question). */
export function parseCommand(text: string, courseCodes: string[] = []): UiCommand | null {
  // "track my gym sessions 3 times a week": a custom tracker, built on the spot
  const spec = parseTracker(text);
  if (spec) return { type: "tracker", spec };
  const t = normalize(text);
  if (!t || t.split(" ").length > 12) return null;
  // questions about things ("when is...", "how is my grade...") are not commands
  if (/^(when|what is|whats|how|why|who|where|which|is|are|do|does|can i|should)\b/.test(t) && !/\b(today|todays)\b.*\b(plan|schedule|work)\b/.test(t)) return null;

  if (/\b(dark|night)\b/.test(t) && /\b(mode|theme|on|switch|turn|go|enable|use)\b|^(dark|night)$/.test(t)) return { type: "theme", value: "dark" };
  if (/\blight\b/.test(t) && /\b(mode|theme|on|switch|turn|go|enable|use)\b|^light$/.test(t)) return { type: "theme", value: "light" };
  if (/\b(system|auto|default)\b.*\b(theme|mode)\b/.test(t)) return { type: "theme", value: "system" };

  if (/\b(prepare|plan|make|build|set up|organi[sz]e|show)\b.*\b(today|todays|my day)\b|\bplan my day\b|\btodays (work|schedule|plan)\b/.test(t)) return { type: "plan_today" };

  if (/\b(build|make|create|show|open|give)\b.*\bdashboard\b|^dashboard$/.test(t)) return { type: "dashboard" };

  // "I failed my concurrency quiz": find the real gap before assigning practice
  if (/\b(failed|fail|flunked|bombed|struggling|struggled|bad)\b.*\b(quiz|test|exam|concurrency|threads?|locks?)\b|\b(knowledge map|star chart|my gaps|what (should|do) i learn next)\b/.test(t)) {
    const sc = t.match(/\b(\d{1,3})\s*percent\b/) ?? t.match(/\b(?:got|scored|score)\s+(?:a\s+|an\s+)?(\d{1,3})\b/);
    return { type: "gaps", score: sc ? Math.min(100, Number(sc[1])) : undefined };
  }

  // "I just got sick and lost three days. Save my semester."
  const sick = /\b(sick|ill|flu|covid|hospital|lost|lose|missed)\b.*\bdays?\b|\bsave my (semester|week|grades?)\b|\b(recovery|recover) plan\b/.test(t);
  if (sick) {
    const NUM: Record<string, number> = { a: 1, one: 1, two: 2, couple: 2, three: 3, few: 3, four: 4, five: 5, six: 6, seven: 7, week: 7 };
    const m = t.match(/\b(\d+|one|two|three|four|five|six|seven|couple|few)\b(?: of)? days?\b/) ?? t.match(/\b(a) week\b/);
    const n = m ? (/^\d+$/.test(m[1]) ? Number(m[1]) : m[0].includes("week") ? 7 : NUM[m[1]] ?? 3) : 3;
    return { type: "recover", days: Math.min(14, Math.max(1, n)) };
  }

  if (/\b(mast|focus|pomodoro)\b|\bstart (a |the )?timer\b/.test(t)) return { type: "mast" };
  if (/\b(tour|demo|walkthrough)\b/.test(t) && !/\bproject\b/.test(t)) return { type: "tour" };
  if (/\b(export|download)\b.*\b(calendar|ics|deadlines|schedule)?\b/.test(t) && /\b(export|download)\b/.test(t)) return { type: "export" };

  const sw = /\b(switch|go|change|open|use|turn|show)\b|\bmode\b/.test(t);
  if (sw && /\b(academic|syllabus|syllabi|university|college|class(es)?)\b/.test(t)) return { type: "mode", value: "academic" };
  if (sw && /\b(self study|self|learning mode|study mode|learn on my own|self learning)\b/.test(t)) return { type: "mode", value: "learning" };
  if (/\bproject mode\b|\b(switch|go|change) to (my )?projects?\b/.test(t)) return { type: "mode", value: "project" };

  const hs = t.match(/\b(hide|show)\b (.+)/);
  if (hs) {
    const want = hs[2].replace(/\b(course|the|my|class)\b/g, "").replace(/\s+/g, "").toLowerCase();
    const code = courseCodes.find((c) => c.replace(/\s+/g, "").toLowerCase() === want || (want.length >= 3 && c.replace(/\s+/g, "").toLowerCase().startsWith(want)));
    if (code) return { type: "course", value: hs[1] as "hide" | "show", course: code };
  }

  if (/\b(open|show|go|go to|take me|switch|view)\b/.test(t)) for (const [re, v] of VIEWS) if (re.test(t)) return { type: "view", value: v };
  return null;
}

/** Commands Gemini can return, as "kind:value" strings, mapped to the same shape. */
export function fromUiString(s: string): UiCommand | null {
  const [k, v = ""] = String(s).split(":");
  if (k === "theme" && ["dark", "light", "system"].includes(v)) return { type: "theme", value: v as "dark" };
  if (k === "mode" && ["academic", "learning", "project"].includes(v)) return { type: "mode", value: v as "academic" };
  if (k === "view" && ["voyage", "learn", "plan", "oracle", "knowledge", "dashboard", "calendar", "list"].includes(v)) return { type: "view", value: v as View };
  if (k === "mast" || k === "tour" || k === "export" || k === "plan_today") return { type: k } as UiCommand;
  if (k === "recover") return { type: "recover", days: Math.min(14, Math.max(1, Number(v) || 3)) };
  return null;
}

export const UI_COMMANDS = [
  "theme:dark", "theme:light", "theme:system",
  "mode:academic", "mode:learning", "mode:project",
  "view:voyage", "view:learn", "view:plan", "view:oracle", "view:knowledge", "view:dashboard", "view:calendar", "view:list",
  "mast", "tour", "export", "plan_today", "recover:3",
];
