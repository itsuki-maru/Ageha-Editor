import type { DocumentMode } from "@/interface";

// 描画モードは UI 設定ではなく文書の frontmatter から判定する。
const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

const BOOLEAN_TRUE_RE = /^(?:true|yes|on)$/i;

/** frontmatter の marp が true / yes / on（大文字小文字不問）ならスライドとして扱う。 */
export function detectDocumentMode(markdown: string): DocumentMode {
  const frontmatter = getFrontmatter(markdown);
  if (!frontmatter) {
    return "markdown";
  }

  const marpValue = getFrontmatterField(frontmatter, "marp");
  return marpValue && BOOLEAN_TRUE_RE.test(marpValue.trim()) ? "slides" : "markdown";
}

/** theme / size / math は既存の指定も含めて Ageha の固定値に置き換える。 */
export function normalizeSlideMarkdown(markdown: string): string {
  const match = markdown.match(FRONTMATTER_RE);
  if (!match) {
    return markdown;
  }

  const metadata = match[1];
  const updated = upsertYamlScalar(
    upsertYamlScalar(upsertYamlScalar(metadata, "theme", "ageha-slide"), "size", "16:9"),
    "math",
    "katex",
  );

  return markdown.replace(FRONTMATTER_RE, `---\n${updated}\n---\n`);
}

function getFrontmatter(markdown: string): string | null {
  const match = markdown.match(FRONTMATTER_RE);
  return match?.[1] ?? null;
}

/** 単一行の key: value のみ対応し、YAML のネストは扱わない。 */
function getFrontmatterField(frontmatter: string, key: string): string | null {
  const fieldRe = new RegExp(`^${escapeRegExp(key)}\\s*:\\s*(.+)$`, "m");
  const match = frontmatter.match(fieldRe);
  return match?.[1] ?? null;
}

function upsertYamlScalar(frontmatter: string, key: string, value: string): string {
  const fieldRe = new RegExp(`^${escapeRegExp(key)}\\s*:\\s*.*$`, "m");
  if (fieldRe.test(frontmatter)) {
    return frontmatter.replace(fieldRe, `${key}: ${value}`);
  }

  const trimmed = frontmatter.trimEnd();
  return trimmed ? `${trimmed}\n${key}: ${value}` : `${key}: ${value}`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
