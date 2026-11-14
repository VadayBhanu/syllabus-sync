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
}

export interface Course {
  id: string;
  code: string;
  name: string;
  color: string;
  term?: string;
  fileName?: string;
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
