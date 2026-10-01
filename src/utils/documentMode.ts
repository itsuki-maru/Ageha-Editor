import type { DocumentMode } from "@/interface";

// 描画モードは UI 設定ではなく文書の frontmatter から判定する。
const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

const BOOLEAN_TRUE_RE = /^(?:true|yes|on)$/i;

/** Markdown 描画用にのみ、marp 設定を含む先頭の frontmatter を除外する。 */
export function stripMarpFrontmatter(markdown: string): string {
  const match = markdown.match(FRONTMATTER_RE);
  if (!match || !/^marp[ \t]*:/m.test(match[1])) return markdown;
  return markdown.slice(match[0].length);
}

/** 本文や他の設定を保持して、保存可能な文書モードへ切り替える。 */
export function setDocumentMode(markdown: string, mode: DocumentMode): string {
  const value = mode === "slides" ? "true" : "false";
  const newline = markdown.includes("\r\n") ? "\r\n" : "\n";
  // 空の frontmatter も扱う。本文中の区切りは変更しない。
  const match = /^(---\r?\n)([\s\S]*?)(^---(?:\r?\n|$))/m.exec(markdown);
  if (!match || match.index !== 0) {
    return mode === "markdown"
      ? markdown
      : `---${newline}marp: true${newline}---${newline}${markdown}`;
  }
  const metadata = match[2];
  const field = /^marp[ \t]*:[ \t]*[^\r\n]*/gm;
  const updated = /^marp[ \t]*:/m.test(metadata)
    ? metadata.replace(field, (line) => {
        const comment = /[ \t]+#.*$/.exec(line)?.[0] ?? "";
        return `marp: ${value}${comment}`;
      })
    : `${metadata}marp: ${value}${newline}`;
  return match[1] + updated + match[3] + markdown.slice(match[0].length);
}

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
  return match?.[1]?.replace(/[ \t]+#.*$/, "").trim() ?? null;
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
