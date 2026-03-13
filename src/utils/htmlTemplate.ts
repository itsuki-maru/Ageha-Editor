import rawKatex from "katex/dist/katex.min.css?raw";
import rawMermaid from "mermaid/dist/mermaid.min.js?raw";

// エクスポート用 HTML、別ウィンドウ表示用 HTML、スライド iframe 用 HTML を
// 共通の組み立て方で生成するためのテンプレートユーティリティ。
interface SlideHtmlOptions {
  title?: string;
  userStyle?: string;
  extraStyle?: string;
}

const SLIDE_SCOPE_SELECTOR = "div.marpit > svg > foreignObject > section";

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

export function createHtml(html: string, style: string): string {
  // 通常 Markdown の viewer / export で使う、単体で開ける HTML を返す。
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

export function createSlideHtmlDocument(
  html: string,
  style: string,
  options: SlideHtmlOptions = {},
): string {
  const title = options.title ?? "Ageha Editor Slides";
  const userStyle = options.userStyle ?? "";
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

export function customizeSlideHtmlDocument(
  documentHtml: string,
  options: SlideHtmlOptions = {},
): string {
  let nextHtml = documentHtml;

  if (options.title) {
    const escapedTitle = escapeHtml(options.title);
    if (/<title>.*?<\/title>/i.test(nextHtml)) {
      // 既存 title がある場合だけ安全に差し替える。
      nextHtml = nextHtml.replace(/<title>.*?<\/title>/i, `<title>${escapedTitle}</title>`);
    }
  }

  if (options.extraStyle) {
    // 印刷時の追加調整など、呼び出し側だけが知っている CSS を後から差し込む。
    nextHtml = nextHtml.replace(
      /<\/head>/i,
      `    <style>${options.extraStyle}</style>\n    </head>`,
    );
  }

  return nextHtml;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildScopedSlideUserStyle(userStyle: string): string {
  if (!userStyle.trim() || typeof CSSStyleSheet === "undefined") {
    return "";
  }

  try {
    // Marp が生成する CSS はセレクタが強く、
    // 単純な `section { ... }` だけでは上書きできないことがある。
    // そのため、ユーザー CSS を Marp の DOM 構造に合わせて再スコープ化する。
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(userStyle);
    return Array.from(sheet.cssRules)
      .map((rule) => scopeSlideCssRule(rule))
      .filter((ruleText) => ruleText.length > 0)
      .join("\n");
  } catch (error) {
    console.warn("Failed to scope slide user CSS overrides.", error);
    return "";
  }
}

function scopeSlideCssRule(rule: CSSRule): string {
  if (rule instanceof CSSStyleRule) {
    // 通常ルールはセレクタだけ組み替えて再利用する。
    return `${scopeSlideSelectorList(rule.selectorText)} { ${rule.style.cssText} }`;
  }

  if (rule instanceof CSSMediaRule) {
    // @media の中も同じルールで再帰的にスコープする。
    const nested = Array.from(rule.cssRules)
      .map((childRule) => scopeSlideCssRule(childRule))
      .filter((ruleText) => ruleText.length > 0)
      .join("\n");
    return nested ? `@media ${rule.conditionText} {\n${nested}\n}` : "";
  }

  if (rule instanceof CSSSupportsRule) {
    // @supports も同様に入れ子のルールを書き換える。
    const nested = Array.from(rule.cssRules)
      .map((childRule) => scopeSlideCssRule(childRule))
      .filter((ruleText) => ruleText.length > 0)
      .join("\n");
    return nested ? `@supports ${rule.conditionText} {\n${nested}\n}` : "";
  }

  return rule.cssText;
}

function scopeSlideSelectorList(selectorText: string): string {
  return selectorText
    .split(",")
    .map((selector) => scopeSlideSelector(selector.trim()))
    .join(", ");
}

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
    // `section` 起点の指定は、Marp が出力する section セレクタへ直接差し替える。
    return selector.replace(/^section\b/, SLIDE_SCOPE_SELECTOR);
  }

  // それ以外は section 配下を対象にした指定として補完する。
  return `${SLIDE_SCOPE_SELECTOR} ${selector}`;
}
