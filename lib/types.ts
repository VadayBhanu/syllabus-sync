export type EventKind =
  | "exam"
  | "quiz"
  | "project"
  | "assignment"
  | "lab"
  | "reading"
  | "holiday"
  | "admin"
  | "other";

export type Confidence = "high" | "medium" | "low";

export interface SyllabusEvent {
  id: string;
  courseId: string;
  title: string;
  /** YYYY-MM-DD, local calendar date */
  date: string;
  /** inclusive end date for ranges like "Nov 25-27" */
  endDate?: string;
  /** HH:MM, 24h */
  time?: string;
  kind: EventKind;
  /** percent of final grade, if the syllabus said so */
  weight?: number;
  confidence: Confidence;
  /** why the parser is unsure, shown to the user */
  note?: string;
  /** the original line we read this from */
  source?: string;
  manual?: boolean;
  done?: boolean;
  /** learning voyages: planned study time, the stage it belongs to, what done means, and where to learn it */
  minutes?: number;
  stage?: string;
  goal?: string;
  links?: { label: string; url: string; kind?: string; cost?: string }[];
  /** the explain-it-back question for a learning topic */
  check?: string;
  /** how the learner proved it before ticking it off */
  proof?: { answer: string; verdict: "pass" | "self"; feedback?: string; at: string };
}

export interface Course {
  id: string;
  code: string;
  name: string;
  color: string;
  term?: string;
  fileName?: string;
  /** extracted syllabus text, kept so Blaze can answer questions about it */
  text?: string;
  /** set when this is a self-study roadmap rather than a class */
  learning?: {
    roadmap: { label: string; url: string };
    origin: "curated" | "gemini" | "outline";
    /** "project" for a personal project plan; learning roadmap otherwise */
    kind?: "learning" | "project";
    /** projects: the date it should be done by */
    due?: string;
    hoursPerWeek: number;
    blurb: string;
    stages: string[];
    /** per stage: what it lets you do for others, and certifications that fit */
    stageInfo?: {
      title: string;
      earn?: { canDo: string; gigs: string[]; showIt: string };
      certs?: { label: string; url: string; kind?: string; cost?: string }[];
    }[];
  };
}

export interface ParseReport {
  linesRead: number;
  datesFound: number;
  eventsKept: number;
  skippedNoKeyword: number;
  invalidDates: string[];
  yearSource: "explicit" | "term" | "fallback";
  termLabel?: string;
  warnings: string[];
}

export interface ParseResult {
  courseCode?: string;
  courseName?: string;
  term?: string;
  events: Omit<SyllabusEvent, "id" | "courseId">[];
  report: ParseReport;
}

export const KIND_LABEL: Record<EventKind, string> = {
  exam: "Exam",
  quiz: "Quiz",
  project: "Project",
  assignment: "Assignment",
  lab: "Lab",
  reading: "Reading",
  holiday: "No class",
  admin: "Admin",
  other: "Other",
};

/** Kinds that actually cost you effort; used for load and conflicts */
export const GRADED: EventKind[] = ["exam", "quiz", "project", "assignment", "lab"];
