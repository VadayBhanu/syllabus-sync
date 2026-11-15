// App commands Trojan can run without asking Gemini: theme, navigation, timers, export and
// "plan my day". Parsed locally so they're instant, work offline and cost no AI quota.
// Typos are forgiven ("drak mode", "opne the oracel").

export type View = "voyage" | "learn" | "plan" | "oracle" | "calendar" | "list";
export type UiCommand =
  | { type: "theme"; value: "dark" | "light" | "system" }
  | { type: "mode"; value: "academic" | "learning" | "project" }
  | { type: "view"; value: View }
  | { type: "mast" }
  | { type: "tour" }
  | { type: "export" }
  | { type: "plan_today" }
  | { type: "course"; value: "hide" | "show"; course: string };

const VOCAB = [
  "dark", "light", "night", "theme", "mode", "switch", "turn", "open", "show", "hide", "go",
  "voyage", "map", "work", "plan", "schedule", "today", "todays", "oracle", "calendar", "list", "deadlines",
  "learning", "path", "project", "academic", "syllabus", "study", "self", "mast", "focus", "timer", "pomodoro",
  "tour", "demo", "take", "start", "stop", "export", "download", "prepare", "build", "make", "university", "roadmap", "grade", "calculator",
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
  [/\bcalendar\b/, "calendar"],
  [/\b(learning path|roadmap|project plan|path)\b/, "learn"],
  [/\b(work plan|plan|schedule|study plan|sessions)\b/, "plan"],
  [/\b(list|deadlines|all tasks|all topics)\b/, "list"],
];

/** A command if the message is one, otherwise null (and it goes to Trojan as a question). */
export function parseCommand(text: string, courseCodes: string[] = []): UiCommand | null {
  const t = normalize(text);
  if (!t || t.split(" ").length > 12) return null;
  // questions about things ("when is...", "how is my grade...") are not commands
  if (/^(when|what is|whats|how|why|who|where|which|is|are|do|does|can i|should)\b/.test(t) && !/\b(today|todays)\b.*\b(plan|schedule|work)\b/.test(t)) return null;

  if (/\b(dark|night)\b/.test(t) && /\b(mode|theme|on|switch|turn|go|enable|use)\b|^(dark|night)$/.test(t)) return { type: "theme", value: "dark" };
  if (/\blight\b/.test(t) && /\b(mode|theme|on|switch|turn|go|enable|use)\b|^light$/.test(t)) return { type: "theme", value: "light" };
  if (/\b(system|auto|default)\b.*\b(theme|mode)\b/.test(t)) return { type: "theme", value: "system" };

  if (/\b(prepare|plan|make|build|set up|organi[sz]e|show)\b.*\b(today|todays|my day)\b|\bplan my day\b|\btodays (work|schedule|plan)\b/.test(t)) return { type: "plan_today" };

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
  if (k === "view" && ["voyage", "learn", "plan", "oracle", "calendar", "list"].includes(v)) return { type: "view", value: v as View };
  if (k === "mast" || k === "tour" || k === "export" || k === "plan_today") return { type: k } as UiCommand;
  return null;
}

export const UI_COMMANDS = [
  "theme:dark", "theme:light", "theme:system",
  "mode:academic", "mode:learning", "mode:project",
  "view:voyage", "view:learn", "view:plan", "view:oracle", "view:calendar", "view:list",
  "mast", "tour", "export", "plan_today",
];
