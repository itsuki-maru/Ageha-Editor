import type { DocumentMode } from "@/interface";

// 文書先頭の YAML frontmatter を解析し、
// 通常 Markdown として描画するか Marp スライドとして描画するかを判定する。
//
// 判定ロジックは「文書内容だけを真実の源とする」設計方針に基づいており、
// ユーザーが手動でモードを切り替える UI は設けていない。

/** frontmatter ブロックを抽出する正規表現。
 *  `---\n ... \n---` の形式を CRLF/LF 両対応で拾う。 */
const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

/** `marp: true` の "true" 相当として認める値のパターン。
 *  大文字小文字を区別せず `true` / `yes` / `on` を受け付ける。 */
const BOOLEAN_TRUE_RE = /^(?:true|yes|on)$/i;

/**
 * Markdown テキストを受け取り、文書モードを判定して返す。
 * frontmatter に `marp: true` が含まれていれば "slides"、それ以外は "markdown"。
 * @param markdown - エディタの現在の本文テキスト全体
 * @returns 判定した DocumentMode
 */
export function detectDocumentMode(markdown: string): DocumentMode {
  const frontmatter = getFrontmatter(markdown);
  if (!frontmatter) {
    // frontmatter ブロック自体が存在しなければ通常 Markdown とみなす。
    return "markdown";
  }

  const marpValue = getFrontmatterField(frontmatter, "marp");
  // 現在の仕様では `marp: true` だけをスライドモードの起点にする。
  return marpValue && BOOLEAN_TRUE_RE.test(marpValue.trim()) ? "slides" : "markdown";
}

/**
 * Markdown テキストの frontmatter を Marp レンダリング用に補完して返す。
 * `theme` / `size` / `math` が未指定の場合、Ageha の固定仕様値を自動で補完する。
 * これにより、ユーザーは frontmatter に `marp: true` だけ書けば動く。
 * @param markdown - スライドモードの Markdown テキスト
 * @returns theme / size / math が補完された Markdown テキスト
 */
export function normalizeSlideMarkdown(markdown: string): string {
  const match = markdown.match(FRONTMATTER_RE);
  if (!match) {
    // frontmatter がない場合は変換不要（通常このケースは detectDocumentMode が先に弾く）。
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

  // 元の frontmatter ブロックを補完後のものに差し替えて返す。
  return markdown.replace(FRONTMATTER_RE, `---\n${updated}\n---\n`);
}

/**
 * Markdown テキストの frontmatter ブロック内容を抽出して返す。
 * @returns frontmatter 内容文字列。frontmatter がない場合は null。
 */
function getFrontmatter(markdown: string): string | null {
  const match = markdown.match(FRONTMATTER_RE);
  return match?.[1] ?? null;
}

/**
 * frontmatter 文字列から指定キーの値を取り出す。
 * `key: value` 形式の 1 行のみ対応（YAML ネストは扱わない）。
 * @param frontmatter - YAML frontmatter の本文部分
 * @param key - 取得したいキー名
 * @returns 見つかった値文字列。存在しない場合は null。
 */
function getFrontmatterField(frontmatter: string, key: string): string | null {
  const fieldRe = new RegExp(`^${escapeRegExp(key)}\\s*:\\s*(.+)$`, "m");
  const match = frontmatter.match(fieldRe);
  return match?.[1] ?? null;
}

/**
 * frontmatter 内の指定キーの値を差し替える。キーが存在しない場合は末尾へ追記する。
 * @param frontmatter - YAML frontmatter の本文部分
 * @param key   - 対象キー名
 * @param value - セットする値
 * @returns 更新後の frontmatter 文字列
 */
function upsertYamlScalar(frontmatter: string, key: string, value: string): string {
  const fieldRe = new RegExp(`^${escapeRegExp(key)}\\s*:\\s*.*$`, "m");
  if (fieldRe.test(frontmatter)) {
    // キーが既にある場合は値だけを差し替えて既存の記述を尊重する。
    return frontmatter.replace(fieldRe, `${key}: ${value}`);
  }

  // キーが存在しない場合は末尾へ改行付きで追記する。
  const trimmed = frontmatter.trimEnd();
  return trimmed ? `${trimmed}\n${key}: ${value}` : `${key}: ${value}`;
}

/** 文字列を正規表現のリテラルとして扱えるようにメタ文字をエスケープする。 */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
