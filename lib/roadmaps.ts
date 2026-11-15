// Learning voyages: self-study roadmaps for people with no syllabus.
//
// The topic outlines below are our own. roadmap.sh's content is under a licence that allows
// linking but not republishing, so each track links out to the matching roadmap.sh page
// (credited) instead of copying it. Resource links are limited to long-standing, free,
// well-known sources.

export interface Resource {
  label: string;
  url: string;
}

export interface Topic {
  title: string;
  /** rough study time */
  minutes: number;
  /** one line on what "done" means for this topic */
  goal: string;
  resources: Resource[];
}

export interface Stage {
  title: string;
  topics: Topic[];
  /** a small build that proves the stage, scheduled as a project */
  project?: { title: string; minutes: number; goal: string };
}

export interface Track {
  id: string;
  code: string;
  name: string;
  blurb: string;
  roadmap: Resource;
  /** where the outline came from, shown to the learner */
  origin: "curated" | "gemini" | "outline";
  stages: Stage[];
}

const R = {
  ng: { label: "Andrew Ng, Machine Learning Specialization (Coursera, free to audit)", url: "https://www.coursera.org/specializations/machine-learning-introduction" },
  fastai: { label: "fast.ai, Practical Deep Learning", url: "https://course.fast.ai" },
  b1bNN: { label: "3Blue1Brown, Neural networks", url: "https://www.3blue1brown.com/topics/neural-networks" },
  b1bLA: { label: "3Blue1Brown, Essence of linear algebra", url: "https://www.3blue1brown.com/topics/linear-algebra" },
  b1bCalc: { label: "3Blue1Brown, Essence of calculus", url: "https://www.3blue1brown.com/topics/calculus" },
  khanStats: { label: "Khan Academy, Statistics and probability", url: "https://www.khanacademy.org/math/statistics-probability" },
  kagglePy: { label: "Kaggle Learn, Python", url: "https://www.kaggle.com/learn/python" },
  kagglePandas: { label: "Kaggle Learn, Pandas", url: "https://www.kaggle.com/learn/pandas" },
  kaggleML: { label: "Kaggle Learn, Intro to Machine Learning", url: "https://www.kaggle.com/learn/intro-to-machine-learning" },
  kaggle: { label: "Kaggle Learn (all courses)", url: "https://www.kaggle.com/learn" },
  gmlcc: { label: "Google Machine Learning Crash Course", url: "https://developers.google.com/machine-learning/crash-course" },
  sklearn: { label: "scikit-learn User Guide", url: "https://scikit-learn.org/stable/user_guide.html" },
  pytorch: { label: "PyTorch tutorials", url: "https://pytorch.org/tutorials/" },
  karpathy: { label: "Andrej Karpathy, Neural Networks: Zero to Hero", url: "https://karpathy.ai/zero-to-hero.html" },
  d2l: { label: "Dive into Deep Learning (free book)", url: "https://d2l.ai" },
  hf: { label: "Hugging Face Learn (LLM, agents, diffusion courses)", url: "https://huggingface.co/learn" },
  dlai: { label: "DeepLearning.AI short courses", url: "https://www.deeplearning.ai/short-courses/" },
  prompting: { label: "Prompt Engineering Guide", url: "https://www.promptingguide.ai" },
  gemini: { label: "Gemini API docs", url: "https://ai.google.dev/gemini-api/docs" },
  cs50ai: { label: "Harvard CS50 AI (free)", url: "https://cs50.harvard.edu/ai/" },
  cs50py: { label: "Harvard CS50 Python (free)", url: "https://cs50.harvard.edu/python/" },
  pyTut: { label: "The official Python tutorial", url: "https://docs.python.org/3/tutorial/" },
  pandasDocs: { label: "pandas getting started", url: "https://pandas.pydata.org/docs/getting_started/index.html" },
  seaborn: { label: "seaborn tutorial", url: "https://seaborn.pydata.org/tutorial.html" },
  sqlbolt: { label: "SQLBolt, interactive SQL lessons", url: "https://sqlbolt.com" },
  mdn: { label: "MDN, Learn web development", url: "https://developer.mozilla.org/en-US/docs/Learn_web_development" },
  jsinfo: { label: "javascript.info", url: "https://javascript.info" },
  react: { label: "react.dev, Learn React", url: "https://react.dev/learn" },
  ts: { label: "TypeScript Handbook", url: "https://www.typescriptlang.org/docs/handbook/intro.html" },
  nextLearn: { label: "Next.js Learn course", url: "https://nextjs.org/learn" },
  webdev: { label: "web.dev Learn (CSS, accessibility, performance)", url: "https://web.dev/learn" },
  fcc: { label: "freeCodeCamp curriculum", url: "https://www.freecodecamp.org/learn" },
  bandit: { label: "OverTheWire Bandit (Linux wargame)", url: "https://overthewire.org/wargames/bandit/" },
  pico: { label: "picoCTF practice", url: "https://picoctf.org" },
  owasp: { label: "OWASP Top 10", url: "https://owasp.org/www-project-top-ten/" },
  thm: { label: "TryHackMe", url: "https://tryhackme.com" },
  messer: { label: "Professor Messer, Security+ videos", url: "https://www.professormesser.com" },
} satisfies Record<string, Resource>;

const rm = (path: string, name: string): Resource => ({ label: `roadmap.sh ${name} roadmap`, url: `https://roadmap.sh/${path}` });

export const TRACKS: Track[] = [
  {
    id: "ai-ml",
    code: "AI",
    name: "Artificial Intelligence & Machine Learning",
    blurb: "From Python and the maths to training neural nets and shipping an LLM app.",
    roadmap: rm("machine-learning", "Machine Learning"),
    origin: "curated",
    stages: [
      {
        title: "Python for data",
        topics: [
          { title: "Python basics", minutes: 360, goal: "Write functions, loops and classes without looking things up", resources: [R.kagglePy, R.cs50py, R.pyTut] },
          { title: "NumPy and pandas", minutes: 300, goal: "Load a CSV, clean it, group it and summarise it", resources: [R.kagglePandas, R.pandasDocs] },
          { title: "Plotting your data", minutes: 120, goal: "Make a histogram, scatter and line chart that tell a story", resources: [R.seaborn] },
        ],
        project: { title: "Explore a real dataset", minutes: 240, goal: "A notebook with five charts and three findings about a Kaggle dataset" },
      },
      {
        title: "The maths you actually need",
        topics: [
          { title: "Vectors and matrices", minutes: 240, goal: "Explain a matrix multiply as a transformation", resources: [R.b1bLA] },
          { title: "Derivatives and gradients", minutes: 180, goal: "Explain why gradient descent walks downhill", resources: [R.b1bCalc] },
          { title: "Probability and statistics", minutes: 300, goal: "Mean, variance, distributions, Bayes' rule, sampling", resources: [R.khanStats] },
        ],
      },
      {
        title: "Classic machine learning",
        topics: [
          { title: "Regression and classification", minutes: 360, goal: "Train linear and logistic regression and read their errors", resources: [R.ng, R.gmlcc] },
          { title: "Trees, forests and boosting", minutes: 240, goal: "Know when a random forest beats a linear model", resources: [R.kaggleML, R.sklearn] },
          { title: "Evaluation and overfitting", minutes: 180, goal: "Train/test splits, cross-validation, precision vs recall", resources: [R.gmlcc, R.sklearn] },
          { title: "Clustering and dimensionality reduction", minutes: 180, goal: "Run k-means and PCA and explain what they found", resources: [R.ng, R.sklearn] },
        ],
        project: { title: "End-to-end prediction model", minutes: 360, goal: "Clean data, train two models, compare them honestly, write it up" },
      },
      {
        title: "Deep learning",
        topics: [
          { title: "How neural networks learn", minutes: 240, goal: "Backpropagation in your own words", resources: [R.b1bNN, R.karpathy] },
          { title: "PyTorch fundamentals", minutes: 300, goal: "Write a training loop from scratch", resources: [R.pytorch, R.d2l] },
          { title: "CNNs for images", minutes: 300, goal: "Fine-tune a pretrained image model", resources: [R.fastai, R.d2l] },
          { title: "Sequences and attention", minutes: 300, goal: "Explain self-attention and why transformers won", resources: [R.karpathy, R.d2l] },
        ],
        project: { title: "Train an image classifier", minutes: 360, goal: "A fine-tuned model on your own photos, with a confusion matrix" },
      },
      {
        title: "LLMs and AI apps",
        topics: [
          { title: "How LLMs work", minutes: 240, goal: "Tokens, embeddings, pretraining vs fine-tuning", resources: [R.karpathy, R.hf] },
          { title: "Prompting and structured output", minutes: 180, goal: "Get reliable JSON out of a model", resources: [R.prompting, R.gemini] },
          { title: "Retrieval (RAG) and embeddings", minutes: 240, goal: "Answer questions over your own documents with citations", resources: [R.hf, R.dlai] },
          { title: "Agents and tool use", minutes: 240, goal: "Let a model call functions safely", resources: [R.hf, R.dlai] },
          { title: "Evaluation and responsible AI", minutes: 180, goal: "Measure quality and spot bias or hallucination", resources: [R.dlai, R.cs50ai] },
        ],
        project: { title: "Ship a grounded AI assistant", minutes: 480, goal: "A small app that answers from your documents and shows its sources" },
      },
    ],
  },
  {
    id: "data-analyst",
    code: "DATA",
    name: "Data Analysis",
    blurb: "Spreadsheets to SQL to Python, ending with a portfolio dashboard.",
    roadmap: rm("data-analyst", "Data Analyst"),
    origin: "curated",
    stages: [
      {
        title: "Asking questions of data",
        topics: [
          { title: "Descriptive statistics", minutes: 240, goal: "Summarise any column and spot outliers", resources: [R.khanStats] },
          { title: "SQL basics", minutes: 300, goal: "SELECT, WHERE, GROUP BY and JOIN with confidence", resources: [R.sqlbolt] },
        ],
      },
      {
        title: "Python analysis",
        topics: [
          { title: "Python basics", minutes: 300, goal: "Comfortable with lists, dicts and functions", resources: [R.kagglePy, R.cs50py] },
          { title: "pandas wrangling", minutes: 360, goal: "Merge, reshape and clean messy tables", resources: [R.kagglePandas, R.pandasDocs] },
          { title: "Visualisation", minutes: 240, goal: "Choose the right chart and label it properly", resources: [R.seaborn, R.kaggle] },
        ],
        project: { title: "Analyse a public dataset", minutes: 300, goal: "A notebook that answers one real question with evidence" },
      },
      {
        title: "Telling the story",
        topics: [
          { title: "A/B tests and confidence", minutes: 240, goal: "Know when a difference is real", resources: [R.khanStats] },
          { title: "Dashboards", minutes: 240, goal: "One page a manager can read in 30 seconds", resources: [R.kaggle] },
        ],
        project: { title: "Portfolio dashboard", minutes: 360, goal: "A published dashboard with a short write-up" },
      },
    ],
  },
  {
    id: "frontend",
    code: "WEB",
    name: "Frontend Web Development",
    blurb: "HTML and CSS up to React, TypeScript and a deployed app.",
    roadmap: rm("frontend", "Frontend"),
    origin: "curated",
    stages: [
      {
        title: "The web platform",
        topics: [
          { title: "HTML and accessibility", minutes: 240, goal: "Semantic pages that work with a screen reader", resources: [R.mdn, R.webdev] },
          { title: "CSS layout", minutes: 300, goal: "Flexbox and grid without guessing", resources: [R.mdn, R.webdev] },
          { title: "JavaScript fundamentals", minutes: 480, goal: "Functions, arrays, objects, async/await, the DOM", resources: [R.jsinfo, R.fcc] },
        ],
        project: { title: "Responsive personal site", minutes: 300, goal: "A site that looks right on a phone and a laptop" },
      },
      {
        title: "Modern apps",
        topics: [
          { title: "React", minutes: 480, goal: "Components, state, effects and lists", resources: [R.react] },
          { title: "TypeScript", minutes: 240, goal: "Type your props and API responses", resources: [R.ts] },
          { title: "Next.js and data fetching", minutes: 300, goal: "Routes, server code and deployment", resources: [R.nextLearn] },
        ],
        project: { title: "Deploy a full app", minutes: 480, goal: "A React app with real data, live on the internet" },
      },
    ],
  },
  {
    id: "cyber",
    code: "SEC",
    name: "Cyber Security",
    blurb: "Linux and networking basics through web security and CTFs.",
    roadmap: rm("cyber-security", "Cyber Security"),
    origin: "curated",
    stages: [
      {
        title: "Foundations",
        topics: [
          { title: "Linux command line", minutes: 300, goal: "Navigate, search and script in a terminal", resources: [R.bandit] },
          { title: "Networking basics", minutes: 300, goal: "IP, DNS, TCP vs UDP, what a port is", resources: [R.messer, R.thm] },
          { title: "Security concepts", minutes: 240, goal: "CIA triad, threats, authentication, encryption", resources: [R.messer] },
        ],
      },
      {
        title: "Attack and defend",
        topics: [
          { title: "Web vulnerabilities", minutes: 360, goal: "Explain and spot injection, XSS and broken auth", resources: [R.owasp, R.thm] },
          { title: "Capture the flag practice", minutes: 480, goal: "Solve ten beginner CTF challenges", resources: [R.pico, R.bandit] },
        ],
        project: { title: "Write up a CTF", minutes: 240, goal: "A clear write-up of three challenges you solved" },
      },
    ],
  },
];

// roadmap.sh pages we know exist, for matching a custom goal to a page to link.
const ROADMAP_SLUGS: [RegExp, string, string][] = [
  [/\b(ai|artificial intelligence)\b.*\b(engineer|apps?|agents?)\b|\bai engineer/i, "ai-engineer", "AI Engineer"],
  [/\bagents?\b/i, "ai-agents", "AI Agents"],
  [/machine learning|\bml\b|deep learning|neural/i, "machine-learning", "Machine Learning"],
  [/data scien/i, "ai-data-scientist", "AI and Data Scientist"],
  [/\bai\b|artificial intelligence/i, "ai-engineer", "AI Engineer"],
  [/prompt/i, "prompt-engineering", "Prompt Engineering"],
  [/mlops/i, "mlops", "MLOps"],
  [/data engineer/i, "data-engineer", "Data Engineer"],
  [/data anal|analytics/i, "data-analyst", "Data Analyst"],
  [/\bsql\b|databases?/i, "sql", "SQL"],
  [/python/i, "python", "Python"],
  [/javascript|\bjs\b/i, "javascript", "JavaScript"],
  [/typescript/i, "typescript", "TypeScript"],
  [/react native/i, "react-native", "React Native"],
  [/react/i, "react", "React"],
  [/front ?end|web dev|html|css/i, "frontend", "Frontend"],
  [/back ?end|server|api/i, "backend", "Backend"],
  [/full ?stack/i, "full-stack", "Full Stack"],
  [/devops/i, "devops", "DevOps"],
  [/docker/i, "docker", "Docker"],
  [/kubernetes|k8s/i, "kubernetes", "Kubernetes"],
  [/\baws\b|amazon web/i, "aws", "AWS"],
  [/cloud/i, "cloud-computing", "Cloud Computing"],
  [/cyber|security|hacking/i, "cyber-security", "Cyber Security"],
  [/linux/i, "linux", "Linux"],
  [/\bgit\b|github/i, "git-github", "Git and GitHub"],
  [/system design/i, "system-design", "System Design"],
  [/algorithm|data structure|leetcode|dsa/i, "datastructures-and-algorithms", "Data Structures and Algorithms"],
  [/computer science|\bcs\b/i, "computer-science", "Computer Science"],
  [/android/i, "android", "Android"],
  [/\bios\b|swift/i, "ios", "iOS"],
  [/game/i, "game-developer", "Game Developer"],
  [/ux|user experience/i, "ux-design", "UX Design"],
  [/product manag/i, "product-manager", "Product Manager"],
  [/blockchain|web3|crypto/i, "blockchain", "Blockchain"],
  [/\bjava\b/i, "java", "Java"],
  [/c\+\+|cpp/i, "cpp", "C++"],
  [/\brust\b/i, "rust", "Rust"],
  [/\bgo\b|golang/i, "golang", "Go"],
  [/flutter/i, "flutter", "Flutter"],
  [/node/i, "nodejs", "Node.js"],
];

/** The matching roadmap.sh page for a free-text goal, or the roadmap.sh home page. */
export function roadmapFor(goal: string): Resource {
  for (const [re, slug, name] of ROADMAP_SLUGS) if (re.test(goal)) return rm(slug, name);
  return { label: "roadmap.sh (browse all roadmaps)", url: "https://roadmap.sh" };
}

/** The curated track that best fits a goal, if any. */
export function matchTrack(goal: string): Track | undefined {
  const g = goal.toLowerCase();
  if (/\bai\b|artificial|machine learning|\bml\b|deep learning|neural|llm/.test(g)) return TRACKS[0];
  if (/data anal|analytics|\bsql\b/.test(g)) return TRACKS[1];
  if (/front ?end|web dev|react|html|css/.test(g)) return TRACKS[2];
  if (/cyber|security|hacking|ctf/.test(g)) return TRACKS[3];
  return undefined;
}

/** Search links always resolve, so they are what we attach to topics nobody has vetted. */
export function searchLinks(goal: string, topic: string): Resource[] {
  const q = encodeURIComponent(`${topic} ${goal}`.trim());
  return [
    { label: "YouTube search", url: `https://www.youtube.com/results?search_query=${q}+tutorial` },
    { label: "freeCodeCamp search", url: `https://www.freecodecamp.org/news/search/?query=${q}` },
  ];
}

/** Offline outline for any goal: a sensible shape the learner can edit, with search links. */
export function outlineFor(goal: string): Track {
  const clean = goal.trim().replace(/\s+/g, " ").slice(0, 60) || "a new skill";
  const t = (title: string, minutes: number, goalLine: string): Topic => ({ title, minutes, goal: goalLine, resources: searchLinks(clean, title) });
  return {
    id: "custom",
    code: codeFor(clean),
    name: titleCase(clean),
    blurb: `A starter outline for ${clean}. Edit topics as you learn more.`,
    roadmap: roadmapFor(clean),
    origin: "outline",
    stages: [
      { title: "Orientation", topics: [t(`What ${clean} is and the core vocabulary`, 120, "Explain it to a friend in two minutes"), t(`Set up your tools for ${clean}`, 120, "A working setup you can practise in")] },
      { title: "Fundamentals", topics: [t(`${titleCase(clean)} fundamentals, part 1`, 300, "Work through a beginner course or book"), t(`${titleCase(clean)} fundamentals, part 2`, 300, "Finish the beginner material and do its exercises")], project: { title: `First small ${clean} project`, minutes: 240, goal: "Something tiny but finished" } },
      { title: "Going deeper", topics: [t(`Intermediate ${clean} topics`, 360, "Pick the two topics you found hardest and go deep"), t(`How professionals use ${clean}`, 180, "Read two real-world case studies or codebases")], project: { title: `Portfolio ${clean} project`, minutes: 480, goal: "A project you would show someone" } },
    ],
  };
}

export function codeFor(goal: string): string {
  const words = goal.replace(/[^A-Za-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
  if (!words.length) return "LEARN";
  if (words.length === 1) return words[0].slice(0, 6).toUpperCase();
  return words.map((w) => w[0]).join("").slice(0, 5).toUpperCase();
}

function titleCase(s: string) {
  return s.replace(/\b([a-z])/g, (m) => m.toUpperCase());
}

export function trackMinutes(t: Track): number {
  return t.stages.reduce((s, st) => s + st.topics.reduce((a, x) => a + x.minutes, 0) + (st.project?.minutes ?? 0), 0);
}

/** Make sure anything that came back from Gemini has the shape we expect, and only safe links. */
export function sanitizeTrack(raw: unknown, goal: string): Track | null {
  const r = raw as { name?: string; stages?: { title?: string; topics?: { title?: string; minutes?: number; goal?: string }[]; project?: { title?: string; minutes?: number; goal?: string } | null }[] };
  if (!r || !Array.isArray(r.stages)) return null;
  const clamp = (m: unknown, d: number) => Math.round(Math.min(900, Math.max(30, Number(m) || d)) / 30) * 30;
  const clean = goal.trim().slice(0, 60);
  const stages: Stage[] = r.stages
    .slice(0, 8)
    .map((s) => ({
      title: String(s?.title ?? "").slice(0, 80) || "Stage",
      topics: (Array.isArray(s?.topics) ? s.topics : [])
        .slice(0, 8)
        .filter((x) => x?.title)
        .map((x) => ({ title: String(x.title).slice(0, 90), minutes: clamp(x.minutes, 180), goal: String(x.goal ?? "").slice(0, 160), resources: searchLinks(clean, String(x.title)) })),
      project: s?.project?.title ? { title: String(s.project.title).slice(0, 90), minutes: clamp(s.project.minutes, 300), goal: String(s.project.goal ?? "").slice(0, 160) } : undefined,
    }))
    .filter((s) => s.topics.length);
  if (!stages.length) return null;
  return {
    id: "custom",
    code: codeFor(clean),
    name: String(r.name ?? "").slice(0, 70) || titleCase(clean),
    blurb: `A roadmap for ${clean}, drafted by Gemini. Check it and edit freely.`,
    roadmap: roadmapFor(clean),
    origin: "gemini",
    stages,
  };
}
