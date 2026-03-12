// Ageha Editor が標準で提供するスライドテーマ定義。
// 文書側で独自テーマを持たない場合でも、最低限整った見た目になるようにしている。
export const AGEHA_SLIDE_THEME = String.raw`/*
 * @theme ageha-slide
 * @auto-scaling true
 */

section {
  /* ── Design tokens ──────────────────────────────────────────────────────── *
   * CSS カスタムプロパティで上書きすることで手軽にカラーを変更できます。    *
   * 例: ageha-slide.css に  section { --p: #e11d48; --p2: #f59e0b; }        *
   * ──────────────────────────────────────────────────────────────────────── */
  --p:   #4361ee;                                  /* primary accent */
  --p2:  #06b6d4;                                  /* secondary accent */
  --pg:  linear-gradient(90deg, var(--p), var(--p2));
  --ink: #0f172a;                                  /* body text */
  --ink2: rgba(15, 23, 42, 0.56);                  /* muted text */
  --surf: rgba(255, 255, 255, 0.88);               /* card surface */
  --bdr: rgba(67, 97, 238, 0.12);                  /* border */
  --shd: 0 16px 40px rgba(15, 23, 42, 0.1);        /* shadow */

  width: 1280px;
  height: 720px;
  padding: 64px 80px 56px;
  box-sizing: border-box;
  overflow: hidden;
  position: relative;
  font-family: "Aptos", "Segoe UI", "Hiragino Sans", "Yu Gothic UI", sans-serif;
  font-size: 29px;
  line-height: 1.55;
  color: var(--ink);
  background: linear-gradient(150deg, #f7f9ff 0%, #f0f4ff 55%, #eaefff 100%);
}

/* Left accent bar */
section::before {
  content: "";
  position: absolute;
  left: 0;
  top: 48px;
  bottom: 48px;
  width: 4px;
  border-radius: 0 4px 4px 0;
  background: var(--pg);
  opacity: 0.65;
  pointer-events: none;
}

/* Page number */
section::after {
  content: attr(data-marpit-pagination);
  position: absolute;
  right: 44px;
  bottom: 26px;
  padding: 0;
  font-size: 0.46em;
  font-weight: 700;
  color: var(--ink2);
}

h1,
h2,
h3,
h4,
h5,
h6,
p,
ul,
ol,
blockquote,
pre,
table,
figure {
  position: relative;
  z-index: 1;
}

h1 {
  margin: 0 0 20px;
  max-width: 12em;
  font-size: 2.2em;
  line-height: 1.05;
  font-weight: 800;
  letter-spacing: -0.04em;
  color: #1e1b4b;
  text-wrap: balance;
}

h2 {
  margin: 0 0 16px;
  font-size: 1.3em;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #0369a1;
}

h3,
h4,
h5,
h6 {
  color: #334155;
}

h1 + h2,
h1 + p,
h1 + ul,
h1 + ol {
  position: relative;
  margin-top: 16px;
}

h1 + h2::before,
h1 + p::before,
h1 + ul::before,
h1 + ol::before {
  content: "";
  display: block;
  width: 100px;
  height: 5px;
  margin-bottom: 18px;
  border-radius: 999px;
  background: var(--pg);
}

p,
li {
  font-size: 0.93em;
  color: rgba(15, 23, 42, 0.88);
}

strong {
  color: #1e1b4b;
  font-weight: 800;
}

a {
  color: var(--p);
  text-decoration-color: rgba(67, 97, 238, 0.32);
}

blockquote {
  margin: 20px 0;
  padding: 16px 20px;
  color: #334155;
  background: var(--surf);
  border: 1px solid var(--bdr);
  border-left: 5px solid var(--p);
  border-radius: 0 14px 14px 0;
  box-shadow: var(--shd);
}

ul,
ol {
  padding-left: 1.2em;
}

li::marker {
  color: var(--p);
}

table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  background: var(--surf);
  border: 1px solid var(--bdr);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: var(--shd);
}

thead th {
  padding: 14px 16px;
  color: #fff;
  background: linear-gradient(90deg, #2b2d8f, #0c6ea8);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

tbody td {
  padding: 12px 16px;
  color: rgba(15, 23, 42, 0.9);
  border-top: 1px solid var(--bdr);
}

tbody tr:nth-child(even) td {
  background: rgba(67, 97, 238, 0.04);
}

code {
  padding: 0.14em 0.44em;
  font-family: "Cascadia Code", "Consolas", monospace;
  font-size: 0.8em;
  color: #2563eb;
  background: rgba(67, 97, 238, 0.08);
  border: 1px solid rgba(67, 97, 238, 0.14);
  border-radius: 8px;
}

pre {
  padding: 20px 24px;
  color: #e2e8f0;
  background: #0f172a;
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 16px;
  box-shadow: var(--shd);
}

pre code {
  padding: 0;
  color: inherit;
  background: transparent;
  border: 0;
}

img,
svg,
video {
  display: block;
  max-width: 100%;
  max-height: 460px;
  margin: 0 auto;
  object-fit: contain;
  border-radius: 16px;
}

img,
video {
  box-shadow: var(--shd);
  border: 1px solid var(--bdr);
  background: rgba(255, 255, 255, 0.72);
}

hr {
  border: 0;
  height: 1px;
  margin: 28px 0;
  background: var(--pg);
  opacity: 0.3;
}

.katex-display {
  margin: 0.6em 0;
  overflow-x: auto;
  overflow-y: hidden;
}

.mermaid-slide {
  display: flex;
  justify-content: center;
  padding: 14px;
  background: var(--surf);
  border: 1px solid var(--bdr);
  border-radius: 16px;
  box-shadow: var(--shd);
}

.mermaid-slide svg {
  max-width: 100%;
  height: auto;
}

header,
footer {
  position: absolute;
  left: 80px;
  right: 80px;
  z-index: 1;
  font-size: 0.46em;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink2);
}

header {
  top: 24px;
}

footer {
  bottom: 24px;
}

/* ── Lead / title slide ─────────────────────────────────────────────────── */
section.lead {
  justify-content: center;
  background: linear-gradient(145deg, #1a1a3e 0%, #1e3564 52%, #0c2040 100%);
  color: #f0f4ff;
}

section.lead::before {
  top: 0;
  bottom: 0;
  width: 6px;
  opacity: 1;
}

section.lead h1 {
  width: 100%;
  max-width: 100%;
  font-size: 2.6em;
  color: #fff;
  text-align: center;
  align-self: center;
}

section.lead h1 + h2,
section.lead h1 + p {
  width: 100%;
  max-width: 100%;
  font-size: 0.96em;
  color: rgba(224, 231, 255, 0.72);
  text-align: center;
}

section.lead h1 + h2::before,
section.lead h1 + p::before,
section.lead h1 + ul::before,
section.lead h1 + ol::before {
  margin-left: auto;
  margin-right: auto;
}

section.lead p,
section.lead li {
  color: rgba(224, 231, 255, 0.82);
}

section.lead strong {
  color: #fff;
}

section.lead a {
  color: var(--p2);
}

section.lead::after {
  color: rgba(224, 231, 255, 0.36);
}
`;
