import { nextTick, ref, watch, type Ref } from "vue";
import { FilterXSS, getDefaultWhiteList } from "xss";
import type { IFilterXSSOptions } from "xss";
import { marked } from "marked";
import type { MarkedOptions } from "marked";
import mermaid from "mermaid";
import type { DocumentMode, SlideRenderResult } from "@/interface";
import { embedLocalImageSourcesInHtml } from "@/utils/assetPaths";
import { detectDocumentMode } from "@/utils/documentMode";
import { createSlideHtmlDocument } from "@/utils/htmlTemplate";
import { renderSlides } from "@/utils/slideRenderer";
import {
  PageBreakToken,
  detailsToken,
  mathExtensionToken,
  noteToken,
  renderIframe,
  renderer,
  setMarkedRendererFileContext,
  setMarkedRendererPreviewAssetUrls,
  videoToken,
  warningToken,
  youtubeToken,
} from "../utils/markedSetup";

export function useMarkdownPreview(
  editorContent: Ref<string>,
  activeFilePath: Ref<string>,
  slideCustomCss: Ref<string>,
  isPreview: Ref<boolean | null>,
) {
  const parsedHtml = ref("");
  const previewFrameHtml = ref("");
  const documentMode = ref<DocumentMode>("markdown");
  const slideRender = ref<SlideRenderResult | null>(null);

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
      h3: ["id"],
      h4: ["id"],
      h5: ["id"],
      h6: ["id"],
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

  let renderSequence = 0;
  let markdownDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  let slideDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  watch(
    [editorContent, activeFilePath, isPreview],
    ([md, filePath, previewVisible]) => {
      if (markdownDebounceTimer !== null) {
        clearTimeout(markdownDebounceTimer);
        markdownDebounceTimer = null;
      }
      if (slideDebounceTimer !== null) {
        clearTimeout(slideDebounceTimer);
        slideDebounceTimer = null;
      }

      // frontmatter の変更もあり得るため、本文が変わるたびにモードを再判定する。
      const nextMode = detectDocumentMode(md);
      documentMode.value = nextMode;

      if (previewVisible !== true) {
        // プレビュー非表示時は重いレンダリングを止め、表示復帰時に最新内容で再生成する。
        renderSequence++;
        return;
      }

      if (nextMode === "slides") {
        // Marp レンダリングは重いため、連続入力中は実行を遅延させる。
        slideDebounceTimer = setTimeout(() => {
          slideDebounceTimer = null;
          renderSlideContent(md, filePath);
        }, 300);
        return;
      }

      markdownDebounceTimer = setTimeout(() => {
        markdownDebounceTimer = null;
        renderMarkdownContent(md, filePath);
      }, 200);
    },
    { flush: "post", immediate: true },
  );

  async function renderMarkdownContent(md: string, filePath: string) {
    const currentSequence = ++renderSequence;
    const startedAt = performance.now();
    const html = await renderMarkdownHtml(md, filePath, { embedLocalImages: false });

    if (currentSequence !== renderSequence) {
      return;
    }

    parsedHtml.value = html;
    previewFrameHtml.value = "";
    slideRender.value = null;

    if (html.includes('class="mermaid"') || html.includes("class='mermaid'")) {
      await nextTick();
      await drawMermaid();
    }

    console.debug(`Markdown preview rendered in ${Math.round(performance.now() - startedAt)}ms`);
  }

  async function renderMarkdownHtml(
    md: string,
    filePath: string,
    options: { embedLocalImages: boolean },
  ): Promise<string> {
    setMarkedRendererFileContext(filePath);
    const markedOptions: MarkedOptions = { async: false };
    setMarkedRendererPreviewAssetUrls(!options.embedLocalImages);
    try {
      const htmlStr = marked.parse(md, markedOptions);
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

  async function renderMarkdownHtmlForExport(): Promise<string> {
    return renderMarkdownHtml(editorContent.value, activeFilePath.value, {
      embedLocalImages: true,
    });
  }

  async function renderMarkdownHtmlForViewer(): Promise<string> {
    return renderMarkdownHtml(editorContent.value, activeFilePath.value, {
      embedLocalImages: false,
    });
  }

  async function renderSlideContent(md: string, filePath: string) {
    const currentSequence = ++renderSequence;
    const startedAt = performance.now();
    try {
      // スライドは Marp で HTML/CSS を生成し、さらに Mermaid を SVG 化してから iframe へ渡す。
      const renderedSlides = await renderSlides(md, filePath);
      const mermaidHtml = await renderSlideMermaidToSvg(renderedSlides.html);

      if (currentSequence !== renderSequence) {
        // もっと新しい描画要求が来ていれば古い結果で上書きしない。
        return;
      }

      slideRender.value = {
        ...renderedSlides,
        html: mermaidHtml,
      };
      previewFrameHtml.value = createSlideHtmlDocument(mermaidHtml, renderedSlides.css, {
        title: "Ageha Editor Slides Preview",
        userStyle: slideCustomCss.value,
      });
      parsedHtml.value = "";
      console.debug(`Slide preview rendered in ${Math.round(performance.now() - startedAt)}ms`);
    } catch (error) {
      console.error("Slide render failed:", error);

      if (currentSequence !== renderSequence) {
        // エラー時も同様に、古い描画要求の結果は捨てる。
        return;
      }

      // 画面が真っ白にならないよう、最低限のエラー表示用スライドを返す。
      const fallbackHtml = `<section class="slide-render-error"><h2>Slide Preview Error</h2><p>スライドの描画に失敗しました。</p></section>`;
      slideRender.value = {
        mode: "slides",
        html: fallbackHtml,
        css: "body{margin:0;background:#0f172a;color:#fff;font-family:sans-serif;} section{padding:40px;}",
        metadata: { slideCount: 0 },
      };
      previewFrameHtml.value = createSlideHtmlDocument(fallbackHtml, slideRender.value.css, {
        title: "Ageha Editor Slides Preview",
        userStyle: slideCustomCss.value,
      });
      parsedHtml.value = "";
    }
  }

  async function drawMermaid() {
    if (documentMode.value === "slides") {
      // スライドモードの Mermaid は renderSlideMermaidToSvg 側が受け持つ。
      return;
    }

    try {
      await mermaid.init();
    } catch {
      console.error("Mermaid.js Syntax Error.");
    }
  }

  // 通常 Markdown 用: marked が出力する `.mermaid` ブロックを SVG へ差し替える。
  // useExport からも呼ばれるため公開する。
  async function renderMermaidToSvg(html: string): Promise<string> {
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

  // スライド用: Marp が出力する fenced code (`code.language-mermaid`) を SVG へ差し替える。
  async function renderSlideMermaidToSvg(html: string): Promise<string> {
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

  return {
    parsedHtml,
    previewFrameHtml,
    documentMode,
    slideRender,
    drawMermaid,
    renderMermaidToSvg,
    renderMarkdownHtmlForExport,
    renderMarkdownHtmlForViewer,
  };
}
