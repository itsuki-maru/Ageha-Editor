import { FilterXSS, getDefaultWhiteList } from "xss";
import type { IFilterXSSOptions } from "xss";
import { marked } from "marked";
import type { MarkedOptions } from "marked";
import mermaid from "mermaid";
import { embedLocalImageSourcesInHtml } from "@/utils/assetPaths";
import { stripMarpFrontmatter } from "@/utils/documentMode";
import { createSlideHtmlDocument } from "@/utils/htmlTemplate";
import { renderSlides } from "@/utils/slideRenderer";
import {
  PageBreakToken,
  detailsToken,
  mathExtensionToken,
  noteToken,
  renderIframe,
  renderer,
  resetMarkedHeadingSlugs,
  setMarkedRendererFileContext,
  setMarkedRendererPreviewAssetUrls,
  videoToken,
  warningToken,
  youtubeToken,
} from "@/utils/markedSetup";

mermaid.initialize({ startOnLoad: false, theme: "default" });

marked.setOptions({ renderer, async: false });
marked.use({
  extensions: [
    videoToken,
    detailsToken,
    noteToken,
    warningToken,
    mathExtensionToken,
    PageBreakToken,
    youtubeToken,
  ],
});

const xssOptions: IFilterXSSOptions = {
  whiteList: {
    // 既定の許可リストを土台にしつつ、Ageha 独自プレビューで必要な属性だけを追加で許可する。
    ...getDefaultWhiteList(),
    h1: ["id", "class"],
    h2: ["id", "class"],
    h3: ["id", "class"],
    h4: ["id", "class"],
    h5: ["id", "class"],
    h6: ["id", "class"],
    pre: ["class", "is", "data-auto-scaling"],
    a: ["target", "rel", "href", "title"],
    button: ["class", "data-target"],
    code: ["id", "class"],
    div: ["class"],
    img: ["src", "alt", "title", "width", "height", "loading", "decoding"],
    p: ["class"],
    span: ["class", "aria-hidden", "style"],
    "app-youtube": ["video-id", "data-src"],
  },
  onTag(tag, _html) {
    if (tag === "iframe") return "Not Allow iframe ";
  },
  css: {
    whiteList: {
      height: true,
      "margin-right": true,
      top: true,
      width: true,
      "margin-left": true,
      left: true,
      right: true,
      bottom: true,
    },
  },
};
const myXss = new FilterXSS(xssOptions);

export async function renderMarkdownHtml(
  md: string,
  filePath: string,
  options: { embedLocalImages: boolean },
): Promise<string> {
  setMarkedRendererFileContext(filePath);
  const markedOptions: MarkedOptions = { async: false };
  setMarkedRendererPreviewAssetUrls(!options.embedLocalImages);
  resetMarkedHeadingSlugs();
  try {
    const htmlStr = marked.parse(stripMarpFrontmatter(md), markedOptions);
    const htmlWithAssets = options.embedLocalImages
      ? await embedLocalImageSourcesInHtml(htmlStr as string, filePath)
      : (htmlStr as string);
    // HTML として整形したあとで危険なタグや属性を落とす。
    const cleanHtml = myXss.process(htmlWithAssets);
    return renderIframe(cleanHtml);
  } finally {
    setMarkedRendererPreviewAssetUrls(true);
  }
}

// 通常 Markdown 用: marked が出力する `.mermaid` ブロックを SVG へ差し替える。
export async function renderMermaidToSvg(html: string): Promise<string> {
  const container = document.createElement("div");
  container.innerHTML = html;
  let index = 0;

  const blocks = container.querySelectorAll<HTMLElement>(".mermaid");
  for (const block of Array.from(blocks)) {
    const code = block.textContent ?? "";
    const { svg } = await mermaid.render(`print-graph-${index++}`, code);
    block.outerHTML = svg;
  }

  return container.innerHTML;
}

// スライド用: Marp が出力するコードブロック (`code.language-mermaid`) を SVG へ差し替える。
export async function renderSlideMermaidToSvg(html: string): Promise<string> {
  const container = document.createElement("div");
  container.innerHTML = html;
  let index = 0;

  const blocks = container.querySelectorAll<HTMLElement>("code.language-mermaid");
  for (const codeBlock of Array.from(blocks)) {
    const code = codeBlock.textContent ?? "";
    const { svg } = await mermaid.render(`slide-graph-${index++}`, code);
    const pre = codeBlock.closest("pre");
    if (pre) {
      pre.outerHTML = `<div class="mermaid-slide">${svg}</div>`;
    }
  }

  return container.innerHTML;
}

export async function renderSlidesDocument(
  markdown: string,
  filePath: string,
  userStyle: string,
): Promise<string> {
  const rendered = await renderSlides(markdown, filePath);
  const html = await renderSlideMermaidToSvg(rendered.html);
  return createSlideHtmlDocument(html, rendered.css, { userStyle });
}
