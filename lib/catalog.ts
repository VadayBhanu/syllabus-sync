// A small, hand-checked catalogue of direct links for foundations that show up in many
// roadmaps. Topics (including ones Gemini drafts) are matched against it, so learners get a
// page they can open right away. Only when nothing here fits do they get a search link,
// labelled as a search. Gemini never supplies URLs.

import type { Resource } from "./roadmaps";

const c = (label: string, url: string, cost: Resource["cost"] = "Free"): Resource => ({ label, url, kind: "course", cost });
const v = (label: string, url: string): Resource => ({ label, url, kind: "video", cost: "Free" });
const d = (label: string, url: string): Resource => ({ label, url, kind: "docs", cost: "Free" });

interface Entry {
  match: RegExp;
  resources: Resource[];
}

export const CATALOG: Entry[] = [
  // maths
  { match: /linear algebra|matri(x|ces)|eigen|\bvectors?\b(?! (db|database|store|search))/i, resources: [v("3Blue1Brown, Essence of linear algebra", "https://www.3blue1brown.com/topics/linear-algebra"), c("Khan Academy, Linear algebra", "https://www.khanacademy.org/math/linear-algebra"), c("MIT 18.06 Linear Algebra (Gilbert Strang)", "https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/")] },
  { match: /calculus|derivative|integral|gradient descent/i, resources: [v("3Blue1Brown, Essence of calculus", "https://www.3blue1brown.com/topics/calculus"), c("Khan Academy, Calculus 1", "https://www.khanacademy.org/math/calculus-1")] },
  { match: /complex number|imaginary/i, resources: [c("Khan Academy, Algebra 2 (complex numbers unit)", "https://www.khanacademy.org/math/algebra2")] },
  { match: /probabilit|statistic|bayes|distribution|hypothesis|a\/b test/i, resources: [v("StatQuest with Josh Starmer", "https://www.youtube.com/@statquest"), c("Khan Academy, Statistics and probability", "https://www.khanacademy.org/math/statistics-probability")] },
  // computing foundations
  { match: /algorithm|data structure|big.?o|sorting|graph search|dynamic programming/i, resources: [c("MIT 6.006 Introduction to Algorithms", "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/"), c("Harvard CS50", "https://cs50.harvard.edu/x/")] },
  { match: /\bpython\b/i, resources: [c("Harvard CS50 Python", "https://cs50.harvard.edu/python/"), v("Corey Schafer, Python tutorials", "https://www.youtube.com/@coreyms"), d("The official Python tutorial", "https://docs.python.org/3/tutorial/")] },
  { match: /pandas|numpy|dataframe/i, resources: [c("Kaggle Learn, Pandas", "https://www.kaggle.com/learn/pandas"), d("pandas getting started", "https://pandas.pydata.org/docs/getting_started/index.html")] },
  { match: /\bsql\b|database|quer(y|ies)/i, resources: [c("SQLBolt, interactive SQL lessons", "https://sqlbolt.com"), c("Kaggle Learn, Intro to SQL", "https://www.kaggle.com/learn/intro-to-sql")] },
  { match: /\bgit\b|github|version control/i, resources: [d("Pro Git (free book)", "https://git-scm.com/book/en/v2")] },
  { match: /linux|command line|terminal|bash|shell/i, resources: [c("OverTheWire Bandit (Linux wargame)", "https://overthewire.org/wargames/bandit/"), v("NetworkChuck", "https://www.youtube.com/@NetworkChuck")] },
  { match: /docker|container/i, resources: [d("Docker: Get started", "https://docs.docker.com/get-started/")] },
  { match: /networking|network basics|tcp|dns|\bip address|subnet/i, resources: [v("Professor Messer (Network+ and Security+)", "https://www.professormesser.com")] },
  // web
  { match: /html|accessib|semantic/i, resources: [d("MDN, Learn web development", "https://developer.mozilla.org/en-US/docs/Learn_web_development"), d("web.dev Learn", "https://web.dev/learn")] },
  { match: /\bcss\b|flexbox|grid layout|responsive/i, resources: [v("Kevin Powell, CSS", "https://www.youtube.com/@KevinPowell"), d("web.dev Learn CSS", "https://web.dev/learn")] },
  { match: /javascript|\bjs\b|async|\bdom\b/i, resources: [d("javascript.info", "https://javascript.info"), v("Web Dev Simplified", "https://www.youtube.com/@WebDevSimplified")] },
  { match: /typescript/i, resources: [d("TypeScript Handbook", "https://www.typescriptlang.org/docs/handbook/intro.html")] },
  { match: /react/i, resources: [d("react.dev, Learn React", "https://react.dev/learn")] },
  { match: /next\.?js/i, resources: [c("Next.js Learn course", "https://nextjs.org/learn")] },
  // ML and AI
  { match: /machine learning|regression|classification|overfit|scikit|clustering/i, resources: [c("Andrew Ng, Machine Learning Specialization", "https://www.coursera.org/specializations/machine-learning-introduction", "Free to audit"), c("Google Machine Learning Crash Course", "https://developers.google.com/machine-learning/crash-course"), v("StatQuest with Josh Starmer", "https://www.youtube.com/@statquest")] },
  { match: /neural|deep learning|backprop|cnn|convolution/i, resources: [v("3Blue1Brown, Neural networks", "https://www.3blue1brown.com/topics/neural-networks"), c("fast.ai, Practical Deep Learning", "https://course.fast.ai"), d("Dive into Deep Learning (free book)", "https://d2l.ai")] },
  { match: /pytorch/i, resources: [d("PyTorch tutorials", "https://pytorch.org/tutorials/")] },
  { match: /transformer|attention|\bllm|language model|gpt|tokeni/i, resources: [v("Andrej Karpathy, Neural Networks: Zero to Hero", "https://karpathy.ai/zero-to-hero.html"), c("Hugging Face Learn", "https://huggingface.co/learn")] },
  { match: /\brag\b|retrieval|embedding|vector (db|database|store)|agent|prompt/i, resources: [c("Hugging Face Learn", "https://huggingface.co/learn"), c("DeepLearning.AI short courses", "https://www.deeplearning.ai/short-courses/")] },
  { match: /artificial intelligence|\bai\b|search algorithm|knowledge representation/i, resources: [c("Harvard CS50 AI", "https://cs50.harvard.edu/ai/")] },
  // quantum
  { match: /quantum|qubit|superposition|entangle/i, resources: [c("IBM Quantum Learning, Basics of quantum information", "https://quantum.cloud.ibm.com/learning/courses/basics-of-quantum-information"), c("IBM Quantum Learning (all courses)", "https://quantum.cloud.ibm.com/learning/courses"), c("MIT 8.04 Quantum Physics I", "https://ocw.mit.edu/courses/8-04-quantum-physics-i-spring-2013/")] },
  // security
  { match: /security|vulnerab|injection|xss|owasp|ctf|hacking|encrypt/i, resources: [c("PortSwigger Web Security Academy", "https://portswigger.net/web-security"), d("OWASP Top 10", "https://owasp.org/www-project-top-ten/"), c("picoCTF practice", "https://picoctf.org")] },
  // design and other common goals
  { match: /\bux\b|user experience|usability|user research|wireframe|prototyp/i, resources: [d("Nielsen Norman Group articles", "https://www.nngroup.com/articles/"), c("Google UX Design Certificate", "https://www.coursera.org/professional-certificates/google-ux-design", "Free to audit")] },
  { match: /marketing|funnel|seo\b|branding|social media|content strategy|email campaign|competitor|market analysis|customer persona/i, resources: [c("HubSpot Academy (free marketing courses)", "https://academy.hubspot.com"), c("Google Skillshop (Analytics and Ads)", "https://skillshop.withgoogle.com"), c("Meta Blueprint (social media marketing)", "https://www.facebook.com/business/learn")] },
  { match: /startup|business model|product.market fit|founder|pitch|fundrais|mvp/i, resources: [c("Y Combinator Startup School", "https://www.startupschool.org")] },
  { match: /physics|mechanics|kinematics/i, resources: [c("Khan Academy, Physics", "https://www.khanacademy.org/science/physics")] },
  { match: /econom|finance|investing/i, resources: [c("Khan Academy, Economics and finance", "https://www.khanacademy.org/economics-finance-domain")] },
];

/** Direct links for a topic: matched on the topic first, then on the wider goal. */
export function catalogFor(topic: string, goal = "", limit = 3): Resource[] {
  const pick = (text: string) => {
    const out: Resource[] = [];
    for (const e of CATALOG) if (e.match.test(text)) for (const r of e.resources) if (!out.some((x) => x.url === r.url)) out.push(r);
    return out;
  };
  const own = pick(topic);
  return (own.length ? own : goal ? pick(goal) : []).slice(0, limit);
}

/** Direct links first, then whatever else we have, without duplicates. */
export function mergeLinks<T extends { url: string }>(first: T[], rest: T[], limit = 5): T[] {
  const out: T[] = [];
  for (const r of [...first, ...rest]) if (!out.some((x) => x.url === r.url)) out.push(r);
  return out.slice(0, limit);
}

const SEARCH: [string, (q: string) => string, Resource["cost"]][] = [
  ["YouTube", (q) => `https://www.youtube.com/results?search_query=${q}`, "Free"],
  ["Coursera", (q) => `https://www.coursera.org/search?query=${q}`, "Free to audit"],
  ["Khan Academy", (q) => `https://www.khanacademy.org/search?page_search_query=${q}`, "Free"],
];

/**
 * Sources for one stop on the map: direct catalogue links first, then labelled searches on a few
 * trusted platforms. `phrase` lets Trojan sharpen the search ("HubSpot marketing funnel") without
 * ever handing us a URL.
 */
export function sourcesFor(topic: string, goal = "", phrase?: string): Resource[] {
  const q = (phrase?.trim() || `${topic} ${goal}`.trim()).replace(/\s+/g, " ").slice(0, 80);
  const searches: Resource[] = SEARCH.map(([name, make, cost]) => ({ label: `Search ${name}: "${q}"`, url: make(encodeURIComponent(q)), kind: "search", cost }));
  return mergeLinks(catalogFor(topic, goal), searches, 6);
}
