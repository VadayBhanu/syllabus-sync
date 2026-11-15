// Sample syllabi for the demo. Course numbers are UTA-style codes, but the
// instructors, policies and dates are made up for illustration.

export const SAMPLE_CSE = `CSE 3318 - Algorithms and Data Structures
The University of Texas at Arlington, Fall 2026, Section 002
Instructor: Dr. A. Rivera   Office: ERB 555   Email: on Canvas

Grading
Homework (6 total) 25%
Quizzes 10%
Midterm Exam 25%
Final Exam 30%
Programming Project 10%

Late policy: you may submit 2 homeworks up to 48 hours late. Anything later than 1/2 a day past that gets no credit.

Course Schedule (tentative)
Week 1  Mon, Aug 24   Introduction, asymptotic notation
Week 1  Fri, Aug 28   Reading: CLRS Ch. 1-3
Week 2  Sep 4         Homework 1 due by 11:59 PM
Week 3  Mon, Sep 7    Labor Day - no class
Week 3  9/11          Quiz 1 (in class)
Week 4  9/18/2026     Homework 2 due 11:59 pm
Week 5  Sept. 25th    Project proposal due (1 page)
Week 6  October 2     Homework 3 due by midnight
Week 7  2026-10-09    Quiz 2
Week 8  Wed, Oct 14   Midterm Exam (25%) 7:00 PM, room NH 100
Week 9  10/23         Homework 4 due
Week 10 Oct 30        Project milestone 1 due
Week 11 Nov 2         Last day to drop classes
Week 11 Nov 6         Homework 5 due
Week 12 Nov 13        Quiz 3
Week 13 Nov 17        Project milestone 2 due 11:59 PM
Week 13 Nov 20        Homework 6 due
Week 14 Nov 26-27     Thanksgiving holiday, no classes
Week 15 Dec 1         Final project presentation in class
Week 15 Dec 4         Project final report due
Final Exam: Wednesday, December 9th, 2:00 PM - 4:30 PM (30%)
`;

export const SAMPLE_MATH = `MATH 3330 Linear Algebra
Fall 2026  |  MWF 10:00-10:50, PKH 107

Important dates
Problem Set 1 ................ due 8/31
Problem Set 2 ................ due 9/14
Exam 1 ....................... Friday 18 September (20%)
Problem Set 3 ................ due 10/5
Exam 2 ....................... Oct 14 in class (20%)
Problem Set 4 ................ due 11/2
Problem Set 5
   due Nov 18
Exam 3 ....................... Wednesday, November 18 (20%)
Thanksgiving break: Nov 25 - 27
Problem Set 6 ................ due 12/2
Final exam ................... Dec 9, 11:00 AM (25%)
`;

// Three messier ones for the five-syllabus stress test: a table pasted from Word, a prose-heavy
// writing course, and a lab course with ordinals, abbreviations and a moved exam.
export const SAMPLE_PHYS = `PHYS 1444 General Technical Physics II
UTA Physics Dept. | Fall 2026 | Sec 003 | SH 101 TuTh 11:00-12:20

GRADE BREAKDOWN:   HW (Mastering) 15% | Labs 15% | Exam I 20% | Exam II 20% | Final 30%

Date       | Topic                         | Due
-----------|-------------------------------|------------------------------
Thu 9/10   | Electric fields               | Mastering HW 1
Thu 10/1   | Exam I (20%)                  |
Tue 10/27  | Circuits                      | Lab report 4
Tue 11/17  | Magnetism                     | Mastering HW 9 due 11:59pm
Thu 11/19  | ** EXAM II (20%) **  SH 101   | (moved from 11/12, see Canvas)
Fri 11/20  |                               | Lab report 6 due
Tue 12/1   | Optics                        | Mastering HW 11
Final Exam: Tues. Dec. 8, 11:00am-1:30pm (30%)
`;

export const SAMPLE_ENGL = `ENGL 1302 Rhetoric and Composition II
Fall 2026

Welcome! This semester we will build one researched argument in stages. Please read every
assignment sheet on Canvas, since the dates below are the ones that count for your grade.

Major assignments and weights
  - Proposal memo (5%), due Friday, September 25 by 11:59 pm
  - Annotated bibliography (15%), due Monday, November 16 before class
  - Researched argument essay, final draft (30%), due Friday, November 20 by 11:59pm
  - Reflection portfolio (10%), due December 4

Peer review workshop is Wednesday, November 18 in class; bring two printed copies of your draft.
No class Nov 25-27 (Thanksgiving).
`;

export const SAMPLE_OS = `CSE 3320 Operating Systems
Fall 2026, Section 001

Grading: Programming assignments 40%, Quizzes 10%, Midterm 20%, Final 30%

Schedule (subject to change)
Aug. 27th  - Intro, processes
Sept 15th  - Assignment 1 (shell) due
Oct 8th    - Midterm exam (20%)
Nov. 12th  - Quiz 4 (concurrency: races, locks, condition variables)
Nov. 13th  - Assignment 3 (threads) released
Nov. 19th  - Quiz 5
Nov. 21st  - Assignment 3 (threads) due, 11:59 PM (10%)
Dec. 3rd   - Assignment 4 (memory allocator) due (10%)
Dec. 10th  - Final exam, 8:00 AM (30%)
`;

export const SAMPLES = [
  { label: "CSE 3318 Algorithms", fileName: "cse3318-sample.txt", text: SAMPLE_CSE },
  { label: "MATH 3330 Linear Algebra", fileName: "math3330-sample.txt", text: SAMPLE_MATH },
];

export const MESSY_SAMPLES = [
  ...SAMPLES,
  { label: "PHYS 1444 Physics II", fileName: "phys1444-table.docx.txt", text: SAMPLE_PHYS },
  { label: "ENGL 1302 Composition II", fileName: "engl1302-prose.txt", text: SAMPLE_ENGL },
  { label: "CSE 3320 Operating Systems", fileName: "cse3320-schedule.txt", text: SAMPLE_OS },
];
