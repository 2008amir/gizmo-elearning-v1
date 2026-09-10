export type ResearchTemplate = {
  id: string;
  name: string;
  description: string;
  preview_bg: string;
  content_html: string;
};

export const RESEARCH_TEMPLATES: ResearchTemplate[] = [
  {
    id: "minimalist-blog",
    name: "Modern Minimalist",
    description: "Clean white layout with sidebar, newsletter, and elegant typography.",
    preview_bg: "#f8f9fa",
    content_html: `<div data-rich-wrapper="true" style="background:#f8f9fa;padding:1.5rem 2rem;"><div style="max-width:1100px;margin:0 auto;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#333;">
<div style="text-align:center;padding:40px 0 20px;border-bottom:1px solid #eaeaea;margin-bottom:30px;">
<h1 style="font-size:2.5rem;font-weight:700;color:#2d3436;letter-spacing:-1px;margin:0;">LUMINA.</h1>
</div>
<div style="display:grid;grid-template-columns:2fr 1fr;gap:2rem;">
<div>
<div style="background:#fff;padding:2rem;border-radius:12px;margin-bottom:2rem;box-shadow:0 4px 6px rgba(0,0,0,0.02);">
<span style="text-transform:uppercase;font-size:0.75rem;font-weight:700;color:#00b894;letter-spacing:1px;">Technology</span>
<h2 style="font-size:2rem;margin:0.5rem 0;color:#2d3436;">The Future of AI in Creative Design</h2>
<p style="font-size:0.9rem;color:#b2bec3;margin-bottom:1rem;">Posted on October 24, 2023 • 5 min read</p>
<p style="color:#636e72;margin-bottom:1.5rem;">Artificial Intelligence is no longer just a tool for data scientists. Today, it's becoming the ultimate co-pilot for designers and artists worldwide...</p>
<a href="#" style="display:inline-block;padding:0.6rem 1.2rem;background:#2d3436;color:#fff;text-decoration:none;border-radius:6px;font-size:0.9rem;">Read Full Story</a>
</div>
<div style="background:#fff;padding:2rem;border-radius:12px;box-shadow:0 4px 6px rgba(0,0,0,0.02);">
<span style="text-transform:uppercase;font-size:0.75rem;font-weight:700;color:#00b894;letter-spacing:1px;">Lifestyle</span>
<h2 style="font-size:2rem;margin:0.5rem 0;color:#2d3436;">10 Habits for a Mindful Morning</h2>
<p style="font-size:0.9rem;color:#b2bec3;margin-bottom:1rem;">Posted on October 22, 2023 • 8 min read</p>
<p style="color:#636e72;">Starting your day with intention can change your entire outlook...</p>
</div>
</div>
<div>
<div style="background:#fff;padding:1.5rem;border-radius:12px;margin-bottom:2rem;">
<h3 style="font-size:1.1rem;margin-bottom:1rem;border-bottom:2px solid #f1f1f1;padding-bottom:0.5rem;">About Me</h3>
<p style="font-size:0.9rem;color:#636e72;">I'm a digital nomad sharing my thoughts on design, tech, and the art of living well.</p>
</div>
</div>
</div>
</div></div>`,
  },
  {
    id: "cyber-noble",
    name: "The Noble Neural",
    description: "Dark cyberpunk aesthetic with neon accents, serif typography, and futuristic layout.",
    preview_bg: "#0b1120",
    content_html: `<div data-rich-wrapper="true" style="background:#0b1120;padding:1.5rem 2rem;"><div style="max-width:1100px;margin:0 auto;font-family:Georgia,'Times New Roman',serif;color:#d1d9e6;line-height:1.8;">
<div style="text-align:center;padding:80px 20px 40px;border-bottom:1px solid rgba(255,0,255,0.3);margin-bottom:40px;">
<div style="display:inline-flex;justify-content:space-between;width:100%;max-width:800px;border-top:1px solid #ff00ff;border-bottom:1px solid #ff00ff;padding:8px 0;margin-bottom:25px;font-size:0.8rem;text-transform:uppercase;letter-spacing:4px;color:#ff00ff;">
<span>Special Transmission</span>
<span>April 30, 2026</span>
<span>Est. 1894 / Rev. 2026</span>
</div>
<h1 style="font-size:4rem;font-weight:700;letter-spacing:-1px;margin:15px 0;text-transform:uppercase;background:linear-gradient(to right,#00f2fe,#ff00ff);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">The Noble Neural</h1>
</div>
<div style="max-width:800px;margin:0 auto;">
<span style="font-variant:small-caps;letter-spacing:3px;color:#00f2fe;font-weight:bold;display:block;margin-bottom:15px;">Research & Collaboration</span>
<h2 style="font-size:3rem;line-height:1.1;margin-bottom:20px;color:#ffffff;">Synthesizing Intelligence: The Dawn of the Bio-Digital Era</h2>
<div style="font-size:1.25rem;text-align:justify;color:#d1d9e6;">
<p>Integration of the human mind with synthetic substrates represents the final frontier of our evolution.</p>
</div>
</div>
<footer style="text-align:center;padding:60px;color:#4e5d6e;font-size:0.8rem;letter-spacing:2px;">© 2026 NOBLE NEURAL</footer>
</div></div>`,
  },
  {
    id: "medical-journal",
    name: "Medical Journal",
    description: "Professional medical journal style with clean structure and clinical blue tones.",
    preview_bg: "#ffffff",
    content_html: `<div data-rich-wrapper="true" style="background:#ffffff;padding:1.5rem 2rem;"><div style="max-width:900px;margin:0 auto;font-family:'Times New Roman',serif;color:#1a1a2e;">
<div style="border-bottom:3px solid #0a3d62;padding-bottom:20px;margin-bottom:30px;">
<h1 style="font-size:2.5rem;font-weight:700;color:#0a3d62;margin:0;">MEDICAL RESEARCH JOURNAL</h1>
<p style="color:#666;font-size:0.9rem;margin-top:5px;letter-spacing:2px;text-transform:uppercase;">Peer-Reviewed · Open Access · Vol. 12, Issue 4</p>
</div>
<div style="border-left:4px solid #0a3d62;padding-left:20px;margin-bottom:30px;">
<h2 style="font-size:1.8rem;color:#1a1a2e;margin-bottom:10px;">Research Article Title</h2>
<p style="color:#666;font-size:0.85rem;">Authors: Dr. A. Smith, Dr. B. Johnson | DOI: 10.xxxx/xxxxx</p>
</div>
<div style="background:#f0f7ff;padding:20px;border-radius:8px;margin-bottom:25px;">
<h3 style="color:#0a3d62;font-size:1rem;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">Abstract</h3>
<p style="color:#333;font-size:1rem;line-height:1.8;text-align:justify;">This study investigates the molecular mechanisms underlying drug resistance in targeted cancer therapies.</p>
</div>
<h3 style="color:#0a3d62;margin-top:30px;border-bottom:1px solid #ddd;padding-bottom:5px;">1. Introduction</h3>
<p style="text-align:justify;line-height:1.8;">The rapid advancement in precision medicine has transformed our approach to treating complex diseases...</p>
</div></div>`,
  },
  {
    id: "dark-aurora",
    name: "Dark Aurora",
    description: "Deep dark background with aurora borealis gradient accents and modern sans-serif.",
    preview_bg: "linear-gradient(180deg, #0f0c29, #302b63, #24243e)",
    content_html: `<div data-rich-wrapper="true" style="background:linear-gradient(180deg, #0f0c29, #302b63, #24243e);padding:1.5rem 2rem;"><div style="max-width:800px;margin:0 auto;font-family:'Segoe UI',system-ui,sans-serif;color:#e0e0ff;">
<div style="text-align:center;padding:60px 0 40px;">
<p style="color:#7c5cbf;text-transform:uppercase;letter-spacing:4px;font-size:0.8rem;margin-bottom:10px;">Research Publication</p>
<h1 style="font-size:3rem;font-weight:700;background:linear-gradient(135deg,#667eea,#764ba2,#f093fb);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin:0;">Aurora Research Lab</h1>
<div style="width:80px;height:3px;background:linear-gradient(90deg,#667eea,#f093fb);margin:20px auto;border-radius:2px;"></div>
</div>
<h2 style="color:#c4b5fd;font-size:2rem;text-align:center;margin-bottom:30px;">Exploring the Boundaries of Neural Computation</h2>
<div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:25px;margin-bottom:30px;">
<p style="font-size:1.1rem;line-height:1.9;color:#c8c8e8;text-align:justify;">The convergence of neuroscience and artificial intelligence opens unprecedented avenues for understanding consciousness.</p>
</div>
</div></div>`,
  },
  {
    id: "nature-green",
    name: "Nature & Ecology",
    description: "Fresh green-themed layout inspired by nature journals with earthy tones.",
    preview_bg: "#f5f9f0",
    content_html: `<div data-rich-wrapper="true" style="background:#f5f9f0;padding:1.5rem 2rem;"><div style="max-width:850px;margin:0 auto;font-family:Georgia,serif;color:#2d3e2f;">
<div style="background:linear-gradient(135deg,#2d6a4f,#52b788);padding:40px;border-radius:16px;margin-bottom:30px;color:white;text-align:center;">
<p style="text-transform:uppercase;letter-spacing:3px;font-size:0.75rem;opacity:0.8;margin-bottom:10px;">Ecology Research</p>
<h1 style="font-size:2.5rem;font-weight:700;margin:0;color:#fff;">Biodiversity & Conservation</h1>
<p style="margin-top:10px;opacity:0.9;font-size:1rem;">Preserving Earth's Living Systems</p>
</div>
<div style="background:white;border-radius:12px;padding:30px;margin-bottom:20px;border-left:4px solid #52b788;">
<h3 style="color:#2d6a4f;text-transform:uppercase;letter-spacing:1px;font-size:0.85rem;margin-bottom:10px;">Abstract</h3>
<p style="line-height:1.8;color:#555;text-align:justify;">This review examines the current state of global biodiversity and proposes integrated conservation strategies.</p>
</div>
<h2 style="color:#2d6a4f;margin-top:30px;font-size:1.6rem;">Introduction</h2>
<p style="line-height:1.9;text-align:justify;color:#444;">The rapid decline in global biodiversity represents one of the most pressing environmental challenges of our time...</p>
</div></div>`,
  },
  {
    id: "sunset-warm",
    name: "Warm Sunset",
    description: "Warm gradient tones with golden accents, perfect for humanities and social sciences.",
    preview_bg: "linear-gradient(135deg, #ffecd2, #fcb69f)",
    content_html: `<div data-rich-wrapper="true" style="background:linear-gradient(135deg, #ffecd2, #fcb69f);padding:1.5rem 2rem;"><div style="max-width:800px;margin:0 auto;font-family:'Segoe UI',system-ui,sans-serif;color:#4a2c0a;">
<div style="text-align:center;padding:50px 0 30px;">
<h1 style="font-size:2.8rem;font-weight:700;color:#8b4513;margin:0;">Research Insights</h1>
<div style="width:60px;height:3px;background:#d4770b;margin:15px auto;border-radius:2px;"></div>
<p style="color:#996633;font-size:1rem;">Exploring the Human Experience Through Science</p>
</div>
<div style="background:rgba(255,255,255,0.7);border-radius:16px;padding:30px;margin-bottom:25px;backdrop-filter:blur(10px);">
<h2 style="color:#8b4513;font-size:1.8rem;margin-bottom:15px;">The Psychology of Decision Making</h2>
<p style="color:#5c3a1a;line-height:1.8;font-size:1.05rem;text-align:justify;">Understanding how humans make choices under uncertainty has been a central question in cognitive science.</p>
</div>
</div></div>`,
  },
  {
    id: "midnight-blue",
    name: "Midnight Science",
    description: "Deep blue scientific layout with structured sections and data-focused design.",
    preview_bg: "#0a192f",
    content_html: `<div data-rich-wrapper="true" style="background:#0a192f;padding:1.5rem 2rem;"><div style="max-width:850px;margin:0 auto;font-family:'Segoe UI',system-ui,sans-serif;color:#ccd6f6;">
<div style="border-bottom:2px solid #64ffda;padding-bottom:30px;margin-bottom:35px;">
<p style="color:#64ffda;font-size:0.8rem;text-transform:uppercase;letter-spacing:3px;margin-bottom:8px;">Scientific Report</p>
<h1 style="font-size:2.5rem;font-weight:700;color:#e6f1ff;margin:0;">Quantum Computing in Drug Discovery</h1>
<p style="color:#8892b0;margin-top:10px;">Published April 2026 · Computational Chemistry Division</p>
</div>
<div style="background:rgba(100,255,218,0.05);border:1px solid rgba(100,255,218,0.2);border-radius:8px;padding:25px;margin-bottom:30px;">
<h3 style="color:#64ffda;font-size:0.9rem;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">Summary</h3>
<p style="color:#a8b2d1;line-height:1.8;text-align:justify;">This paper presents a novel quantum algorithm for molecular simulation that achieves a 100x speedup over classical methods.</p>
</div>
<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:15px;margin-top:30px;">
<div style="background:rgba(100,255,218,0.08);padding:15px;border-radius:8px;text-align:center;">
<p style="font-size:2rem;font-weight:700;color:#64ffda;margin:0;">100x</p>
<p style="font-size:0.8rem;color:#8892b0;">Speedup</p>
</div>
<div style="background:rgba(100,255,218,0.08);padding:15px;border-radius:8px;text-align:center;">
<p style="font-size:2rem;font-weight:700;color:#64ffda;margin:0;">98.7%</p>
<p style="font-size:0.8rem;color:#8892b0;">Accuracy</p>
</div>
<div style="background:rgba(100,255,218,0.08);padding:15px;border-radius:8px;text-align:center;">
<p style="font-size:2rem;font-weight:700;color:#64ffda;margin:0;">12k</p>
<p style="font-size:0.8rem;color:#8892b0;">Molecules</p>
</div>
</div>
</div></div>`,
  },
  {
    id: "elegant-serif",
    name: "Elegant Serif",
    description: "Classical typographic layout with large drop caps and refined serif styling.",
    preview_bg: "#faf8f5",
    content_html: `<div data-rich-wrapper="true" style="background:#faf8f5;padding:1.5rem 2rem;"><div style="max-width:750px;margin:0 auto;font-family:Georgia,'Palatino Linotype',serif;color:#2c2c2c;">
<div style="text-align:center;padding:50px 0;">
<p style="color:#999;text-transform:uppercase;letter-spacing:5px;font-size:0.7rem;">Issue No. 47 · Spring 2026</p>
<h1 style="font-size:3.5rem;font-weight:400;color:#1a1a1a;margin:20px 0;font-style:italic;">The Art of Discovery</h1>
<div style="width:40px;height:1px;background:#999;margin:0 auto;"></div>
</div>
<p style="font-size:1.15rem;line-height:2;text-align:justify;color:#444;"><span style="float:left;font-size:4.5rem;line-height:0.8;padding-right:12px;color:#8b0000;font-weight:700;">T</span>he greatest discoveries in science have rarely come from linear thinking alone. Rather, they emerge from the fertile ground where disciplined methodology meets unbridled curiosity.</p>
<blockquote style="border-left:3px solid #8b0000;margin:30px 0;padding:15px 25px;background:rgba(139,0,0,0.03);">
<p style="font-style:italic;color:#555;font-size:1.1rem;line-height:1.8;">"The important thing in science is not so much to obtain new facts as to discover new ways of thinking about them."</p>
<p style="color:#999;font-size:0.85rem;margin-top:8px;">— Sir William Bragg</p>
</blockquote>
</div></div>`,
  },
  {
    id: "neon-pulse",
    name: "Neon Pulse",
    description: "Vibrant neon-on-black design with pulsing accent colors and modern grid layout.",
    preview_bg: "#0d0d0d",
    content_html: `<div data-rich-wrapper="true" style="background:#0d0d0d;padding:1.5rem 2rem;"><div style="max-width:900px;margin:0 auto;font-family:'Segoe UI',system-ui,sans-serif;color:#f0f0f0;">
<div style="text-align:center;padding:50px 0 40px;">
<h1 style="font-size:3rem;font-weight:800;text-transform:uppercase;letter-spacing:2px;background:linear-gradient(90deg,#ff006e,#8338ec,#3a86ff);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">NEON PULSE</h1>
<p style="color:#888;font-size:0.85rem;text-transform:uppercase;letter-spacing:3px;margin-top:8px;">Next-Gen Research Platform</p>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:30px;">
<div style="background:rgba(255,0,110,0.1);border:1px solid rgba(255,0,110,0.4);border-radius:12px;padding:25px;">
<h3 style="color:#ff006e;font-size:1.2rem;margin-bottom:10px;">CRISPR Advances</h3>
<p style="color:#ccc;font-size:0.95rem;line-height:1.7;">Gene-editing technology reaches new precision milestones.</p>
</div>
<div style="background:rgba(131,56,236,0.1);border:1px solid rgba(131,56,236,0.4);border-radius:12px;padding:25px;">
<h3 style="color:#8338ec;font-size:1.2rem;margin-bottom:10px;">Neural Interfaces</h3>
<p style="color:#ccc;font-size:0.95rem;line-height:1.7;">Brain-computer interface trials show promising results.</p>
</div>
</div>
</div></div>`,
  },
  {
    id: "pastel-dream",
    name: "Pastel Dream",
    description: "Soft pastel palette with rounded elements and gentle gradients for accessible reading.",
    preview_bg: "linear-gradient(135deg, #e0c3fc, #8ec5fc)",
    content_html: `<div data-rich-wrapper="true" style="background:linear-gradient(135deg, #e0c3fc, #8ec5fc);padding:1.5rem 2rem;"><div style="max-width:800px;margin:0 auto;font-family:'Segoe UI',system-ui,sans-serif;color:#2d2d4e;">
<div style="text-align:center;padding:40px 0;">
<h1 style="font-size:2.5rem;font-weight:700;color:#4a2d7a;margin:0;">Wellness Research</h1>
<p style="color:#6b5b8a;margin-top:8px;">Bridging Science and Well-Being</p>
</div>
<div style="background:rgba(255,255,255,0.75);border-radius:20px;padding:30px;margin-bottom:20px;backdrop-filter:blur(10px);">
<h2 style="color:#6c3d99;font-size:1.6rem;margin-bottom:15px;">The Neuroscience of Meditation</h2>
<p style="color:#555;line-height:1.8;font-size:1.05rem;">Recent neuroimaging studies have revealed remarkable structural changes in the brains of long-term meditation practitioners.</p>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:15px;margin-top:20px;">
<div style="background:rgba(255,255,255,0.6);border-radius:16px;padding:20px;text-align:center;">
<p style="font-size:2rem;margin:0;">🧠</p>
<p style="font-weight:600;color:#6c3d99;margin-top:5px;">Neuroplasticity</p>
</div>
<div style="background:rgba(255,255,255,0.6);border-radius:16px;padding:20px;text-align:center;">
<p style="font-size:2rem;margin:0;">💊</p>
<p style="font-weight:600;color:#6c3d99;margin-top:5px;">Pharmacology</p>
</div>
<div style="background:rgba(255,255,255,0.6);border-radius:16px;padding:20px;text-align:center;">
<p style="font-size:2rem;margin:0;">🔬</p>
<p style="font-weight:600;color:#6c3d99;margin-top:5px;">Methodology</p>
</div>
</div>
</div></div>`,
  },
  {
    id: "obsidian-mono",
    name: "Obsidian Mono",
    description: "Dark minimalist mono-space layout with sharp contrast and grid lines.",
    preview_bg: "#0a0a0a",
    content_html: `<div data-rich-wrapper="true" style="background:#0a0a0a;padding:2rem;"><div style="max-width:820px;margin:0 auto;font-family:'JetBrains Mono','Courier New',monospace;color:#e5e5e5;">
<div style="border:1px solid #262626;padding:32px;">
<p style="color:#737373;font-size:0.7rem;text-transform:uppercase;letter-spacing:4px;margin:0 0 8px;">// research_log_047</p>
<h1 style="font-size:2.4rem;font-weight:700;color:#fafafa;margin:0 0 12px;letter-spacing:-1px;">obsidian.protocol()</h1>
<p style="color:#a3a3a3;line-height:1.9;font-size:0.95rem;">A raw, code-first documentation surface. Precision-tuned for engineers and technical writers who value clarity above ornament.</p>
<div style="margin-top:24px;padding:16px;background:#171717;border-left:2px solid #fafafa;">
<p style="margin:0;color:#d4d4d4;font-size:0.9rem;">> execute --module=quantum --verbose</p>
</div>
</div>
</div></div>`,
  },
  {
    id: "porcelain-light",
    name: "Porcelain Light",
    description: "Airy off-white layout with fine hairlines and elegant serif headings.",
    preview_bg: "#fafaf7",
    content_html: `<div data-rich-wrapper="true" style="background:#fafaf7;padding:2rem;"><div style="max-width:780px;margin:0 auto;font-family:'Cormorant Garamond',Georgia,serif;color:#1c1c1c;">
<div style="text-align:center;padding:60px 0 30px;border-bottom:1px solid #e5e5e0;">
<p style="text-transform:uppercase;letter-spacing:6px;color:#8a8a80;font-size:0.7rem;font-family:'Helvetica Neue',sans-serif;">Volume III · Essay</p>
<h1 style="font-size:3.4rem;font-weight:500;font-style:italic;margin:16px 0 8px;">On Quiet Innovation</h1>
</div>
<p style="line-height:2;font-size:1.15rem;margin-top:32px;color:#2c2c2c;text-align:justify;">The most enduring breakthroughs rarely arrive with fanfare. They accumulate in silence — in the patient repetition of experiments, the disciplined refinement of an idea.</p>
</div></div>`,
  },
  {
    id: "crimson-editorial",
    name: "Crimson Editorial",
    description: "Bold light editorial layout with crimson accents and large asymmetric headings.",
    preview_bg: "#fdfaf6",
    content_html: `<div data-rich-wrapper="true" style="background:#fdfaf6;padding:2rem;"><div style="max-width:900px;margin:0 auto;font-family:'Helvetica Neue',Arial,sans-serif;color:#111;">
<div style="display:grid;grid-template-columns:1fr 3fr;gap:32px;padding:40px 0;border-bottom:3px solid #b91c1c;">
<div>
<p style="color:#b91c1c;font-weight:800;text-transform:uppercase;letter-spacing:2px;font-size:0.75rem;">Feature</p>
<p style="color:#666;margin-top:8px;font-size:0.8rem;">Issue 12 · 2026</p>
</div>
<h1 style="font-size:3rem;font-weight:900;line-height:1;margin:0;letter-spacing:-1.5px;">The Editors Who Rewrote the Rules of Science Journalism</h1>
</div>
<p style="margin-top:32px;font-size:1.1rem;line-height:1.8;color:#333;column-count:2;column-gap:32px;">In the past decade a new generation of editors has quietly transformed how scientific breakthroughs reach the public — favoring narrative clarity over jargon, and human context over abstraction. Their work has redefined what a science publication can be.</p>
</div></div>`,
  },
  {
    id: "graphene-dark",
    name: "Graphene",
    description: "Dark technical layout with hex-grid feel, cyan data highlights.",
    preview_bg: "#0e1116",
    content_html: `<div data-rich-wrapper="true" style="background:#0e1116;padding:2rem;"><div style="max-width:900px;margin:0 auto;font-family:'Inter',system-ui,sans-serif;color:#c9d1d9;">
<div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:20px;border-bottom:1px solid #1f2937;">
<div><h1 style="font-size:1.8rem;font-weight:700;color:#f0f6fc;margin:0;">Graphene<span style="color:#22d3ee;">.</span>lab</h1><p style="color:#7d8590;font-size:0.85rem;margin-top:4px;">Materials science quarterly</p></div>
<span style="color:#22d3ee;font-family:monospace;font-size:0.8rem;">v4.2.0</span>
</div>
<div style="margin-top:32px;padding:24px;background:#0d1117;border:1px solid #1f2937;border-radius:8px;">
<p style="color:#22d3ee;font-size:0.75rem;text-transform:uppercase;letter-spacing:2px;margin:0 0 8px;">Discovery</p>
<h2 style="font-size:1.8rem;color:#f0f6fc;margin:0 0 12px;">Room-Temperature Superconductivity in Layered Composites</h2>
<p style="color:#8b949e;line-height:1.8;">A new class of 2D layered materials demonstrates zero-resistance conduction at 293K, potentially unlocking lossless power transmission at scale.</p>
</div>
</div></div>`,
  },
  {
    id: "mint-fresh",
    name: "Mint Fresh",
    description: "Bright airy light template with mint highlights and rounded cards.",
    preview_bg: "#f0fdf9",
    content_html: `<div data-rich-wrapper="true" style="background:#f0fdf9;padding:2rem;"><div style="max-width:840px;margin:0 auto;font-family:'Nunito',system-ui,sans-serif;color:#134e4a;">
<div style="text-align:center;padding:40px 0;">
<span style="display:inline-block;padding:6px 14px;background:#14b8a6;color:#fff;border-radius:999px;font-size:0.7rem;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Wellness · 2026</span>
<h1 style="font-size:2.6rem;font-weight:800;margin:16px 0 8px;color:#0f766e;">Rethinking Preventive Care</h1>
<p style="color:#0d9488;font-size:1.05rem;">Data-driven strategies for a healthier population.</p>
</div>
<div style="background:#fff;border-radius:20px;padding:32px;box-shadow:0 4px 20px rgba(20,184,166,0.08);">
<p style="line-height:1.9;color:#334155;font-size:1.05rem;">Long-term public health outcomes hinge on the small, cumulative choices patients make between clinical visits. New wearable-driven monitoring platforms make it possible to nudge those choices with unprecedented precision.</p>
</div>
</div></div>`,
  },
  {
    id: "vantablack",
    name: "Vantablack",
    description: "Ultra-dark black canvas with a single hot accent color for maximum focus.",
    preview_bg: "#000000",
    content_html: `<div data-rich-wrapper="true" style="background:#000;padding:3rem 2rem;"><div style="max-width:720px;margin:0 auto;font-family:'Helvetica Neue',sans-serif;color:#fff;">
<p style="color:#ff4d00;font-size:0.75rem;letter-spacing:6px;text-transform:uppercase;margin:0 0 16px;">Case Study</p>
<h1 style="font-size:3.2rem;font-weight:900;line-height:1;letter-spacing:-2px;margin:0 0 24px;">Absolute<br/><span style="color:#ff4d00;">Focus.</span></h1>
<div style="width:60px;height:4px;background:#ff4d00;margin:24px 0;"></div>
<p style="font-size:1.15rem;line-height:1.9;color:#a3a3a3;">Stripped down to the essentials. Every pixel earns its place. Every sentence carries weight. This is what research looks like when nothing distracts from the signal.</p>
</div></div>`,
  },
  {
    id: "paper-craft",
    name: "Paper Craft",
    description: "Soft cream light template mimicking printed paper with subtle shadow.",
    preview_bg: "#f5efe4",
    content_html: `<div data-rich-wrapper="true" style="background:#f5efe4;padding:3rem 1rem;"><div style="max-width:760px;margin:0 auto;background:#fdfaf3;padding:60px 50px;box-shadow:0 20px 60px rgba(139,110,50,0.15);font-family:'Merriweather',Georgia,serif;color:#3d2f1f;">
<p style="text-transform:uppercase;letter-spacing:4px;font-size:0.7rem;color:#a08a5a;margin:0 0 12px;">Chapter One</p>
<h1 style="font-size:2.6rem;font-weight:700;margin:0 0 8px;color:#2a1f10;">A Brief History of Discovery</h1>
<p style="color:#8b7355;font-style:italic;margin:0 0 32px;">— an illustrated study</p>
<p style="line-height:2;color:#4a3b26;font-size:1.05rem;text-align:justify;">The pursuit of knowledge is as old as civilization itself. From the ancient astronomers charting the heavens to the modern cartographer of the genome, each generation inherits the questions of the last and adds a few of its own.</p>
</div></div>`,
  },
  {
    id: "electric-lime",
    name: "Electric Lime",
    description: "Dark background with vibrant lime green accents — sharp modern startup vibe.",
    preview_bg: "#111827",
    content_html: `<div data-rich-wrapper="true" style="background:#111827;padding:2rem;"><div style="max-width:880px;margin:0 auto;font-family:'Space Grotesk','Inter',sans-serif;color:#e5e7eb;">
<div style="display:inline-block;padding:4px 12px;background:#84cc16;color:#0a0f00;border-radius:4px;font-weight:800;font-size:0.7rem;letter-spacing:2px;text-transform:uppercase;">New · Q2 2026</div>
<h1 style="font-size:3.4rem;font-weight:800;margin:20px 0 12px;line-height:1;letter-spacing:-2px;color:#fff;">Ship faster.<br/><span style="color:#84cc16;">Research smarter.</span></h1>
<p style="font-size:1.15rem;line-height:1.8;color:#9ca3af;max-width:640px;">Our next-generation research platform compresses the discovery cycle from months to days — without sacrificing rigor.</p>
<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:40px;">
<div style="background:#1f2937;padding:20px;border-radius:12px;border-top:2px solid #84cc16;"><p style="color:#84cc16;font-size:2rem;font-weight:800;margin:0;">10x</p><p style="color:#9ca3af;font-size:0.85rem;margin:4px 0 0;">Faster iteration</p></div>
<div style="background:#1f2937;padding:20px;border-radius:12px;border-top:2px solid #84cc16;"><p style="color:#84cc16;font-size:2rem;font-weight:800;margin:0;">99%</p><p style="color:#9ca3af;font-size:0.85rem;margin:4px 0 0;">Reproducibility</p></div>
<div style="background:#1f2937;padding:20px;border-radius:12px;border-top:2px solid #84cc16;"><p style="color:#84cc16;font-size:2rem;font-weight:800;margin:0;">2k+</p><p style="color:#9ca3af;font-size:0.85rem;margin:4px 0 0;">Labs onboarded</p></div>
</div>
</div></div>`,
  },
  {
    id: "arctic-blue",
    name: "Arctic Blue",
    description: "Cool, crisp light layout with icy blues — clinical yet friendly.",
    preview_bg: "#eff6ff",
    content_html: `<div data-rich-wrapper="true" style="background:#eff6ff;padding:2rem;"><div style="max-width:860px;margin:0 auto;font-family:'Inter',system-ui,sans-serif;color:#0c4a6e;">
<div style="background:#fff;border-radius:24px;padding:48px;box-shadow:0 20px 40px rgba(14,165,233,0.08);">
<p style="color:#0284c7;text-transform:uppercase;letter-spacing:3px;font-size:0.75rem;font-weight:700;margin:0 0 12px;">Clinical Bulletin</p>
<h1 style="font-size:2.6rem;font-weight:800;margin:0 0 12px;color:#082f49;letter-spacing:-1px;">Emerging Therapies for Chronic Inflammation</h1>
<p style="color:#0369a1;font-size:1rem;margin:0 0 24px;">A synthesis of 47 trials · March 2026</p>
<div style="height:1px;background:#e0f2fe;margin:24px 0;"></div>
<p style="line-height:1.9;color:#1e3a5f;font-size:1.05rem;">Recent advances in immunomodulatory therapy have shifted the treatment landscape for chronic inflammatory conditions. This bulletin summarizes efficacy data across the leading investigational agents.</p>
</div>
</div></div>`,
  },
  {
    id: "brutalist-bw",
    name: "Brutalist BW",
    description: "Stark black-on-white brutalist layout with heavy borders and no ornament.",
    preview_bg: "#ffffff",
    content_html: `<div data-rich-wrapper="true" style="background:#fff;padding:2rem;"><div style="max-width:900px;margin:0 auto;font-family:'Helvetica','Arial Black',sans-serif;color:#000;">
<div style="border:4px solid #000;padding:32px;">
<p style="font-weight:900;text-transform:uppercase;letter-spacing:4px;font-size:0.75rem;margin:0 0 8px;">// MANIFESTO No.001</p>
<h1 style="font-size:4rem;font-weight:900;line-height:0.95;margin:12px 0;letter-spacing:-3px;text-transform:uppercase;">Design<br/>Should<br/>Do Work.</h1>
<div style="height:4px;background:#000;margin:24px 0;"></div>
<p style="font-size:1.1rem;line-height:1.7;font-weight:500;">No gradients. No shadows. No apologies. Just information, arranged with intent. When ornament disappears, meaning has nowhere to hide.</p>
<div style="margin-top:24px;padding:16px;background:#000;color:#fff;font-weight:900;text-transform:uppercase;letter-spacing:3px;font-size:0.85rem;">→ Read the full essay</div>
</div>
</div></div>`,
  },
];
