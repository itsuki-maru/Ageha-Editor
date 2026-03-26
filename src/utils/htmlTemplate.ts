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

// -------- スライドショー用定数 --------

const SLIDESHOW_STYLE = `
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    background: #000 !important;
    overflow: hidden !important;
    width: 100vw;
    height: 100vh;
  }

  body {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    cursor: pointer;
  }

  div.marpit {
    margin: 0 !important;
    line-height: 0;
  }

  #slideshow-wrapper {
    transform-origin: center center;
    flex-shrink: 0;
  }

  #slideshow-nav {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 12px;
    background: rgba(0, 0, 0, 0.55);
    border-radius: 8px;
    padding: 6px 16px;
    opacity: 0;
    transition: opacity 0.25s;
    z-index: 9999;
  }

  body:hover #slideshow-nav {
    opacity: 1;
  }

  .ss-nav-btn {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.45);
    color: #fff;
    border-radius: 4px;
    padding: 4px 14px;
    cursor: pointer;
    font-size: 14px;
    line-height: 1.4;
  }

  .ss-nav-btn:hover {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.7);
  }

  #slide-counter {
    color: #ccc;
    font-size: 13px;
    min-width: 64px;
    text-align: center;
    font-family: sans-serif;
    line-height: 1;
  }
`;

const SLIDESHOW_NAV_HTML = `<div id="slideshow-nav">
  <button class="ss-nav-btn" id="ss-prev">&#8592;</button>
  <span id="slide-counter">&#8211; / &#8211;</span>
  <button class="ss-nav-btn" id="ss-next">&#8594;</button>
</div>`;

const SLIDESHOW_SCRIPT = `
(function () {
  var marpit = document.querySelector('div.marpit');
  if (!marpit) return;

  var firstSvg = marpit.querySelector('svg');
  var slideW = 1280;
  var slideH = 720;
  if (firstSvg) {
    var vb = firstSvg.getAttribute('viewBox');
    if (vb) {
      var parts = vb.trim().split(/[\\s,]+/);
      if (parts.length >= 4) {
        slideW = parseFloat(parts[2]) || slideW;
        slideH = parseFloat(parts[3]) || slideH;
      }
    }
  }

  var slides = Array.from(marpit.children).filter(function (el) {
    return el.tagName.toLowerCase() === 'svg';
  });
  if (slides.length === 0) return;

  var wrapper = document.createElement('div');
  wrapper.id = 'slideshow-wrapper';
  wrapper.style.width = slideW + 'px';
  wrapper.style.height = slideH + 'px';
  marpit.parentNode.insertBefore(wrapper, marpit);
  wrapper.appendChild(marpit);

  var current = 0;

  function updateCounter() {
    var counter = document.getElementById('slide-counter');
    if (counter) counter.textContent = (current + 1) + ' / ' + slides.length;
  }

  function showSlide(index) {
    if (index < 0 || index >= slides.length) return;
    slides.forEach(function (s, i) {
      s.style.display = i === index ? '' : 'none';
    });
    current = index;
    updateCounter();
  }

  function updateScale() {
    var scaleX = window.innerWidth / slideW;
    var scaleY = window.innerHeight / slideH;
    wrapper.style.transform = 'scale(' + Math.min(scaleX, scaleY) + ')';
  }

  window.addEventListener('resize', updateScale);

  document.addEventListener('keydown', function (e) {
    switch (e.key) {
      case 'ArrowRight': case 'ArrowDown': case ' ':
        e.preventDefault(); showSlide(current + 1); break;
      case 'ArrowLeft': case 'ArrowUp':
        e.preventDefault(); showSlide(current - 1); break;
      case 'Escape': window.close(); break;
      case 'Home': e.preventDefault(); showSlide(0); break;
      case 'End': e.preventDefault(); showSlide(slides.length - 1); break;
    }
  });

  var nav = document.getElementById('slideshow-nav');
  if (nav) nav.addEventListener('click', function (e) { e.stopPropagation(); });

  var prevBtn = document.getElementById('ss-prev');
  var nextBtn = document.getElementById('ss-next');
  if (prevBtn) prevBtn.addEventListener('click', function (e) { e.stopPropagation(); showSlide(current - 1); });
  if (nextBtn) nextBtn.addEventListener('click', function (e) { e.stopPropagation(); showSlide(current + 1); });

  document.body.addEventListener('click', function (e) {
    if (e.clientX < window.innerWidth / 2) showSlide(current - 1);
    else showSlide(current + 1);
  });

  showSlide(0);
  updateScale();
})();
`;

/**
 * スライドモード用の基盤 HTML にスライドショー UI と制御スクリプトを注入して返す。
 * 1 枚ずつ表示するプレゼンテーションモード用。
 *
 * キーボード操作:
 *   ArrowRight / ArrowDown / Space: 次のスライド
 *   ArrowLeft / ArrowUp           : 前のスライド
 *   Home / End                    : 最初 / 最後のスライド
 *   Escape                        : ウィンドウを閉じる
 *
 * @param baseSlideHtml - createSlideHtmlDocument が生成した完全な HTML 文書
 */
export function createSlideshowHtmlDocument(baseSlideHtml: string): string {
  return baseSlideHtml
    .replace(/<\/head>/i, `    <style>${SLIDESHOW_STYLE}</style>\n    </head>`)
    .replace(/<\/body>/i, `    ${SLIDESHOW_NAV_HTML}\n    <script>${SLIDESHOW_SCRIPT}<\/script>\n    </body>`);
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
