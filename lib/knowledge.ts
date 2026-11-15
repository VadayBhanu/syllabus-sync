// The star chart: what a student knows, where they're struggling, and what to learn next.
// Concepts are stars and prerequisites are the lines between them. A failed quiz doesn't
// prove which concept is missing; it raises suspicions about the quiz's concepts and the
// ones underneath them. A short diagnostic (one question per suspect) confirms the real gap
// before any practice gets assigned. Everything here is hand-written and runs offline.

import type { Resource } from "./roadmaps";

export type Mastery = "known" | "covered" | "suspect" | "gap" | "next" | "locked";

export interface Question {
  q: string;
  options: string[];
  answer: number;
  /** shown after answering, right or wrong */
  explain: string;
}

export interface Concept {
  id: string;
  label: string;
  /** concepts this one builds on */
  needs: string[];
  /** where it sits on the chart, 0-100 */
  x: number;
  y: number;
  /** week it's taught (the date it's covered by) */
  taught: string;
  question: Question;
  practice: { task: string; minutes: number; links: Resource[] };
}

export interface Assessment {
  id: string;
  title: string;
  /** matches the deadline title in the syllabus */
  match: RegExp;
  covers: string[];
}

export interface KnowledgeMap {
  course: RegExp;
  title: string;
  concepts: Concept[];
  assessments: Assessment[];
}

const ostep = (chapter: string, url: string): Resource => ({ label: `OSTEP (free book): ${chapter}`, url, kind: "docs", cost: "Free" });
const ostepHome: Resource = { label: "Operating Systems: Three Easy Pieces (free book)", url: "https://pages.cs.wisc.edu/~remzi/OSTEP/", kind: "docs", cost: "Free" };

export const OS_MAP: KnowledgeMap = {
  course: /^CSE\s?3320\b/i,
  title: "Concurrency in Operating Systems",
  concepts: [
    {
      id: "processes",
      label: "Processes",
      needs: [],
      x: 10,
      y: 50,
      taught: "2026-08-27",
      question: { q: "What does each process get that another process can't see?", options: ["Its own address space", "Its own CPU core, always", "Its own copy of the operating system", "Nothing; processes share all memory"], answer: 0, explain: "Each process has a private address space. That isolation is exactly what threads give up." },
      practice: { task: "Trace fork() and exec() in a small C program and draw the process tree", minutes: 45, links: [ostep("Processes", "https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-intro.pdf")] },
    },
    {
      id: "threads",
      label: "Threads",
      needs: ["processes"],
      x: 28,
      y: 30,
      taught: "2026-10-20",
      question: { q: "Two threads in the same process share which of these?", options: ["Their stacks", "Their registers", "The heap and global variables", "Their program counters"], answer: 2, explain: "Threads share the heap and globals but each has its own stack, registers and program counter. Shared data is where the trouble starts." },
      practice: { task: "Write a pthreads program that starts 4 threads and joins them; print which data each one can see", minutes: 45, links: [ostep("Concurrency: an introduction", "https://pages.cs.wisc.edu/~remzi/OSTEP/threads-intro.pdf")] },
    },
    {
      id: "race",
      label: "Race conditions",
      needs: ["threads"],
      x: 46,
      y: 50,
      taught: "2026-10-27",
      question: { q: "Two threads each run counter++ 1,000 times with no lock. The result is sometimes below 2,000. Why?", options: ["The compiler skips some increments", "counter++ is a read, an add and a write, and the threads' steps interleave", "Threads can't write to global variables", "The CPU is too slow to finish"], answer: 1, explain: "counter++ is three steps. If both threads read the same old value before either writes, one update is lost. That's a race condition." },
      practice: { task: "Reproduce a lost-update race with two threads, then explain the interleaving that caused it in three sentences", minutes: 40, links: [ostep("Concurrency: an introduction", "https://pages.cs.wisc.edu/~remzi/OSTEP/threads-intro.pdf")] },
    },
    {
      id: "critical",
      label: "Critical sections",
      needs: ["race"],
      x: 62,
      y: 30,
      taught: "2026-10-29",
      question: { q: "Which set of rules must a correct critical-section solution satisfy?", options: ["Speed, fairness, simplicity", "Mutual exclusion, progress, bounded waiting", "Atomicity, consistency, durability", "One thread at a time, forever"], answer: 1, explain: "Only one thread inside at a time, someone waiting can always get in eventually, and nobody waits forever." },
      practice: { task: "Mark the critical section in three short code snippets and say what shared data each protects", minutes: 30, links: [ostep("Locks", "https://pages.cs.wisc.edu/~remzi/OSTEP/threads-locks.pdf")] },
    },
    {
      id: "locks",
      label: "Mutex locks",
      needs: ["critical"],
      x: 78,
      y: 18,
      taught: "2026-11-03",
      question: { q: "A thread calls lock() on a mutex another thread already holds. What happens?", options: ["It gets the lock anyway", "It crashes", "It waits until the other thread unlocks", "The other thread is kicked out"], answer: 2, explain: "lock() blocks (or spins) until the holder calls unlock(). That waiting is what makes the critical section safe." },
      practice: { task: "Fix the lost-update race with a pthread_mutex and measure the slowdown", minutes: 40, links: [ostep("Locks", "https://pages.cs.wisc.edu/~remzi/OSTEP/threads-locks.pdf")] },
    },
    {
      id: "semaphores",
      label: "Semaphores",
      needs: ["locks"],
      x: 92,
      y: 38,
      taught: "2026-11-10",
      question: { q: "A counting semaphore starts at 3. What does that allow?", options: ["Exactly 3 total uses, ever", "Up to 3 threads past wait() at the same time", "3 seconds of access", "Only thread number 3"], answer: 1, explain: "Each wait() decrements and each post() increments. With 3, up to three threads can be inside before the next one blocks." },
      practice: { task: "Solve bounded buffer (producer/consumer) with two semaphores and a mutex", minutes: 50, links: [ostep("Semaphores", "https://pages.cs.wisc.edu/~remzi/OSTEP/threads-sema.pdf")] },
    },
    {
      id: "condvars",
      label: "Condition variables",
      needs: ["locks"],
      x: 80,
      y: 62,
      taught: "2026-11-12",
      question: { q: "Why do you call wait() on a condition variable inside a while loop, not an if?", options: ["It's faster", "After waking, the condition may no longer be true, so check again", "Compilers require it", "wait() only works in loops"], answer: 1, explain: "Another thread may have changed things between the signal and your wake-up, and spurious wake-ups happen. Re-check the condition." },
      practice: { task: "Write a thread-safe queue with a mutex and a condition variable; test it with 3 producers and 3 consumers", minutes: 50, links: [ostep("Condition variables", "https://pages.cs.wisc.edu/~remzi/OSTEP/threads-cv.pdf")] },
    },
    {
      id: "deadlock",
      label: "Deadlock",
      needs: ["locks"],
      x: 64,
      y: 80,
      taught: "2026-11-24",
      question: { q: "Which is NOT one of the four conditions needed for deadlock?", options: ["Mutual exclusion", "Hold and wait", "Preemption", "Circular wait"], answer: 2, explain: "The condition is NO preemption. If the system can take resources away, deadlock can be broken." },
      practice: { task: "Create a two-lock deadlock, then fix it with a global lock order", minutes: 40, links: [ostep("Common concurrency problems", "https://pages.cs.wisc.edu/~remzi/OSTEP/threads-bugs.pdf")] },
    },
    {
      id: "memory",
      label: "Memory allocation",
      needs: ["processes"],
      x: 30,
      y: 78,
      taught: "2026-12-01",
      question: { q: "What causes external fragmentation in a heap allocator?", options: ["Free memory split into small gaps that can't fit a large request", "Allocating too little memory", "Using threads", "A full disk"], answer: 0, explain: "Plenty of free bytes, but scattered in pieces too small for the request." },
      practice: { task: "Implement first-fit on a fixed array and print the free list after each malloc and free", minutes: 60, links: [ostep("Free-space management", "https://pages.cs.wisc.edu/~remzi/OSTEP/vm-freespace.pdf")] },
    },
  ],
  assessments: [
    { id: "quiz4", title: "Quiz 4: concurrency", match: /quiz 4/i, covers: ["race", "locks", "condvars"] },
    { id: "midterm", title: "Midterm", match: /midterm/i, covers: ["processes"] },
  ],
};

export const MAPS = [OS_MAP];
export const mapFor = (code: string) => MAPS.find((m) => m.course.test(code));
export const RESOURCE_HOME = ostepHome;

export interface KnowledgeState {
  /** concept id -> what we know about it */
  status: Record<string, "known" | "suspect" | "gap">;
  /** assessment id -> score out of 100, when it went badly */
  failed?: { id: string; score: number };
  /** concept ids asked in the current diagnostic */
  diagnostic?: string[];
  answers?: Record<string, number>;
}

/** Every concept below these ones, nearest first. */
export function prerequisites(map: KnowledgeMap, ids: string[]): string[] {
  const out: string[] = [];
  const by = new Map(map.concepts.map((c) => [c.id, c]));
  const walk = (id: string) => {
    for (const n of by.get(id)?.needs ?? []) {
      if (!out.includes(n)) {
        out.push(n);
        walk(n);
      }
    }
  };
  ids.forEach(walk);
  return out;
}

/**
 * A failed quiz makes its own concepts suspect, plus their prerequisites that came recently
 * (older foundations confirmed by passed work, like the midterm, stay trusted).
 */
export function suspectsFrom(map: KnowledgeMap, assessment: Assessment, state: KnowledgeState): string[] {
  const own = assessment.covers;
  const below = prerequisites(map, own).filter((id) => !own.includes(id) && state.status[id] !== "known");
  const when = (id: string) => map.concepts.find((c) => c.id === id)?.taught ?? "";
  // foundations first, so the diagnostic climbs from the bottom of the chart
  return [...new Set([...below, ...own])].sort((a, b) => when(a).localeCompare(when(b)));
}

/** Wrong answers become confirmed gaps; right answers clear the suspicion. */
export function grade(state: KnowledgeState, map: KnowledgeMap): KnowledgeState {
  const status = { ...state.status };
  for (const id of state.diagnostic ?? []) {
    const c = map.concepts.find((x) => x.id === id);
    const a = state.answers?.[id];
    if (!c || a === undefined) continue;
    status[id] = a === c.question.answer ? "known" : "gap";
  }
  return { ...state, status };
}

/** The gaps to fix first: confirmed gaps whose own prerequisites aren't gaps too. */
export function rootGaps(map: KnowledgeMap, state: KnowledgeState): string[] {
  const gaps = map.concepts.filter((c) => state.status[c.id] === "gap");
  return gaps.filter((c) => !prerequisites(map, [c.id]).some((p) => state.status[p] === "gap")).map((c) => c.id);
}

/** What each star looks like right now. */
export function masteryOf(map: KnowledgeMap, state: KnowledgeState, today: string): Record<string, Mastery> {
  const out: Record<string, Mastery> = {};
  const solid = (id: string) => {
    const s = state.status[id];
    if (s) return s === "known";
    const c = map.concepts.find((x) => x.id === id)!;
    return c.taught <= today;
  };
  for (const c of map.concepts) {
    const s = state.status[c.id];
    if (s === "gap" || s === "suspect" || s === "known") out[c.id] = s;
    else if (c.taught <= today) out[c.id] = "covered";
    else out[c.id] = c.needs.every(solid) ? "next" : "locked";
  }
  return out;
}

export function startOfMap(map: KnowledgeMap): KnowledgeState {
  // anything a passed exam covered counts as known
  const status: KnowledgeState["status"] = {};
  for (const a of map.assessments) if (a.id === "midterm") for (const id of a.covers) status[id] = "known";
  return { status };
}
