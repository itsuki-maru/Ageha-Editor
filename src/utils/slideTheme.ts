// Ageha Editor が標準で提供するスライドテーマ定義。
// 文書側で独自テーマを持たない場合でも、最低限整った見た目になるようにしている。
export const AGEHA_SLIDE_THEME = String.raw`/*
 * @theme ageha-slide
 * @auto-scaling true
 */

section {
  width: 1280px;
  height: 720px;
  padding: 68px 84px 64px;
  box-sizing: border-box;
  overflow: hidden;
  position: relative;
  font-family: "Aptos", "Segoe UI", "Hiragino Sans", "Yu Gothic UI", sans-serif;
  font-size: 30px;
  line-height: 1.5;
  color: #1a2a38;
  background:
    radial-gradient(circle at top right, rgba(82, 184, 169, 0.2), transparent 24%),
    radial-gradient(circle at 12% 10%, rgba(112, 156, 255, 0.16), transparent 20%),
    linear-gradient(160deg, #fcfdff 0%, #f3f7fb 54%, #e8eef5 100%);
}

section::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, rgba(28, 55, 84, 0.035) 0 1px, transparent 1px 100%),
    linear-gradient(rgba(28, 55, 84, 0.03) 0 1px, transparent 1px 100%);
  background-size: 96px 96px;
  mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.26), transparent 70%);
  pointer-events: none;
}

section::after {
  content: attr(data-marpit-pagination);
  position: absolute;
  right: 46px;
  bottom: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2.6em;
  padding: 0.18em 0.7em;
  font-size: 0.52em;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: rgba(16, 40, 60, 0.76);
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(104, 144, 182, 0.18);
  border-radius: 999px;
  backdrop-filter: blur(8px);
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
  margin: 0 0 24px;
  max-width: 11.5em;
  font-size: 2.26em;
  line-height: 1.02;
  font-weight: 800;
  letter-spacing: -0.045em;
  color: #17314a;
  text-wrap: balance;
}

h2 {
  margin: 0 0 18px;
  font-size: 1.34em;
  font-weight: 760;
  letter-spacing: -0.03em;
  color: #12696a;
}

h3,
h4,
h5,
h6 {
  color: #32506a;
}

h1 + h2,
h1 + p,
h1 + ul,
h1 + ol {
  position: relative;
  margin-top: 18px;
}

h1 + h2::before,
h1 + p::before,
h1 + ul::before,
h1 + ol::before {
  content: "";
  display: block;
  width: 120px;
  height: 6px;
  margin-bottom: 20px;
  border-radius: 999px;
  background: linear-gradient(90deg, #52b8a9, #709cff);
}

p,
li {
  font-size: 0.94em;
  color: rgba(26, 42, 56, 0.9);
}

strong {
  color: #0f5b63;
  font-weight: 760;
}

a {
  color: #195fbe;
  text-decoration-color: rgba(25, 95, 190, 0.35);
}

blockquote {
  margin: 24px 0;
  padding: 18px 22px;
  color: #30516a;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(245, 249, 253, 0.95));
  border: 1px solid rgba(104, 144, 182, 0.14);
  border-left: 6px solid rgba(82, 184, 169, 0.76);
  border-radius: 22px;
  box-shadow: 0 20px 48px rgba(28, 55, 84, 0.12);
}

ul,
ol {
  padding-left: 1.2em;
}

li::marker {
  color: #2ca58d;
}

table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(104, 144, 182, 0.14);
  border-radius: 22px;
  overflow: hidden;
  box-shadow: 0 26px 54px rgba(28, 55, 84, 0.12);
}

thead th {
  padding: 15px 18px;
  color: #f7fcff;
  background: linear-gradient(90deg, #0f6b78, #13817c 55%, #145a88);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

tbody td {
  padding: 13px 18px;
  color: rgba(26, 42, 56, 0.92);
  border-top: 1px solid rgba(109, 144, 179, 0.12);
}

tbody tr:nth-child(even) td {
  background: rgba(104, 144, 182, 0.05);
}

code {
  padding: 0.16em 0.46em;
  font-family: "Cascadia Code", "Consolas", monospace;
  font-size: 0.82em;
  color: #15405a;
  background: rgba(109, 144, 179, 0.12);
  border: 1px solid rgba(109, 144, 179, 0.12);
  border-radius: 10px;
}

pre {
  padding: 20px 24px;
  color: #f5f7fb;
  background:
    linear-gradient(180deg, rgba(18, 33, 49, 0.98), rgba(13, 25, 38, 0.98)),
    linear-gradient(90deg, rgba(82, 184, 169, 0.08), rgba(112, 156, 255, 0.08));
  border: 1px solid rgba(83, 110, 138, 0.16);
  border-radius: 22px;
  box-shadow: 0 28px 54px rgba(24, 44, 66, 0.2);
}

pre code {
  padding: 0;
  color: inherit;
  border: 0;
  background: transparent;
}

img,
svg,
video {
  display: block;
  max-width: 100%;
  max-height: 460px;
  margin: 0 auto;
  object-fit: contain;
  border-radius: 22px;
}

img,
video {
  box-shadow: 0 28px 58px rgba(28, 55, 84, 0.14);
  border: 1px solid rgba(104, 144, 182, 0.14);
  background: rgba(255, 255, 255, 0.72);
}

hr {
  border: 0;
  height: 1px;
  margin: 30px 0;
  background: linear-gradient(90deg, transparent, rgba(82, 184, 169, 0.82), transparent);
}

.katex-display {
  margin: 0.7em 0;
  overflow-x: auto;
  overflow-y: hidden;
}

.mermaid-slide {
  display: flex;
  justify-content: center;
  padding: 16px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(104, 144, 182, 0.14);
  border-radius: 22px;
  box-shadow: 0 22px 50px rgba(28, 55, 84, 0.1);
}

.mermaid-slide svg {
  max-width: 100%;
  height: auto;
  filter: drop-shadow(0 16px 30px rgba(28, 55, 84, 0.12));
}

header,
footer {
  position: absolute;
  left: 84px;
  right: 84px;
  z-index: 1;
  font-size: 0.5em;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(34, 61, 84, 0.46);
}

header {
  top: 28px;
}

footer {
  bottom: 28px;
}

section.lead {
  justify-content: center;
  background:
    radial-gradient(circle at 85% 14%, rgba(82, 184, 169, 0.22), transparent 20%),
    radial-gradient(circle at 16% 18%, rgba(112, 156, 255, 0.18), transparent 18%),
    linear-gradient(160deg, #fdfefe 0%, #eef4fb 52%, #e0ebf5 100%);
}

section.lead h1 {
  max-width: 9.5em;
  font-size: 2.5em;
}

section.lead h1 + p,
section.lead h1 + h2 {
  max-width: 18em;
  font-size: 1em;
  color: rgba(26, 42, 56, 0.72);
}
`;
