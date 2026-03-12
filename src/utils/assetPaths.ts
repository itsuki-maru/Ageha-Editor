import { convertFileSrc, invoke } from "@tauri-apps/api/core";

// 画像などのローカルアセットパスを解決し、
// 必要に応じて data URL へ埋め込める形へ変換するユーティリティ群。
const URL_SCHEME_RE = /^(?:[a-z][a-z\d+\-.]*:)?\/\//i;
const WINDOWS_ABS_PATH_RE = /^[a-zA-Z]:[\\/]/;
const MARKDOWN_IMAGE_RE = /!\[([^\]]*)\]\(([^)\n]+)\)/g;
const HTML_IMAGE_SRC_RE = /(<img\b[^>]*?\ssrc=["'])([^"']+)(["'][^>]*>)/gi;
// プレビュー更新のたびに同じ画像を読み直すと重くなるため、
// 一度 data URL 化した結果は Promise ごとキャッシュして再利用する。
const embeddedAssetUrlCache = new Map<string, Promise<string>>();

export function isExternalAssetPath(path: string): boolean {
  return (
    URL_SCHEME_RE.test(path) ||
    path.startsWith("data:") ||
    path.startsWith("blob:") ||
    path.startsWith("#")
  );
}

export function getParentPath(filePath: string): string {
  const normalized = filePath.replace(/\*/g, "");
  let lastSlashIndex = normalized.lastIndexOf("/");

  if (lastSlashIndex === -1) {
    lastSlashIndex = normalized.lastIndexOf("\\");
    if (lastSlashIndex === -1) return "";
  }

  return normalized.substring(0, lastSlashIndex);
}

export function resolveAssetPath(rawPath: string, activeFilePath: string): string {
  if (!rawPath || isExternalAssetPath(rawPath)) {
    return rawPath;
  }

  if (isAbsoluteFilePath(rawPath)) {
    // すでに絶対パスなら追加解決は不要。
    return rawPath;
  }

  const baseDir = getParentPath(activeFilePath);
  if (!baseDir) {
    // 基準ファイルが無いと相対解決できないので元の値を返す。
    return rawPath;
  }

  try {
    // 開いている Markdown ファイルの親ディレクトリを基準に相対パスを解決する。
    const baseUrl = toFileUrl(
      baseDir.endsWith("/") || baseDir.endsWith("\\") ? baseDir : `${baseDir}/`,
    );
    const resolvedUrl = new URL(rawPath.replace(/\\/g, "/"), baseUrl);
    return fromFileUrl(resolvedUrl);
  } catch {
    return rawPath;
  }
}

export function toPreviewAssetUrl(rawPath: string, activeFilePath: string): string {
  if (!rawPath || isExternalAssetPath(rawPath)) {
    return rawPath;
  }

  const resolvedPath = resolveAssetPath(rawPath, activeFilePath);
  if (!isAbsoluteFilePath(resolvedPath)) {
    return rawPath;
  }

  return convertFileSrc(resolvedPath);
}

export async function toEmbeddedAssetUrl(rawPath: string, activeFilePath: string): Promise<string> {
  if (!rawPath || isExternalAssetPath(rawPath)) {
    return rawPath;
  }

  const resolvedPath = resolveAssetPath(rawPath, activeFilePath);
  if (!isAbsoluteFilePath(resolvedPath)) {
    return rawPath;
  }

  let pending = embeddedAssetUrlCache.get(resolvedPath);
  if (!pending) {
    // 初回だけ Rust 側でバイナリを読み、data URL へ変換する。
    pending = invoke<string>("read_binary_file_data_url", {
      targetFile: resolvedPath,
    }).catch((error) => {
      console.error("Failed to embed local asset:", error);
      embeddedAssetUrlCache.delete(resolvedPath);
      // 変換に失敗しても、通常の file URL へ戻して表示継続を試みる。
      return convertFileSrc(resolvedPath);
    });
    embeddedAssetUrlCache.set(resolvedPath, pending);
  }

  return pending;
}

export async function embedLocalImageSources(
  markdown: string,
  activeFilePath: string,
): Promise<string> {
  // Ageha では Markdown 記法の画像だけでなく、
  // 生の HTML で書かれた <img> もプレビュー対象になるため両方を処理する。
  let nextMarkdown = await replaceAsync(
    markdown,
    MARKDOWN_IMAGE_RE,
    async (_match, altText: string, rawTarget: string) => {
      const { destination, suffix } = splitDestinationAndSuffix(rawTarget.trim());
      if (!destination || isExternalAssetPath(destination)) {
        return `![${altText}](${rawTarget})`;
      }

      const resolved = await toEmbeddedAssetUrl(destination, activeFilePath);
      return `![${altText}](${resolved}${suffix})`;
    },
  );

  nextMarkdown = await replaceAsync(
    nextMarkdown,
    HTML_IMAGE_SRC_RE,
    async (_match, prefix: string, src: string, suffix: string) => {
      if (!src || isExternalAssetPath(src)) {
        return `${prefix}${src}${suffix}`;
      }

      const resolved = await toEmbeddedAssetUrl(src, activeFilePath);
      return `${prefix}${resolved}${suffix}`;
    },
  );

  return nextMarkdown;
}

function isAbsoluteFilePath(path: string): boolean {
  return WINDOWS_ABS_PATH_RE.test(path) || path.startsWith("/");
}

function splitDestinationAndSuffix(value: string): { destination: string; suffix: string } {
  const sizeSuffixMatch = value.match(/^(.*?)(\s+=\d+x?)$/);
  if (sizeSuffixMatch) {
    // Marp 互換のサイズ指定は URL 本体と分けて保持する。
    return {
      destination: sizeSuffixMatch[1].trim(),
      suffix: sizeSuffixMatch[2],
    };
  }

  return {
    destination: value,
    suffix: "",
  };
}

function toFileUrl(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  if (WINDOWS_ABS_PATH_RE.test(path)) {
    return `file:///${normalized}`;
  }

  return `file://${normalized.startsWith("/") ? normalized : `/${normalized}`}`;
}

function fromFileUrl(fileUrl: URL): string {
  const pathname = decodeURIComponent(fileUrl.pathname);
  return pathname.replace(/^\/([a-zA-Z]:)/, "$1");
}

async function replaceAsync(
  input: string,
  pattern: RegExp,
  replacer: (...args: string[]) => Promise<string>,
): Promise<string> {
  const matches = Array.from(input.matchAll(new RegExp(pattern.source, pattern.flags)));
  if (matches.length === 0) {
    return input;
  }

  // 非同期置換でも元の出現順を保てるよう、先に結果を全部集めてから組み立て直す。
  const replacements = await Promise.all(matches.map((match) => replacer(...match)));
  let cursor = 0;

  return (
    matches.reduce((result, match, index) => {
      const matchIndex = match.index ?? 0;
      const matchText = match[0];
      const replacement = replacements[index];
      const chunk = input.slice(cursor, matchIndex);
      cursor = matchIndex + matchText.length;
      return result + chunk + replacement;
    }, "") + input.slice(cursor)
  );
}
