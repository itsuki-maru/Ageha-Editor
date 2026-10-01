import rawKatex from "katex/dist/katex.min.css?raw";

interface SlideHtmlOptions {
  title?: string;
  /** ~/.ageha/ageha-slide.css の内容。Marp CSS の後段に適用する。 */
  userStyle?: string;
  /** 印刷時の @media print ルールなど、呼び出し側だけが知る追加 CSS */
  extraStyle?: string;
}

interface HtmlDocumentOptions {
  title?: string;
  copiedLabel?: string;
}

interface TocItem {
  id: string;
  text: string;
  level: number;
  children: TocItem[];
}

const SLIDE_SCOPE_SELECTOR = "div.marpit > svg > foreignObject > section";

// iframe は親へ通知し、独立 Tauri ウィンドウは opener を直接呼ぶ（viewer.json の権限が必要）。
// エクスポート HTML をブラウザで開いた場合は通常のリンク動作に委ねる。
const SLIDE_EXTERNAL_LINK_SCRIPT = `(function () {
  document.addEventListener("click", function (e) {
    var a = e.target.closest("a[href]");
    if (!a) return;
    var href = a.getAttribute("href") || "";
    if (!href.startsWith("https://") && !href.startsWith("http://")) return;
    e.preventDefault();
    if (window.parent !== window) {
      window.parent.postMessage({ type: "open-external", url: href }, "*");
    } else if (window.__TAURI_INTERNALS__) {
      window.__TAURI_INTERNALS__
        .invoke("plugin:opener|open_url", { url: href })
        .catch(function (err) { console.error("Failed to open URL:", err); });
    }
  });
})();`;

function buildCopyButtonScript(copiedLabel: string) {
  return `
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
  tooltip.textContent = ${JSON.stringify(copiedLabel)};
  tooltip.className = "copy-tooltip";
  target.parentElement?.appendChild(tooltip);

  setTimeout(() => {
    tooltip.style.opacity = "0";
    setTimeout(() => tooltip.remove(), 300);
  }, 1000);
});
`;
}

const COPY_BUTTON_STYLE = `
  .code-container {
    position: relative;
    margin-bottom: 1.5em;
    border-radius: 6px;
    overflow: hidden;
    background: #f5f5f5;
    font-size: 0.9em;
    line-height: 1.5;
  }

  .code-container pre {
    margin: 0;
    padding: 1em;
    overflow-x: auto;
  }

  .copy-btn {
    position: absolute;
    top: 0.7em;
    right: 0.5em;
    background-color: #5e5e5e;
    color: white;
    border: none;
    padding: 0.3em 0.6em;
    border-radius: 4px;
    font-size: 0.75em;
    cursor: pointer;
    opacity: 0.8;
    transition: opacity 0.2s ease-in-out;
    z-index: 2;
  }

  .copy-tooltip {
    position: absolute;
    top: 0em;
    right: 0.5em;
    background: #57a53f;
    color: white;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.95em;
    opacity: 1;
    pointer-events: none;
    z-index: 3;
    transition: opacity 0.3s ease;
  }
`;

const MARKDOWN_VIEWER_RESPONSIVE_STYLE = `
  body.ageha-viewer {
    overflow-x: hidden;
  }

  body.ageha-viewer .container-fluid {
    box-sizing: border-box;
    max-width: 100%;
  }

  body.ageha-viewer img,
  body.ageha-viewer video,
  body.ageha-viewer iframe {
    max-width: 100%;
  }

  body.ageha-viewer img,
  body.ageha-viewer video {
    height: auto;
  }

  @media (max-width: 720px) {
    body.ageha-viewer {
      font-size: 14px;
      overflow-wrap: anywhere;
    }

    body.ageha-viewer .container-fluid {
      width: 100%;
      padding-left: 10px;
      padding-right: 10px;
    }

    body.ageha-viewer pre,
    body.ageha-viewer .code-container,
    body.ageha-viewer table {
      max-width: 100%;
      overflow-x: auto;
    }

    body.ageha-viewer table {
      display: block;
    }
  }
`;

const TOC_STYLE = `
  body.ageha-viewer.has-toc .viewer-layout {
    display: flex;
    align-items: flex-start;
    gap: 0;
    width: 100%;
    margin: 0;
    padding: 0 12px;
    box-sizing: border-box;
  }

  body.ageha-viewer.has-toc .viewer-layout > .container-fluid {
    flex: 0 1 70%;
    min-width: 0;
    max-width: 70%;
    box-sizing: border-box;
    padding-right: 28px;
  }

  .ageha-toc {
    position: sticky;
    top: 24px;
    flex: 0 1 30%;
    width: 30%;
    max-height: calc(100vh - 48px);
    overflow-y: auto;
    overflow-x: hidden;
    box-sizing: border-box;
    padding: 14px 14px 16px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    background: #fafafa;
    box-shadow: 0 1px 6px rgba(0, 0, 0, 0.07);
    font-size: 13px;
    line-height: 1.6;
  }

  .ageha-toc::before {
    content: "目次";
    display: block;
    margin-bottom: 10px;
    padding-bottom: 8px;
    border-bottom: 1px solid #e5e7eb;
    color: #6b7280;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.1em;
  }

  .ageha-toc ul {
    margin: 0;
    padding: 0;
  }

  .ageha-toc ul ul {
    margin: 2px 0 0 4px;
    padding-left: 10px;
    border-left: 2px solid #e5e7eb;
  }

  .ageha-toc li {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .ageha-toc a {
    display: block;
    padding: 4px 8px;
    border-radius: 5px;
    color: #323740;
    text-decoration: none;
    word-break: break-word;
    transition:
      color 0.15s,
      background-color 0.15s;
  }

  .ageha-toc a:hover,
  .ageha-toc a.active {
    background-color: #eff6ff;
    color: #2563eb;
  }

  .ageha-toc a.active {
    font-weight: 600;
  }

  .ageha-toc-toggle {
    position: fixed;
    top: 16px;
    right: 18px;
    z-index: 20;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 44px;
    height: 32px;
    padding: 0 10px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    background: #ffffff;
    color: #374151;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
    cursor: pointer;
    font-size: 12px;
    line-height: 1;
  }

  .ageha-toc-toggle:hover {
    background: #f3f4f6;
  }

  body.toc-collapsed .ageha-toc {
    display: none;
  }

  body.ageha-viewer.has-toc.toc-collapsed .viewer-layout > .container-fluid {
    flex-basis: 100%;
    max-width: none;
    padding-right: 0;
  }

  @media (max-width: 980px) {
    body.ageha-viewer.has-toc .viewer-layout {
      flex-direction: column;
      padding: 0 10px;
    }

    body.ageha-viewer.has-toc .viewer-layout > .container-fluid {
      flex: 0 1 auto;
      max-width: none;
      padding-right: 0;
    }

    .ageha-toc {
      position: static;
      order: -1;
      flex: 0 1 auto;
      width: 100%;
      max-height: 240px;
      margin: 0 0 20px;
    }
  }

  @media (max-width: 720px) {
    body.ageha-viewer.has-toc.toc-collapsed {
      padding: 10px;
    }

    body.ageha-viewer.has-toc .viewer-layout {
      padding: 0 6px;
    }

    body.ageha-viewer.has-toc:not(.toc-collapsed)::before {
      content: "";
      position: fixed;
      inset: 0;
      z-index: 25;
      background: rgba(17, 24, 39, 0.34);
    }

    body.toc-collapsed .ageha-toc {
      display: block;
      pointer-events: none;
      transform: translateX(calc(100% + 18px));
      visibility: hidden;
    }

    .ageha-toc {
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      z-index: 30;
      display: block;
      width: min(86vw, 340px);
      max-height: none;
      margin: 0;
      padding: 52px 14px 18px;
      border-top: 0;
      border-right: 0;
      border-bottom: 0;
      border-radius: 0;
      box-shadow: -8px 0 24px rgba(15, 23, 42, 0.2);
      font-size: 12px;
      transform: translateX(0);
      transition:
        transform 0.22s ease,
        visibility 0.22s ease;
      visibility: visible;
    }

    .ageha-toc-toggle {
      top: 10px;
      right: 10px;
      z-index: 35;
      height: 30px;
      font-size: 11px;
    }
  }
`;

const TOC_SCRIPT = `
(function () {
  var body = document.body;
  var toc = document.getElementById("ageha-toc");
  var toggle = document.getElementById("ageha-toc-toggle");
  if (!toc || !toggle) return;

  var storageKey = "ageha.viewer.tocCollapsed";
  var mobileQuery = window.matchMedia("(max-width: 720px)");
  try {
    var storedCollapsed = localStorage.getItem(storageKey);
    if (storedCollapsed === "true" || (storedCollapsed === null && mobileQuery.matches)) {
      body.classList.add("toc-collapsed");
    }
  } catch (_) {}

  function syncToggleLabel() {
    var collapsed = body.classList.contains("toc-collapsed");
    toggle.textContent = collapsed ? "目次を表示" : "目次を隠す";
    toggle.setAttribute("aria-expanded", collapsed ? "false" : "true");
  }

  toggle.addEventListener("click", function () {
    body.classList.toggle("toc-collapsed");
    try {
      localStorage.setItem(storageKey, body.classList.contains("toc-collapsed") ? "true" : "false");
    } catch (_) {}
    syncToggleLabel();
  });

  document.addEventListener("click", function (e) {
    if (!mobileQuery.matches || body.classList.contains("toc-collapsed")) return;
    var target = e.target;
    if (!(target instanceof HTMLElement)) return;
    if (toc.contains(target) || toggle.contains(target)) return;

    body.classList.add("toc-collapsed");
    try {
      localStorage.setItem(storageKey, "true");
    } catch (_) {}
    syncToggleLabel();
  });

  var links = Array.from(toc.querySelectorAll("a[href^='#']"));
  var headings = links
    .map(function (link) {
      var id = decodeURIComponent(link.getAttribute("href").slice(1));
      return document.getElementById(id);
    })
    .filter(Boolean);

  function setActive(id) {
    links.forEach(function (link) {
      link.classList.toggle("active", link.getAttribute("href") === "#" + encodeURIComponent(id));
    });
  }

  function getHeadingTop(heading) {
    return heading.getBoundingClientRect().top + window.scrollY - 16;
  }

  function scrollToHeading(id, behavior) {
    var heading = document.getElementById(id);
    if (!heading) return;
    window.scrollTo({ top: getHeadingTop(heading), behavior: behavior || "auto" });
    setActive(id);
  }

  function scheduleScrollCorrection(id) {
    [100, 300, 700, 1200].forEach(function (delay) {
      window.setTimeout(function () {
        scrollToHeading(id, "auto");
      }, delay);
    });
  }

  function correctAfterPendingImages(id) {
    var pendingImages = Array.from(document.images).filter(function (image) {
      return !image.complete;
    });

    pendingImages.forEach(function (image) {
      var correct = function () {
        scrollToHeading(id, "auto");
      };
      image.addEventListener("load", correct, { once: true });
      image.addEventListener("error", correct, { once: true });
    });
  }

  links.forEach(function (link) {
    link.addEventListener("click", function (e) {
      var rawHref = link.getAttribute("href") || "";
      if (!rawHref.startsWith("#")) return;

      var id = decodeURIComponent(rawHref.slice(1));
      if (!document.getElementById(id)) return;

      e.preventDefault();
      scrollToHeading(id, "smooth");
      correctAfterPendingImages(id);
      scheduleScrollCorrection(id);

      try {
        history.pushState(null, "", "#" + encodeURIComponent(id));
      } catch (_) {}

      if (mobileQuery.matches) {
        body.classList.add("toc-collapsed");
        try {
          localStorage.setItem(storageKey, "true");
        } catch (_) {}
        syncToggleLabel();
      }
    });
  });

  if ("IntersectionObserver" in window && headings.length > 0) {
    var visible = new Map();
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) visible.set(entry.target.id, entry.boundingClientRect.top);
        else visible.delete(entry.target.id);
      });

      var active = Array.from(visible.entries()).sort(function (a, b) { return a[1] - b[1]; })[0];
      if (active) setActive(active[0]);
    }, { rootMargin: "0px 0px -70% 0px", threshold: 0 });

    headings.forEach(function (heading) { observer.observe(heading); });
  }

  syncToggleLabel();

  window.addEventListener("load", function () {
    if (!location.hash) return;
    var id = decodeURIComponent(location.hash.slice(1));
    if (!document.getElementById(id)) return;
    scrollToHeading(id, "auto");
    correctAfterPendingImages(id);
    scheduleScrollCorrection(id);
  });
})();
`;

/** Mermaid は呼び出し元で SVG 化し、ここでは KaTeX CSS とコピー用スクリプトを埋め込む。 */
export function createHtml(html: string, style: string, options: HtmlDocumentOptions = {}): string {
  const title = options.title ?? "Ageha Editor";
  const copiedLabel = options.copiedLabel ?? "Copied";
  const tocHtml = buildTocHtml(html);
  const hasToc = tocHtml.length > 0;
  const tocButton = hasToc
    ? '<button type="button" id="ageha-toc-toggle" class="ageha-toc-toggle" aria-controls="ageha-toc" aria-expanded="true">目次を隠す</button>'
    : "";
  const tocAside = hasToc ? `<aside id="ageha-toc" class="ageha-toc">${tocHtml}</aside>` : "";
  const bodyClass = hasToc ? "ageha-viewer has-toc" : "ageha-viewer";
  const tocStyle = hasToc ? `<style>${TOC_STYLE}</style>` : "";
  const tocScript = hasToc ? `<script>${TOC_SCRIPT}</script>` : "";
  return `<!DOCTYPE html>
    <html>
    <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <style>${style}</style>
    <style>${rawKatex}</style>
    <style>${MARKDOWN_VIEWER_RESPONSIVE_STYLE}</style>
    ${tocStyle}
    </head>
    <body id="ageha-document" class="${bodyClass}">
    ${tocButton}
    <div class="viewer-layout">
    <main class="container-fluid" id="main-content">${html}</main>
    ${tocAside}
    </div>
    </body>
    <script>${buildCopyButtonScript(copiedLabel)}</script>
    ${tocScript}
    <style>${COPY_BUTTON_STYLE}</style>
    </html>`;
}

/** Marp CSS の後にユーザー CSS を適用する、プレビュー・出力共通のスライド文書。 */
export function createSlideHtmlDocument(
  html: string,
  style: string,
  options: SlideHtmlOptions = {},
): string {
  const title = escapeHtml(options.title ?? "Ageha Editor Slides");
  const userStyle = options.userStyle ?? "";
  const scopedUserStyle = buildScopedSlideUserStyle(userStyle);
  const extraStyle = options.extraStyle ?? "";

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
    <body>${html}
    <script>${SLIDE_EXTERNAL_LINK_SCRIPT}<\/script></body>
    </html>`;
}

/** createSlideHtmlDocument の生成結果に、指定されたタイトル・追加 CSS だけを反映する。 */
export function customizeSlideHtmlDocument(
  documentHtml: string,
  options: SlideHtmlOptions = {},
): string {
  let nextHtml = documentHtml;

  if (options.title) {
    const escapedTitle = escapeHtml(options.title);
    if (/<title>.*?<\/title>/i.test(nextHtml)) {
      nextHtml = nextHtml.replace(/<title>.*?<\/title>/i, `<title>${escapedTitle}</title>`);
    }
  }

  if (options.extraStyle) {
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

/** スライド文書に、1 枚ずつ表示するスライドショー UI と操作スクリプトを追加する。 */
export function createSlideshowHtmlDocument(baseSlideHtml: string): string {
  return baseSlideHtml
    .replace(/<\/head>/i, `    <style>${SLIDESHOW_STYLE}</style>\n    </head>`)
    .replace(
      /<\/body>/i,
      `    ${SLIDESHOW_NAV_HTML}\n    <script>${SLIDESHOW_SCRIPT}<\/script>\n    </body>`,
    );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildTocHtml(html: string): string {
  if (typeof document === "undefined") {
    return "";
  }

  const container = document.createElement("div");
  container.innerHTML = html;

  const headings = Array.from(
    container.querySelectorAll<HTMLHeadingElement>("h1[id],h2[id],h3[id],h4[id],h5[id],h6[id]"),
  )
    .map<TocItem>((heading) => ({
      id: heading.id,
      text: heading.textContent?.trim() ?? "",
      level: Number(heading.tagName.slice(1)),
      children: [],
    }))
    .filter((heading): heading is TocItem => heading.id.length > 0 && heading.text.length > 0);

  if (headings.length === 0) {
    return "";
  }

  const root: TocItem = { id: "", text: "", level: 0, children: [] };
  const stack: TocItem[] = [root];

  for (const heading of headings) {
    while (stack.length > 1 && stack[stack.length - 1].level >= heading.level) {
      stack.pop();
    }

    stack[stack.length - 1].children.push(heading);
    stack.push(heading);
  }

  return renderTocItems(root.children);
}

function renderTocItems(items: TocItem[]): string {
  if (items.length === 0) {
    return "";
  }

  return `<ul>${items
    .map((item) => {
      const href = `#${encodeURIComponent(item.id)}`;
      return `<li><a href="${href}">${escapeHtml(item.text)}</a>${renderTocItems(item.children)}</li>`;
    })
    .join("")}</ul>`;
}

// -------- ユーザー CSS のスコープ変換キャッシュ --------

// 同じユーザー CSS を再パースしないよう、スコープ変換結果を保持する。
const scopedStyleCache = new Map<string, string>();

// ユーザー CSS の対象を Marp のスライド section 配下へ揃える。
function buildScopedSlideUserStyle(userStyle: string): string {
  if (!userStyle.trim() || typeof CSSStyleSheet === "undefined") {
    return "";
  }

  const cached = scopedStyleCache.get(userStyle);
  if (cached !== undefined) {
    return cached;
  }

  try {
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

function scopeSlideCssRule(rule: CSSRule): string {
  if (rule instanceof CSSStyleRule) {
    return `${scopeSlideSelectorList(rule.selectorText)} { ${rule.style.cssText} }`;
  }

  if (rule instanceof CSSMediaRule) {
    const nested = Array.from(rule.cssRules)
      .map((childRule) => scopeSlideCssRule(childRule))
      .filter((ruleText) => ruleText.length > 0)
      .join("\n");
    return nested ? `@media ${rule.conditionText} {\n${nested}\n}` : "";
  }

  if (rule instanceof CSSSupportsRule) {
    const nested = Array.from(rule.cssRules)
      .map((childRule) => scopeSlideCssRule(childRule))
      .filter((ruleText) => ruleText.length > 0)
      .join("\n");
    return nested ? `@supports ${rule.conditionText} {\n${nested}\n}` : "";
  }

  // @font-face / @keyframes など対応外のルールはそのまま出力する。
  return rule.cssText;
}

function scopeSlideSelectorList(selectorText: string): string {
  return selectorText
    .split(",")
    .map((selector) => scopeSlideSelector(selector.trim()))
    .join(", ");
}

// ルート指定は保持し、section は Marp のパスへ置換、それ以外はその子孫として扱う。
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
    return selector;
  }

  if (selector.startsWith("section")) {
    // 例: `section.lead` → `div.marpit > svg > foreignObject > section.lead`
    return selector.replace(/^section\b/, SLIDE_SCOPE_SELECTOR);
  }

  // 例: `h1` → `div.marpit > svg > foreignObject > section h1`
  return `${SLIDE_SCOPE_SELECTOR} ${selector}`;
}
