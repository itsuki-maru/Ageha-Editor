import markdownBase from "@/github.css?raw";

export const STYLE_PACK_IDS = ["standard", "simple", "dark", "paper"] as const;
export type StylePackId = (typeof STYLE_PACK_IDS)[number];

export function normalizeStylePack(value: unknown): StylePackId {
  return STYLE_PACK_IDS.includes(value as StylePackId) ? (value as StylePackId) : "standard";
}

interface Palette {
  background: string;
  ink: string;
  muted: string;
  accent: string;
  surface: string;
  border: string;
  font: string;
}

const sans = '"Segoe UI", "Yu Gothic UI", sans-serif';
const palettes: Record<Exclude<StylePackId, "standard">, Palette> = {
  simple: {
    background: "#ffffff",
    ink: "#253044",
    muted: "#596579",
    accent: "#176b60",
    surface: "#f1f5f4",
    border: "#d4dfdc",
    font: sans,
  },
  dark: {
    background: "#17202e",
    ink: "#e3eaf4",
    muted: "#b0bfd2",
    accent: "#7dd3c7",
    surface: "#253247",
    border: "#44546c",
    font: sans,
  },
  paper: {
    background: "#faf5e9",
    ink: "#443a30",
    muted: "#756556",
    accent: "#97542f",
    surface: "#efe5d3",
    border: "#d5c6ad",
    font: 'Georgia, "Yu Mincho", serif',
  },
};

function markdownCss(p: Palette, root: string): string {
  // An explicit root keeps pack styles out of the editor and toolbar.
  const s = (selectors: string) =>
    selectors
      .split(",")
      .map((x) => `${root} ${x.trim()}`)
      .join(", ");
  return `
${root} { background: ${p.background}; color: ${p.ink}; font-family: ${p.font}; font-size: 16px; line-height: 1.8; color-scheme: ${p === palettes.dark ? "dark" : "light"}; }
${s(".markdown-body")} { padding: 16px 0; }
${s("h1, h2, h3, h4, h5, h6, strong")} { color: ${p.ink}; font-family: ${p.font}; }
${s("h1, h2")} { border-bottom: 1px solid ${p.border}; padding-bottom: .3em; }
${s("h1")} { font-size: 2em; }
${s("h2")} { font-size: 1.5em; background: transparent; border-left: 0; border-radius: 0; padding-left: 0; }
${s("a")} { color: ${p.accent}; }
${s("blockquote")} { color: ${p.muted}; background: ${p.surface}; border-left: 4px solid ${p.accent}; padding: 12px 20px; }
${s("table")} { border-collapse: collapse; max-width: 100%; }
${s("table tr, table tr:nth-child(2n)")} { background: ${p.background}; color: ${p.ink}; border-color: ${p.border}; }
${s("table th, table td")} { border: 1px solid ${p.border}; padding: 8px 12px; }
${s("table th, table tr:nth-child(2n) td")} { background: ${p.surface}; }
${s("code, tt")} { color: ${p.ink}; background: ${p.surface}; border-color: ${p.border}; }
${s("pre, .code-container, .code-container pre")} { background: #101b2a; color: #e3eaf4; border-radius: 6px; padding: 16px; overflow-x: auto; }
${s(".code-container")} { padding: 0; }
${s("pre code")} { background: transparent; color: inherit; border: 0; }
${s("hr")} { background: ${p.border}; border: 0; height: 1px; }
${s("img, video")} { max-width: 100%; }
${s(".mermaid")} { background: #ffffff; color: #253044; border-radius: 6px; padding: 12px; }
${s(".ageha-toc, .ageha-toc-toggle")} { background: ${p.surface}; color: ${p.ink}; border-color: ${p.border}; }
${s(".ageha-toc a, .ageha-toc::before")} { color: ${p.ink}; border-color: ${p.border}; }
${s(".ageha-toc a:hover, .ageha-toc a.active")} { background: ${p.background}; color: ${p.accent}; }
${s(".note, .warning")} { color: #253044; }
@media print { ${root} { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
`;
}

function slideCss(p: Palette): string {
  return `
section, section.lead {
  --p: ${p.accent}; --p2: ${p.accent}; --ink: ${p.ink}; --ink2: ${p.muted};
  --surf: ${p.surface}; --bdr: ${p.border}; --shd: none;
  background: ${p.background}; color: ${p.ink}; font-family: ${p.font};
}
section h1, section h2, section h3, section h4, section h5, section h6,
section p, section li, section strong, section tbody td,
section.lead h1, section.lead h1 + h2, section.lead h1 + p,
section.lead p, section.lead li, section.lead strong { color: ${p.ink}; }
section blockquote, section header, section footer, section.lead::after { color: ${p.muted}; }
section a, section.lead a { color: ${p.accent}; }
section thead th { background: ${p.accent}; color: ${p === palettes.dark ? "#17202e" : "#ffffff"}; }
section tbody tr:nth-child(even) td { background: ${p.surface}; }
section code { color: ${p.ink}; background: ${p.surface}; border-color: ${p.border}; }
section pre code { color: #e3eaf4; background: transparent; border: 0; }
section .mermaid-slide { background: #ffffff; }
section::before { width: 4px; opacity: 1; }
section blockquote, section table, section pre { border-radius: 6px; }
`;
}

export function resolveStylePack(id: unknown, userMarkdown: string, userSlides: string) {
  const pack = normalizeStylePack(id);
  if (pack === "standard") {
    return { previewCss: userMarkdown, markdownCss: userMarkdown, slideCss: userSlides };
  }
  const palette = palettes[pack];
  return {
    previewCss: markdownCss(palette, "#result.preview-area"),
    // Match the preview's ID specificity so .head2 and viewer decorations
    // cannot override the selected pack in standalone HTML or print output.
    markdownCss: markdownBase + markdownCss(palette, "body#ageha-document"),
    slideCss: slideCss(palette),
  };
}
