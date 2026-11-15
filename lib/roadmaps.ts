// Learning voyages: self-study roadmaps for people with no syllabus.
//
// The topic outlines below are our own. roadmap.sh's content is under a licence that allows
// linking but not republishing, so each track links out to the matching roadmap.sh page
// (credited) instead of copying it. Resource links are limited to long-standing, well-known
// sources, each marked free or paid.
//
// Three ideas shape every track:
//  1. Each stage ends in something you can show and use: what it lets you do for others
//     (paid or not), and how to prove it. Opportunities, never income promises.
//  2. Each topic has a "prove it" question. You explain it in your own words before you
//     tick it off, so the map tracks understanding, not clicks.
//  3. Videos and certifications are linked where a good one exists.

export type ResourceKind = "course" | "video" | "cert" | "docs" | "practice" | "search";
export type Cost = "Free" | "Free to audit" | "Free exam" | "Paid";

export interface Resource {
  label: string;
  url: string;
  kind?: ResourceKind;
  cost?: Cost;
}

export interface Topic {
  title: string;
  /** rough study time */
  minutes: number;
  /** one line on what "done" means for this topic */
  goal: string;
  /** the explain-it-back question you answer before ticking it off */
  check: string;
  resources: Resource[];
}

export interface Earn {
  /** what you can honestly do for someone once this stage is done */
  canDo: string;
  /** kinds of work this opens: freelance, campus, internships */
  gigs: string[];
  /** how to show it so someone trusts you with it */
  showIt: string;
}

export interface Stage {
  title: string;
  topics: Topic[];
  /** a small build that proves the stage, scheduled as a project */
  project?: { title: string; minutes: number; goal: string };
  earn?: Earn;
  certs?: Resource[];
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

const c = (label: string, url: string, cost: Cost = "Free"): Resource => ({ label, url, kind: "course", cost });
const v = (label: string, url: string): Resource => ({ label, url, kind: "video", cost: "Free" });
const d = (label: string, url: string): Resource => ({ label, url, kind: "docs", cost: "Free" });
const pr = (label: string, url: string, cost: Cost = "Free"): Resource => ({ label, url, kind: "practice", cost });
const cert = (label: string, url: string, cost: Cost): Resource => ({ label, url, kind: "cert", cost });

const R = {
  // courses
  ng: c("Andrew Ng, Machine Learning Specialization", "https://www.coursera.org/specializations/machine-learning-introduction", "Free to audit"),
  dls: c("DeepLearning.AI, Deep Learning Specialization", "https://www.coursera.org/specializations/deep-learning", "Free to audit"),
  fastai: c("fast.ai, Practical Deep Learning for Coders", "https://course.fast.ai"),
  kagglePy: c("Kaggle Learn, Python", "https://www.kaggle.com/learn/python"),
  kagglePandas: c("Kaggle Learn, Pandas", "https://www.kaggle.com/learn/pandas"),
  kaggleViz: c("Kaggle Learn, Data Visualization", "https://www.kaggle.com/learn/data-visualization"),
  kaggleML: c("Kaggle Learn, Intro to Machine Learning", "https://www.kaggle.com/learn/intro-to-machine-learning"),
  kaggleSQL: c("Kaggle Learn, Intro to SQL", "https://www.kaggle.com/learn/intro-to-sql"),
  gmlcc: c("Google Machine Learning Crash Course", "https://developers.google.com/machine-learning/crash-course"),
  cs50ai: c("Harvard CS50 AI", "https://cs50.harvard.edu/ai/"),
  cs50py: c("Harvard CS50 Python", "https://cs50.harvard.edu/python/"),
  cs50w: c("Harvard CS50 Web", "https://cs50.harvard.edu/web/"),
  hf: c("Hugging Face Learn (LLM and agents courses)", "https://huggingface.co/learn"),
  dlai: c("DeepLearning.AI short courses", "https://www.deeplearning.ai/short-courses/"),
  khanStats: c("Khan Academy, Statistics and probability", "https://www.khanacademy.org/math/statistics-probability"),
  khanLA: c("Khan Academy, Linear algebra", "https://www.khanacademy.org/math/linear-algebra"),
  fcc: c("freeCodeCamp curriculum", "https://www.freecodecamp.org/learn"),
  sqlbolt: pr("SQLBolt, interactive SQL lessons", "https://sqlbolt.com"),
  // videos
  b1bNN: v("3Blue1Brown, Neural networks (video series)", "https://www.3blue1brown.com/topics/neural-networks"),
  b1bLA: v("3Blue1Brown, Essence of linear algebra", "https://www.3blue1brown.com/topics/linear-algebra"),
  b1bCalc: v("3Blue1Brown, Essence of calculus", "https://www.3blue1brown.com/topics/calculus"),
  karpathy: v("Andrej Karpathy, Neural Networks: Zero to Hero", "https://karpathy.ai/zero-to-hero.html"),
  statquest: v("StatQuest with Josh Starmer (YouTube)", "https://www.youtube.com/@statquest"),
  coreyPy: v("Corey Schafer, Python tutorials (YouTube)", "https://www.youtube.com/@coreyms"),
  fccYT: v("freeCodeCamp.org full courses (YouTube)", "https://www.youtube.com/@freecodecamp"),
  cs50YT: v("CS50 lectures (YouTube)", "https://www.youtube.com/@cs50"),
  alexAnalyst: v("Alex The Analyst (YouTube)", "https://www.youtube.com/@AlexTheAnalyst"),
  kevinPowell: v("Kevin Powell, CSS (YouTube)", "https://www.youtube.com/@KevinPowell"),
  wds: v("Web Dev Simplified (YouTube)", "https://www.youtube.com/@WebDevSimplified"),
  networkChuck: v("NetworkChuck (YouTube)", "https://www.youtube.com/@NetworkChuck"),
  messer: v("Professor Messer, Security+ videos", "https://www.professormesser.com"),
  // docs
  pyTut: d("The official Python tutorial", "https://docs.python.org/3/tutorial/"),
  pandasDocs: d("pandas getting started", "https://pandas.pydata.org/docs/getting_started/index.html"),
  seaborn: d("seaborn tutorial", "https://seaborn.pydata.org/tutorial.html"),
  sklearn: d("scikit-learn User Guide", "https://scikit-learn.org/stable/user_guide.html"),
  pytorch: d("PyTorch tutorials", "https://pytorch.org/tutorials/"),
  d2l: d("Dive into Deep Learning (free book)", "https://d2l.ai"),
  prompting: d("Prompt Engineering Guide", "https://www.promptingguide.ai"),
  gemini: d("Gemini API docs", "https://ai.google.dev/gemini-api/docs"),
  mdn: d("MDN, Learn web development", "https://developer.mozilla.org/en-US/docs/Learn_web_development"),
  jsinfo: d("javascript.info", "https://javascript.info"),
  react: d("react.dev, Learn React", "https://react.dev/learn"),
  ts: d("TypeScript Handbook", "https://www.typescriptlang.org/docs/handbook/intro.html"),
  nextLearn: c("Next.js Learn course", "https://nextjs.org/learn"),
  webdev: d("web.dev Learn (CSS, accessibility, performance)", "https://web.dev/learn"),
  owasp: d("OWASP Top 10", "https://owasp.org/www-project-top-ten/"),
  // practice
  kaggleComp: pr("Kaggle competitions (start with Titanic)", "https://www.kaggle.com/competitions"),
  bandit: pr("OverTheWire Bandit (Linux wargame)", "https://overthewire.org/wargames/bandit/"),
  pico: pr("picoCTF practice", "https://picoctf.org"),
  thm: pr("TryHackMe", "https://tryhackme.com", "Free to audit"),
  portswigger: pr("PortSwigger Web Security Academy", "https://portswigger.net/web-security"),
  frontendMentor: pr("Frontend Mentor challenges", "https://www.frontendmentor.io/challenges", "Free to audit"),
  // certifications
  kaggleCert: cert("Kaggle Learn course certificates", "https://www.kaggle.com/learn", "Free"),
  fccCert: cert("freeCodeCamp certifications", "https://www.freecodecamp.org/learn", "Free"),
  az900ai: cert("Microsoft Azure AI Fundamentals (AI-900)", "https://learn.microsoft.com/en-us/credentials/certifications/azure-ai-fundamentals/", "Paid"),
  awsAI: cert("AWS Certified AI Practitioner", "https://aws.amazon.com/certification/certified-ai-practitioner/", "Paid"),
  gcpML: cert("Google Cloud Professional Machine Learning Engineer", "https://cloud.google.com/learn/certification/machine-learning-engineer", "Paid"),
  ngCert: cert("Machine Learning Specialization certificate (Coursera)", "https://www.coursera.org/specializations/machine-learning-introduction", "Paid"),
  dlsCert: cert("Deep Learning Specialization certificate (Coursera)", "https://www.coursera.org/specializations/deep-learning", "Paid"),
  hfCert: cert("Hugging Face course certificates", "https://huggingface.co/learn", "Free"),
  googleDA: cert("Google Data Analytics Professional Certificate", "https://www.coursera.org/professional-certificates/google-data-analytics", "Paid"),
  pl300: cert("Microsoft Power BI Data Analyst (PL-300)", "https://learn.microsoft.com/en-us/credentials/certifications/power-bi-data-analyst-associate/", "Paid"),
  metaFE: cert("Meta Front-End Developer Professional Certificate", "https://www.coursera.org/professional-certificates/meta-front-end-developer", "Paid"),
  googleCyber: cert("Google Cybersecurity Professional Certificate", "https://www.coursera.org/professional-certificates/google-cybersecurity", "Paid"),
  isc2CC: cert("ISC2 Certified in Cybersecurity (CC), entry level", "https://www.isc2.org/certifications/cc", "Paid"),
  secPlus: cert("CompTIA Security+", "https://www.comptia.org/certifications/security", "Paid"),
} satisfies Record<string, Resource>;

const rm = (path: string, name: string): Resource => ({ label: `roadmap.sh ${name} roadmap`, url: `https://roadmap.sh/${path}`, kind: "docs", cost: "Free" });

export const TRACKS: Track[] = [
  {
    id: "ai-ml",
    code: "AI",
    name: "Artificial Intelligence & Machine Learning",
    blurb: "From Python and the maths to training neural nets and shipping an AI app people can use.",
    roadmap: rm("machine-learning", "Machine Learning"),
    origin: "curated",
    stages: [
      {
        title: "Python for data",
        topics: [
          { title: "Python basics", minutes: 360, goal: "Write functions, loops and classes without looking things up", check: "Explain the difference between a list and a dictionary, and when you would pick each. Give a tiny example.", resources: [R.cs50py, R.coreyPy, R.kagglePy, R.pyTut] },
          { title: "NumPy and pandas", minutes: 300, goal: "Load a CSV, clean it, group it and summarise it", check: "You have a CSV of sales with missing prices. Walk through, step by step, how you would clean it and find total sales per month.", resources: [R.kagglePandas, R.coreyPy, R.pandasDocs] },
          { title: "Plotting your data", minutes: 120, goal: "Make a histogram, scatter and line chart that tell a story", check: "When would you use a histogram instead of a bar chart? What question does each one answer?", resources: [R.kaggleViz, R.seaborn] },
        ],
        project: { title: "Explore a real dataset", minutes: 240, goal: "A notebook with five charts and three findings about a public dataset" },
        earn: {
          canDo: "Clean messy spreadsheets and turn them into clear charts and summaries.",
          gigs: ["Data cleaning and spreadsheet automation for small businesses and student orgs", "Research assistant work in a campus lab", "Paid tutoring for intro Python"],
          showIt: "Publish the notebook on GitHub or Kaggle with a short write-up of what you found.",
        },
        certs: [R.kaggleCert],
      },
      {
        title: "The maths you actually need",
        topics: [
          { title: "Vectors and matrices", minutes: 240, goal: "Explain a matrix multiply as a transformation", check: "In your own words, what does multiplying a vector by a matrix do to it? Why does ML care?", resources: [R.b1bLA, R.khanLA] },
          { title: "Derivatives and gradients", minutes: 180, goal: "Explain why gradient descent walks downhill", check: "Explain gradient descent to a friend who knows no calculus. What is the learning rate, and what happens if it is too big?", resources: [R.b1bCalc, R.statquest] },
          { title: "Probability and statistics", minutes: 300, goal: "Mean, variance, distributions, Bayes' rule, sampling", check: "A test is 99% accurate for a rare disease. Why might a positive result still probably be wrong? Explain with Bayes' rule.", resources: [R.statquest, R.khanStats] },
        ],
        earn: {
          canDo: "Read ML papers and docs without getting lost, and explain results honestly.",
          gigs: ["Maths or stats tutoring", "Grader or TA roles for intro stats courses"],
          showIt: "Write a short blog post explaining one idea (like Bayes' rule) with your own example.",
        },
      },
      {
        title: "Classic machine learning",
        topics: [
          { title: "Regression and classification", minutes: 360, goal: "Train linear and logistic regression and read their errors", check: "What is the difference between regression and classification? Give a real problem for each and say which metric you would use.", resources: [R.ng, R.statquest, R.gmlcc] },
          { title: "Trees, forests and boosting", minutes: 240, goal: "Know when a random forest beats a linear model", check: "Why does a random forest usually overfit less than a single decision tree?", resources: [R.kaggleML, R.statquest, R.sklearn] },
          { title: "Evaluation and overfitting", minutes: 180, goal: "Train/test splits, cross-validation, precision vs recall", check: "Your model is 99% accurate at spotting fraud, but fraud is 1% of transactions. Why is that number useless, and what would you measure instead?", resources: [R.gmlcc, R.statquest, R.sklearn] },
          { title: "Clustering and dimensionality reduction", minutes: 180, goal: "Run k-means and PCA and explain what they found", check: "Explain what k-means does in three steps, and one way it can go wrong.", resources: [R.ng, R.statquest, R.sklearn] },
        ],
        project: { title: "End-to-end prediction model", minutes: 360, goal: "Clean data, train two models, compare them honestly, write it up" },
        earn: {
          canDo: "Build a simple predictive model on someone's data and explain how far to trust it.",
          gigs: ["Data analyst or ML internships", "Freelance dashboards and forecasts for small businesses", "Kaggle competitions (some have prizes)", "Undergraduate research with ML-using labs"],
          showIt: "A GitHub repo with a clear README: problem, data, two models, honest comparison, what you'd do next.",
        },
        certs: [R.ngCert, R.kaggleCert, R.az900ai],
      },
      {
        title: "Deep learning",
        topics: [
          { title: "How neural networks learn", minutes: 240, goal: "Backpropagation in your own words", check: "Explain backpropagation without equations: what is being adjusted, and how does the network know which way to adjust it?", resources: [R.b1bNN, R.karpathy, R.dls] },
          { title: "PyTorch fundamentals", minutes: 300, goal: "Write a training loop from scratch", check: "List the steps inside one iteration of a training loop, in order, and what each does.", resources: [R.pytorch, R.fccYT, R.d2l] },
          { title: "CNNs for images", minutes: 300, goal: "Fine-tune a pretrained image model", check: "Why does fine-tuning a pretrained model work so much better than training from scratch on 500 photos?", resources: [R.fastai, R.d2l] },
          { title: "Sequences and attention", minutes: 300, goal: "Explain self-attention and why transformers won", check: "Explain self-attention using the sentence 'The animal didn't cross the street because it was tired'. What does 'it' attend to?", resources: [R.karpathy, R.d2l] },
        ],
        project: { title: "Train an image classifier", minutes: 360, goal: "A fine-tuned model on your own photos, with a confusion matrix" },
        earn: {
          canDo: "Fine-tune an existing model for a specific task and deploy a demo.",
          gigs: ["ML engineering internships", "Research assistant roles in vision or NLP labs", "Hackathon projects with sponsor prizes"],
          showIt: "Host a live demo (for example a Hugging Face Space) and link it from your resume.",
        },
        certs: [R.dlsCert, R.awsAI],
      },
      {
        title: "LLMs and AI apps",
        topics: [
          { title: "How LLMs work", minutes: 240, goal: "Tokens, embeddings, pretraining vs fine-tuning", check: "Explain what an LLM actually predicts, and why that makes it able to sound confident while being wrong.", resources: [R.karpathy, R.hf] },
          { title: "Prompting and structured output", minutes: 180, goal: "Get reliable JSON out of a model", check: "How do you make a model's output reliable enough for code to use? Name two techniques.", resources: [R.prompting, R.gemini, R.dlai] },
          { title: "Retrieval (RAG) and embeddings", minutes: 240, goal: "Answer questions over your own documents with citations", check: "Explain RAG in four steps, and how you would check an answer really came from the documents.", resources: [R.hf, R.dlai] },
          { title: "Agents and tool use", minutes: 240, goal: "Let a model call functions safely", check: "What could go wrong if an AI agent can send emails on its own? How would you design it so a human stays in control?", resources: [R.hf, R.dlai] },
          { title: "Evaluation and responsible AI", minutes: 180, goal: "Measure quality and spot bias or hallucination", check: "How would you test whether your AI app is getting better or worse after a change?", resources: [R.dlai, R.cs50ai] },
        ],
        project: { title: "Ship a grounded AI assistant", minutes: 480, goal: "A small app that answers from your documents and shows its sources" },
        earn: {
          canDo: "Build AI features (chat over documents, extraction, automation) that a business can actually rely on.",
          gigs: ["Freelance AI automation and chatbot projects", "AI engineering internships", "Building tools for campus departments or startups", "Hackathon sponsor tracks"],
          showIt: "A deployed app plus a README that explains how you stop it from making things up.",
        },
        certs: [R.hfCert, R.gcpML],
      },
    ],
  },
  {
    id: "data-analyst",
    code: "DATA",
    name: "Data Analysis",
    blurb: "Spreadsheets to SQL to Python, ending with a portfolio dashboard you can show employers.",
    roadmap: rm("data-analyst", "Data Analyst"),
    origin: "curated",
    stages: [
      {
        title: "Asking questions of data",
        topics: [
          { title: "Descriptive statistics", minutes: 240, goal: "Summarise any column and spot outliers", check: "When is the median a better summary than the mean? Give a real example.", resources: [R.statquest, R.khanStats] },
          { title: "SQL basics", minutes: 300, goal: "SELECT, WHERE, GROUP BY and JOIN with confidence", check: "Explain the difference between WHERE and HAVING, and between an INNER and a LEFT JOIN.", resources: [R.sqlbolt, R.kaggleSQL, R.alexAnalyst] },
        ],
        earn: {
          canDo: "Pull answers out of a database and summarise them correctly.",
          gigs: ["Student assistant roles in campus offices that run on spreadsheets", "Data entry and reporting gigs that lead to analysis work"],
          showIt: "A GitHub repo of 10 SQL questions you answered on a public dataset, with the queries.",
        },
        certs: [R.kaggleCert],
      },
      {
        title: "Python analysis",
        topics: [
          { title: "Python basics", minutes: 300, goal: "Comfortable with lists, dicts and functions", check: "Write out, in plain words, a function that takes a list of prices and returns the average of the ones above 10.", resources: [R.cs50py, R.coreyPy, R.kagglePy] },
          { title: "pandas wrangling", minutes: 360, goal: "Merge, reshape and clean messy tables", check: "Two tables share a customer ID but one has duplicates. What goes wrong when you merge them, and how do you check?", resources: [R.kagglePandas, R.alexAnalyst, R.pandasDocs] },
          { title: "Visualisation", minutes: 240, goal: "Choose the right chart and label it properly", check: "Name a chart that is often misleading and explain how to fix it.", resources: [R.kaggleViz, R.seaborn] },
        ],
        project: { title: "Analyse a public dataset", minutes: 300, goal: "A notebook that answers one real question with evidence" },
        earn: {
          canDo: "Take a messy dataset and deliver a clear answer with charts.",
          gigs: ["Freelance data cleaning and reporting", "Analytics internships", "Helping student orgs and nonprofits understand their numbers"],
          showIt: "A Kaggle or GitHub notebook that starts with the question and ends with a recommendation.",
        },
        certs: [R.googleDA],
      },
      {
        title: "Telling the story",
        topics: [
          { title: "A/B tests and confidence", minutes: 240, goal: "Know when a difference is real", check: "Version B got 5% more clicks over two days. What would you need to know before telling your boss B is better?", resources: [R.statquest, R.khanStats] },
          { title: "Dashboards", minutes: 240, goal: "One page a manager can read in 30 seconds", check: "What three things should a manager see first on a sales dashboard, and why those?", resources: [R.alexAnalyst, R.kaggleViz] },
        ],
        project: { title: "Portfolio dashboard", minutes: 360, goal: "A published dashboard with a short write-up" },
        earn: {
          canDo: "Build dashboards and reports people make decisions from.",
          gigs: ["Data analyst internships and entry roles", "Freelance dashboard builds for small businesses", "Business-analytics roles on campus"],
          showIt: "A public dashboard link on your resume and LinkedIn, with a one-paragraph story of the insight.",
        },
        certs: [R.pl300, R.googleDA],
      },
    ],
  },
  {
    id: "frontend",
    code: "WEB",
    name: "Frontend Web Development",
    blurb: "HTML and CSS up to React, TypeScript and a deployed app real clients can use.",
    roadmap: rm("frontend", "Frontend"),
    origin: "curated",
    stages: [
      {
        title: "The web platform",
        topics: [
          { title: "HTML and accessibility", minutes: 240, goal: "Semantic pages that work with a screen reader", check: "Why use a <button> instead of a clickable <div>? Name two things that break with the div.", resources: [R.mdn, R.webdev, R.fccYT] },
          { title: "CSS layout", minutes: 300, goal: "Flexbox and grid without guessing", check: "When would you reach for grid instead of flexbox? Describe a layout that needs each.", resources: [R.kevinPowell, R.mdn, R.webdev] },
          { title: "JavaScript fundamentals", minutes: 480, goal: "Functions, arrays, objects, async/await, the DOM", check: "Explain what async/await does, and what happens if you forget the await.", resources: [R.jsinfo, R.wds, R.fcc] },
        ],
        project: { title: "Responsive personal site", minutes: 300, goal: "A site that looks right on a phone and a laptop" },
        earn: {
          canDo: "Build and launch a clean, accessible website for a person or small business.",
          gigs: ["Websites for local businesses, clubs and campus events", "Student web assistant jobs in university departments"],
          showIt: "Your own live site, plus one site you made for someone else.",
        },
        certs: [R.fccCert],
      },
      {
        title: "Modern apps",
        topics: [
          { title: "React", minutes: 480, goal: "Components, state, effects and lists", check: "What is state in React, and why can't you just change a variable to update the screen?", resources: [R.react, R.wds, R.fccYT] },
          { title: "TypeScript", minutes: 240, goal: "Type your props and API responses", check: "Describe a bug TypeScript would catch that plain JavaScript would only show at runtime.", resources: [R.ts, R.wds] },
          { title: "Next.js and data fetching", minutes: 300, goal: "Routes, server code and deployment", check: "Why should an API key live in server code and never in a React component?", resources: [R.nextLearn, R.cs50w] },
        ],
        project: { title: "Deploy a full app", minutes: 480, goal: "A React app with real data, live on the internet" },
        earn: {
          canDo: "Build interactive web apps with real data and ship them.",
          gigs: ["Frontend internships", "Freelance web app builds", "Hackathon teams (frontend is always in demand)"],
          showIt: "Two deployed apps with clean READMEs and code you can explain line by line in an interview.",
        },
        certs: [R.metaFE, R.fccCert],
      },
    ],
  },
  {
    id: "cyber",
    code: "SEC",
    name: "Cyber Security",
    blurb: "Linux and networking basics through web security and CTFs, toward a first security role.",
    roadmap: rm("cyber-security", "Cyber Security"),
    origin: "curated",
    stages: [
      {
        title: "Foundations",
        topics: [
          { title: "Linux command line", minutes: 300, goal: "Navigate, search and script in a terminal", check: "Explain what file permissions like rwxr-x--- mean, and why they matter for security.", resources: [R.bandit, R.networkChuck] },
          { title: "Networking basics", minutes: 300, goal: "IP, DNS, TCP vs UDP, what a port is", check: "Walk through what happens, step by step, when you type a website address and press Enter.", resources: [R.messer, R.networkChuck, R.thm] },
          { title: "Security concepts", minutes: 240, goal: "CIA triad, threats, authentication, encryption", check: "Explain the difference between hashing and encryption, and why passwords should be hashed.", resources: [R.messer, R.cs50YT] },
        ],
        earn: {
          canDo: "Explain and apply security basics, and support people with IT safely.",
          gigs: ["Campus IT help desk", "IT support internships"],
          showIt: "Your Bandit progress and a short write-up of what you learned on each level.",
        },
        certs: [R.isc2CC, R.googleCyber],
      },
      {
        title: "Attack and defend",
        topics: [
          { title: "Web vulnerabilities", minutes: 360, goal: "Explain and spot injection, XSS and broken auth", check: "Explain SQL injection to a developer and show how a parameterised query prevents it.", resources: [R.portswigger, R.owasp, R.thm] },
          { title: "Capture the flag practice", minutes: 480, goal: "Solve ten beginner CTF challenges", check: "Describe one challenge you solved: what you tried first, what failed, and what worked.", resources: [R.pico, R.bandit] },
        ],
        project: { title: "Write up a CTF", minutes: 240, goal: "A clear write-up of three challenges you solved" },
        earn: {
          canDo: "Find and explain common web security issues, ethically and with permission.",
          gigs: ["Security operations (SOC) internships", "CTF competitions with prizes", "Bug bounty programs, only within their published rules"],
          showIt: "A blog or GitHub with CTF write-ups. Never test systems you don't have permission to test.",
        },
        certs: [R.secPlus],
      },
    ],
  },
];

/** How to use AI while learning so you end up knowing things. Shown on every learning path. */
export const AI_TUTOR_RULES = [
  "Try first, ask second. Spend 15 minutes stuck before asking AI, and ask for a hint, not the answer.",
  "Never paste code you can't explain line by line. If you can't, ask the AI to explain it, then rewrite it yourself.",
  "Ask AI to quiz you, not to do it for you. \"Quiz me on gradient descent\" beats \"write my model\".",
  "Check AI against a real source. Docs and the course you're taking win when they disagree.",
  "Build the portfolio project yourself. That's the thing employers and clients will ask you about.",
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
/** A certification someone named but we haven't vetted: link a search, never a guessed URL. */
export function certSearch(name: string): Resource {
  return { label: `${name} (search)`, url: `https://www.google.com/search?q=${encodeURIComponent(name + " certification official")}`, kind: "cert" };
}

export function searchLinks(goal: string, topic: string): Resource[] {
  const q = encodeURIComponent(`${topic} ${goal}`.trim());
  return [
    { label: "YouTube: find a course", url: `https://www.youtube.com/results?search_query=${q}+full+course`, kind: "search", cost: "Free" },
    { label: "freeCodeCamp articles", url: `https://www.freecodecamp.org/news/search/?query=${q}`, kind: "search", cost: "Free" },
  ];
}

/** Offline outline for any goal: a sensible shape the learner can edit, with search links. */
export function outlineFor(goal: string): Track {
  const clean = goal.trim().replace(/\s+/g, " ").slice(0, 60) || "a new skill";
  const t = (title: string, minutes: number, goalLine: string): Topic => ({
    title,
    minutes,
    goal: goalLine,
    check: `Explain the most important idea from "${title}" to a classmate, in your own words, with one concrete example.`,
    resources: searchLinks(clean, title),
  });
  return {
    id: "custom",
    code: codeFor(clean),
    name: titleCase(clean),
    blurb: `A starter outline for ${clean}. Edit topics as you learn more.`,
    roadmap: roadmapFor(clean),
    origin: "outline",
    stages: [
      { title: "Orientation", topics: [t(`What ${clean} is and the core vocabulary`, 120, "Explain it to a friend in two minutes"), t(`Set up your tools for ${clean}`, 120, "A working setup you can practise in")] },
      { title: "Fundamentals", topics: [t(`${titleCase(clean)} fundamentals, part 1`, 300, "Work through a beginner course or book"), t(`${titleCase(clean)} fundamentals, part 2`, 300, "Finish the beginner material and do its exercises")], project: { title: `First small ${clean} project`, minutes: 240, goal: "Something tiny but finished" }, earn: { canDo: `Help a friend, club or classmate with a small ${clean} task.`, gigs: ["Tutoring beginners", "Volunteer work for a student org, which becomes your first reference"], showIt: "Post the project publicly with a short write-up of what you learned." } },
      { title: "Going deeper", topics: [t(`Intermediate ${clean} topics`, 360, "Pick the two topics you found hardest and go deep"), t(`How professionals use ${clean}`, 180, "Read two real-world case studies or codebases")], project: { title: `Portfolio ${clean} project`, minutes: 480, goal: "A project you would show someone" }, earn: { canDo: `Take on a small paid ${clean} project with a clear scope.`, gigs: ["Freelance projects", "Internships that list this skill"], showIt: "A portfolio piece someone else actually used, with their feedback." }, certs: [certSearch(titleCase(clean))] },
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
  type RawEarn = { canDo?: string; gigs?: string[]; showIt?: string } | null;
  const r = raw as { name?: string; stages?: { title?: string; topics?: { title?: string; minutes?: number; goal?: string; check?: string }[]; project?: { title?: string; minutes?: number; goal?: string } | null; earn?: RawEarn; certifications?: string[] }[] };
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
        .map((x) => ({
          title: String(x.title).slice(0, 90),
          minutes: clamp(x.minutes, 180),
          goal: String(x.goal ?? "").slice(0, 160),
          check: String(x.check ?? "").slice(0, 300) || `Explain "${String(x.title).slice(0, 90)}" in your own words with one example.`,
          resources: searchLinks(clean, String(x.title)),
        })),
      project: s?.project?.title ? { title: String(s.project.title).slice(0, 90), minutes: clamp(s.project.minutes, 300), goal: String(s.project.goal ?? "").slice(0, 160) } : undefined,
      earn: s?.earn?.canDo
        ? { canDo: String(s.earn.canDo).slice(0, 200), gigs: (Array.isArray(s.earn.gigs) ? s.earn.gigs : []).slice(0, 4).map((g) => String(g).slice(0, 120)), showIt: String(s.earn.showIt ?? "").slice(0, 200) }
        : undefined,
      certs: (Array.isArray(s?.certifications) ? s.certifications : []).slice(0, 3).filter(Boolean).map((n) => certSearch(String(n).slice(0, 90))),
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
