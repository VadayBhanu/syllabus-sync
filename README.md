# SyllabusSync

**Your semester is a voyage. This is the map.**

Every course hands you a syllabus with fifteen dates buried in it, in a different format each time. SyllabusSync reads those PDFs, pulls out every exam, quiz, project and homework date, and puts the whole semester on one map so you can see the bad weeks coming before you're in them.

Built solo at HackUTA 2026 (theme: Homer's *Odyssey*).

**Try it:** https://syllabus-sync-gules.vercel.app (full version with Gemini). A static preview without server features is at https://vadaybhanu.github.io/syllabus-sync/.

## What it does

- **Bring your syllabus in any way you have it.**
  - Drop in PDFs (several at once). Text is extracted in the browser with pdf.js.
  - Paste a link to a public syllabus page or PDF.
  - Paste your UTA Canvas **calendar feed** link (Canvas → Calendar → Calendar Feed). Every assignment and exam from all your courses comes in, grouped by course. No password needed.
  - Paste anything else: a Canvas page, your MyMav class schedule, your own notes. Pages behind a university login can't be fetched, and SyllabusSync never asks for your university password, so copy and paste works for those.
  - Everything you add becomes something Trojan can answer questions about.
- **Finds the dates.** A pattern parser handles `Sep 4`, `Sept. 4th`, `September 4, 2026`, `9/4`, `09/04/26`, `2026-09-04`, `4 September`, `the 4th of September`, ranges like `Nov 25-27`, times like `11:59 PM`, `noon`, `midnight`, and grade weights like `(25%)`.
- **Works out the year.** Most syllabi never write it. We read the term ("Fall 2026", "2026 Fall", "Fall '26") and pick the year that puts each date inside that term, so a January date in a fall syllabus lands in the next year.
- **Optional Gemini pass for messy syllabi.** Gemini returns structured deadlines, and each one has to quote the line it came from. We check every quote against the actual text and re-parse the date out of it. Anything that doesn't match is flagged, and anything the AI missed but the pattern parser found is still added for review.
- **Voyage map.** Each week is an island on the route from Troy (first deadline) to Ithaca (last exam). Island size is that week's workload, flags are individual deadlines in course colours, and a ship marks today.
  - **Scylla & Charybdis:** two big things on the same day.
  - **Storm:** three or more graded items within three days.
  - **Siren song:** something due on a day the syllabus says there's no class (usually a typo worth asking about).
  - **Safe harbor:** a holiday week.
- **Work plan.** Turns deadlines into study sessions spread over the days before each one, within the hours you say you have per day. Overloaded days are flagged. Sessions can be renamed, resized, moved, finished or deleted, and anything you touch stays put when the plan rebalances.
- **Trojan, the wooden horse.** The Greeks hid soldiers inside a horse; your answers are hiding inside your syllabi. Trojan is a study assistant drawn as a little wooden horse on wheels. Ask anything about your classes in plain English: "how is my grade calculated?", "what's the late policy?", "what should I do this week?", then keep going with follow-ups like "and when is that exam?". Trojan can also act on your schedule: "plan my next 3 days", "move my Exam 3 study session to Monday", "add my ACM meeting Thursday at 6", "export my calendar". Every change shows up as a card you Apply or Skip, so nothing changes without you. Trojan answers only from your syllabi, deadlines and study plan (Gemini, with the conversation as history), shows the exact syllabus line behind each answer, and we check that each quoted line really exists. Without a Gemini key it still answers deadline questions and searches your syllabi.
- **Mast mode.** Odysseus had himself tied to the mast to sail past the Sirens. This focus timer sails a ship to the next island as you work, and if you switch tabs the Sirens start singing and it counts how many times they got you. Finished sessions are checked off in your plan.
- **The Oracle.** Reads the grade weights from your syllabus and tells you the exact average you need on the rest of the class for an A (or that "even the gods can't get you there"), with a what-if slider.
- **The Cyclops and the Lotus-eaters.** Your biggest exam ahead gets an eye on the map. Past work you never checked off is flagged, with one click to tick it all off.
- **Talk to Trojan.** Ask out loud with the mic button and hear answers spoken back (browser speech, no extra keys).
- **Learning voyages, for learning without a syllabus.** Not everyone learns in a class. Pick a goal (AI and machine learning, data analysis, frontend web, cyber security) or type any goal, and you get a staged roadmap on the same voyage map, scheduled at your pace and fed into the work plan.
  - **Recommended links for every topic:** courses, YouTube channels and docs (Andrew Ng, fast.ai, 3Blue1Brown, StatQuest, Karpathy, CS50, Corey Schafer, Kevin Powell, Professor Messer, Kaggle Learn, Hugging Face and more), each marked Free, Free to audit or Paid.
  - **Certifications per stage** (Kaggle, freeCodeCamp, Microsoft AI-900 and PL-300, AWS AI Practitioner, Google Data Analytics and Cybersecurity, Meta Front-End, CompTIA Security+ and others), marked free or paid.
  - **Put it to work:** every stage says what you can now do for someone, the kinds of student work it opens (freelance gigs, campus jobs, internships, competitions) and how to show it. Opportunities, never income promises.
  - **Prove it before you tick it:** each topic has an explain-it-back question. With Gemini on, it reads your answer like a tutor, says what's missing and asks a follow-up, without giving the answer away. Offline, answers must be at least 30 words and mostly typed, not pasted. Projects need a link.
  - **Learn with AI, not by AI:** five rules on the page, a "Quiz me" button on every topic that opens Trojan as a quizmaster, and Trojan is told to give hints before answers on roadmap topics.
  - For goals we haven't curated, Gemini drafts the topics, questions and opportunities, and the app attaches search links itself, so you never see a URL a model made up.
  - **About roadmap.sh:** its roadmaps are great, but their licence allows linking, not copying. So every outline here is our own, and each track links to the matching roadmap.sh roadmap ("Full map") for the complete community version, with credit.
- **Guided demo.** "Take the 60-second guided demo" loads sample syllabi and walks through every feature.
- **Calendar, list and countdowns.** Month calendar, a full list with a "needs a look" filter for low-confidence items, and live countdowns to the next deadlines.
- **Export to any calendar.** RFC 5545 `.ics` with reminders (2 days before exams and projects, 1 day before everything else).
- **Take it with you (optional).** With MongoDB configured, your courses, deadlines and study sessions sync to a short voyage code like `ithaca-x7k2m9` that you can open on another device.

## Robustness

- Password-protected, corrupted, oversized and scanned (image-only) PDFs each get a clear message, and scanned ones open the paste box.
- Impossible dates (`Feb 30`) are rejected and listed in the import summary instead of crashing.
- `you may submit 2 late labs` and `1/2 a letter grade` are not read as dates.
- Day/month swaps (`25/09`) are detected and flagged.
- Dates far outside the detected term are flagged for review.
- Re-importing the same course replaces it rather than doubling every deadline. Your manual additions survive.
- Every extracted item keeps the original line so you can check it in the editor.
- If Gemini is down, rate-limited, slow or returns junk, the app falls back to the built-in parser and says so.
- Works with no server keys at all. Everything is saved in your browser.

Run the tests with `npm test` (parser formats, year inference, edge cases, AI verification, and the planner).

## Running it

```bash
npm install      # also copies the pdf.js worker into /public
npm run dev      # http://localhost:3000
npm test
```

Optional environment variables (see `.env.example`):

| Variable | What it enables |
| --- | --- |
| `GEMINI_API_KEY` | "Read with Gemini" on upload, and Trojan's full chat mode |
| `GEMINI_MODEL` | Override the model (default `gemini-3.5-flash`, falling back to other Flash models if one is busy or retired) |
| `MONGODB_URI` | Cloud sync of courses, deadlines and study sessions |
| `MONGODB_DB` | Database name (default `syllabus_sync`) |

## Stack

Next.js 15 (App Router) and TypeScript, pdf.js for in-browser PDF text, plain CSS, Vitest. Gemini via its REST API with a JSON response schema. MongoDB Atlas with `courses`, `deadlines`, `sessions` and `voyages` collections.

## Sample data

`lib/sample.ts` has two sample syllabi and `public/samples/hist1311-syllabus.pdf` is a sample PDF with a schedule table (generated by `scripts/make-sample-pdf.py`). The course codes look like UTA's, but the instructors, policies and dates are made up.

## How this was built

All code was written during HackUTA 2026 (Nov 14 to 15). I used Claude (Anthropic's AI assistant) as a pair programmer: it wrote much of the code from my product direction and design decisions, and I reviewed, tested and directed changes throughout. The optional extraction feature calls Google's Gemini API at runtime. Open-source libraries used: Next.js, React, pdf.js, the MongoDB Node driver, Vitest.
