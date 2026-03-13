import rawKatex from "katex/dist/katex.min.css?raw";
import rawMermaid from "mermaid/dist/mermaid.min.js?raw";

// エクスポート用 HTML・別ウィンドウ表示用 HTML・スライド iframe 用 HTML を
// 共通の組み立て方で生成するテンプレートユーティリティ。
//
// スライドと通常 Markdown で HTML の構造が大きく異なるため、
// createHtml（Markdown 用）と createSlideHtmlDocument（スライド用）に分けている。

/** createSlideHtmlDocument / customizeSlideHtmlDocument に渡すオプション */
interface SlideHtmlOptions {
  /** HTML 文書の <title> に設定する文字列 */
  title?: string;
  /** ~/.ageha/ageha-slide.css の内容。Marp CSS の後段に適用する。 */
  userStyle?: string;
  /** 印刷時の @media print ルールなど、呼び出し側だけが知る追加 CSS */
  extraStyle?: string;
}

// Marp が生成するスライドの DOM 構造:
//   div.marpit > svg > foreignObject > section
// ユーザー CSS の `section { ... }` を効かせるには、このフルパスへ変換が必要。
const SLIDE_SCOPE_SELECTOR = "div.marpit > svg > foreignObject > section";

// iframe / 別ウィンドウ内のコードブロックに「コピー」ボタンを付けるための
// インライン JavaScript。createSlideHtmlDocument で埋め込んでいないが、
// createHtml（通常 Markdown）で使用している。
const COPY_BUTTON_SCRIPT = `
document.addEventListener("click", (e) => {
  const target = e.target;
  if (!(target instanceof HTMLElement) || !target.classList.contains("copy-btn")) return;

  const codeId = target.dataset.target;
  const codeElem = document.getElementById(codeId || "");
  if (!codeElem) return;

  navigator.clipboard.writeText(codeElem.textContent || "");
  const existingTooltip = target.parentElement?.querySelector(".copy-tooltip");
  if (existingTooltip) existingTooltip.remove();

  const tooltip = document.createElement("div");
  tooltip.textContent = "コピーしました";
  tooltip.className = "copy-tooltip";
  target.parentElement?.appendChild(tooltip);

  setTimeout(() => {
    tooltip.style.opacity = "0";
    setTimeout(() => tooltip.remove(), 300);
  }, 1000);
});
`;

/**
 * 通常 Markdown モードの HTML エクスポート・別ウィンドウ表示用の
 * スタンドアロン HTML 文書を生成して返す。
 * KaTeX CSS・Mermaid JS・コピーボタンスクリプトをインラインで埋め込む。
 * @param html  - Markdown を marked でレンダリングした HTML 断片
 * @param style - ageha.css の内容
 */
export function createHtml(html: string, style: string): string {
  return `<!DOCTYPE html>
    <html>
    <head>
    <meta charset="UTF-8" />
    <title>Ageha Editor</title>
    <style>${style}</style>
    <style>${rawKatex}</style>
    <script>${rawMermaid}</script>
    </head>
    <body>
    <div class="container-fluid">${html}</div>
    </body>
    <script>${COPY_BUTTON_SCRIPT}</script>
    </html>`;
}

/**
 * スライドモード用の完結した HTML 文書を生成して返す。
 * iframe の srcdoc・別ウィンドウ表示・HTML エクスポート・印刷すべてに使われる共通の基盤。
 *
 * スタイルの適用順:
 *   1. 基本レイアウト CSS（body マージン等のベースライン）
 *   2. Marp テーマ CSS（ageha-slide テーマ）
 *   3. スコープ済みユーザー CSS（ageha-slide.css を Marp DOM 構造へ変換したもの）
 *
 * @param html    - Marp が生成したスライド HTML 断片（section 要素の列）
 * @param style   - Marp が生成したテーマ CSS
 * @param options - タイトル・ユーザー CSS・追加 CSS のオプション
 */
export function createSlideHtmlDocument(
  html: string,
  style: string,
  options: SlideHtmlOptions = {},
): string {
  const title = options.title ?? "Ageha Editor Slides";
  const userStyle = options.userStyle ?? "";
  // ユーザー CSS を Marp の DOM 構造に合わせてスコープ変換する。
  // 変換結果はキャッシュされるため、同じ CSS を繰り返し渡してもコストは最小限。
  const scopedUserStyle = buildScopedSlideUserStyle(userStyle);
  const extraStyle = options.extraStyle ?? "";

  // スライドは iframe や別ウィンドウで独立して描画するため、
  // body まで含んだ完結した HTML 文書として生成する。
  return `<!DOCTYPE html>
    <html>
    <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <style>
      html, body {
        margin: 0;
        padding: 0;
        min-height: 100%;
        background: #f4f7fb;
        color-scheme: light;
      }

      body {
        overflow-y: auto;
        overflow-x: hidden;
      }

      div.marpit {
        margin: 0 auto;
      }

      ${extraStyle}
    </style>
    <style>${style}</style>
    <style>${scopedUserStyle}</style>
    </head>
    <body>${html}</body>
    </html>`;
}

/**
 * 既存のスライド HTML 文書の一部を後から差し替える。
 * タイトル変更・印刷用スタイル追加など、生成後の軽量な調整に使う。
 * @param documentHtml - createSlideHtmlDocument が生成した完全な HTML 文書
 * @param options      - 上書きしたい項目のみ指定する
 */
export function customizeSlideHtmlDocument(
  documentHtml: string,
  options: SlideHtmlOptions = {},
): string {
  let nextHtml = documentHtml;

  if (options.title) {
    const escapedTitle = escapeHtml(options.title);
    if (/<title>.*?<\/title>/i.test(nextHtml)) {
      // 既存 <title> がある場合だけ安全に差し替える。
      nextHtml = nextHtml.replace(/<title>.*?<\/title>/i, `<title>${escapedTitle}</title>`);
    }
  }

  if (options.extraStyle) {
    // 印刷時の追加 CSS など、呼び出し側だけが知っているルールを </head> 直前に差し込む。
    nextHtml = nextHtml.replace(
      /<\/head>/i,
      `    <style>${options.extraStyle}</style>\n    </head>`,
    );
  }

  return nextHtml;
}

/** HTML 特殊文字をエスケープする。<title> など HTML コンテキストへの挿入に使う。 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// -------- ユーザー CSS のスコープ変換キャッシュ --------

// ユーザー CSS のスコープ変換結果をキャッシュする Map。
// slideCustomCss はアプリ起動時に一度だけ読み込まれ、セッション中は変化しないため、
// 同じ入力に対して CSSStyleSheet のパースが繰り返し走るのを防ぐ。
// キー: 入力 CSS 文字列 / 値: スコープ変換済み CSS 文字列
const scopedStyleCache = new Map<string, string>();

/**
 * ユーザーが記述した CSS を Marp の DOM 構造に適合するよう変換して返す。
 *
 * 変換の必要性:
 *   Marp は各スライドを `div.marpit > svg > foreignObject > section` という
 *   SVG の入れ子構造で出力する。ユーザーが `section { color: red }` と書いても
 *   通常の CSS セレクタでは SVG 内の section に届かない。
 *   そのため、すべての section 系セレクタにフルパスのプレフィックスを付与する。
 *
 * キャッシュ:
 *   CSSStyleSheet の生成・パースは比較的コストがかかる処理のため、
 *   同じ CSS 文字列であれば前回の変換結果を返す。
 *
 * @param userStyle - ~/.ageha/ageha-slide.css の内容
 * @returns Marp DOM 構造に適合するスコープ済み CSS 文字列
 */
function buildScopedSlideUserStyle(userStyle: string): string {
  if (!userStyle.trim() || typeof CSSStyleSheet === "undefined") {
    return "";
  }

  // 同じ CSS が再度来たらキャッシュから返す。
  const cached = scopedStyleCache.get(userStyle);
  if (cached !== undefined) {
    return cached;
  }

  try {
    // CSSStyleSheet API でパースし、ルールごとにセレクタを変換する。
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(userStyle);
    const result = Array.from(sheet.cssRules)
      .map((rule) => scopeSlideCssRule(rule))
      .filter((ruleText) => ruleText.length > 0)
      .join("\n");
    scopedStyleCache.set(userStyle, result);
    return result;
  } catch (error) {
    console.warn("Failed to scope slide user CSS overrides.", error);
    return "";
  }
}

/**
 * 単一の CSS ルールを Marp DOM 構造向けに変換して文字列で返す。
 * @media / @supports の場合は再帰的に内部ルールも変換する。
 * 対応外のルール（@font-face など）は変換せずそのまま返す。
 */
function scopeSlideCssRule(rule: CSSRule): string {
  if (rule instanceof CSSStyleRule) {
    // 通常のスタイルルールはセレクタだけ組み替えて宣言ブロックをそのまま使う。
    return `${scopeSlideSelectorList(rule.selectorText)} { ${rule.style.cssText} }`;
  }

  if (rule instanceof CSSMediaRule) {
    // @media の中も同じルールで再帰的にスコープ変換する。
    const nested = Array.from(rule.cssRules)
      .map((childRule) => scopeSlideCssRule(childRule))
      .filter((ruleText) => ruleText.length > 0)
      .join("\n");
    return nested ? `@media ${rule.conditionText} {\n${nested}\n}` : "";
  }

  if (rule instanceof CSSSupportsRule) {
    // @supports も同様に入れ子ルールを再帰変換する。
    const nested = Array.from(rule.cssRules)
      .map((childRule) => scopeSlideCssRule(childRule))
      .filter((ruleText) => ruleText.length > 0)
      .join("\n");
    return nested ? `@supports ${rule.conditionText} {\n${nested}\n}` : "";
  }

  // @font-face / @keyframes など対応外のルールはそのまま出力する。
  return rule.cssText;
}

/**
 * カンマ区切りのセレクタリスト（例: `h1, h2`）を
 * 各セレクタに対してスコープ変換してカンマ結合して返す。
 */
function scopeSlideSelectorList(selectorText: string): string {
  return selectorText
    .split(",")
    .map((selector) => scopeSlideSelector(selector.trim()))
    .join(", ");
}

/**
 * 単一のセレクタを Marp の DOM 構造へ適合するよう変換する。
 *
 * 変換ルール:
 *   - `html` / `body` / `:root` / `div.marpit` で始まるセレクタはルート系とみなしてそのまま通す。
 *   - `section` で始まるセレクタは SLIDE_SCOPE_SELECTOR に差し替える。
 *   - その他（`h1` / `p` / `.classname` 等）は SLIDE_SCOPE_SELECTOR の子孫として補完する。
 */
function scopeSlideSelector(selector: string): string {
  if (!selector) {
    return selector;
  }

  if (
    selector.startsWith("html") ||
    selector.startsWith("body") ||
    selector.startsWith(":root") ||
    selector.startsWith("div.marpit")
  ) {
    // ルート系セレクタや既に Marp 構造を前提にした指定はそのまま通す。
    return selector;
  }

  if (selector.startsWith("section")) {
    // `section` で始まる場合は Marp の完全な section パスへ差し替える。
    // 例: `section.lead` → `div.marpit > svg > foreignObject > section.lead`
    return selector.replace(/^section\b/, SLIDE_SCOPE_SELECTOR);
  }

  // それ以外（`h1`, `.lead`, `img` 等）は section 配下を対象とした指定として補完する。
  // 例: `h1` → `div.marpit > svg > foreignObject > section h1`
  return `${SLIDE_SCOPE_SELECTOR} ${selector}`;
}
