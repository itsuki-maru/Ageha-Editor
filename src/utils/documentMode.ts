import type { DocumentMode } from "@/interface";

// 文書先頭の frontmatter を見て、
// 通常の Markdown 文書として扱うかスライド文書として扱うかを判定する。
const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;
const BOOLEAN_TRUE_RE = /^(?:true|yes|on)$/i;

export function detectDocumentMode(markdown: string): DocumentMode {
  const frontmatter = getFrontmatter(markdown);
  if (!frontmatter) {
    // frontmatter が無ければ通常 Markdown のままとする。
    return "markdown";
  }

  const marpValue = getFrontmatterField(frontmatter, "marp");
  // 現在の仕様では `marp: true` だけをスライドモードの起点にする。
  return marpValue && BOOLEAN_TRUE_RE.test(marpValue.trim()) ? "slides" : "markdown";
}

export function normalizeSlideMarkdown(markdown: string): string {
  const match = markdown.match(FRONTMATTER_RE);
  if (!match) {
    return markdown;
  }

  // v1 ではテーマ・サイズ・数式ライブラリを固定仕様としているため、
  // frontmatter に未記載でもここで補完して Marp へ渡す。
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

function getFrontmatterField(frontmatter: string, key: string): string | null {
  // 単純な `key: value` 形式の 1 行を拾う。
  const fieldRe = new RegExp(`^${escapeRegExp(key)}\\s*:\\s*(.+)$`, "m");
  const match = frontmatter.match(fieldRe);
  return match?.[1] ?? null;
}

function upsertYamlScalar(frontmatter: string, key: string, value: string): string {
  const fieldRe = new RegExp(`^${escapeRegExp(key)}\\s*:\\s*.*$`, "m");
  if (fieldRe.test(frontmatter)) {
    // 既存キーがある場合は値だけを差し替える。
    return frontmatter.replace(fieldRe, `${key}: ${value}`);
  }

  // 無ければ末尾へ追記する。
  const trimmed = frontmatter.trimEnd();
  return trimmed ? `${trimmed}\n${key}: ${value}` : `${key}: ${value}`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
