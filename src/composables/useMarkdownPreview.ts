import { ref, watch, type Ref } from "vue";
import { FilterXSS, getDefaultWhiteList } from "xss";
import type { IFilterXSSOptions } from "xss";
import { marked } from "marked";
import type { MarkedOptions } from "marked";
import mermaid from "mermaid";
import type { DocumentMode, SlideRenderResult } from "@/interface";
import { embedLocalImageSources } from "@/utils/assetPaths";
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
  videoToken,
  warningToken,
  youtubeToken,
} from "../utils/markedSetup";

export function useMarkdownPreview(
  editorContent: Ref<string>,
  activeFilePath: Ref<string>,
  slideCustomCss: Ref<string>,
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
  let slideDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  watch(
    [editorContent, activeFilePath],
    async ([md, filePath]) => {
      // frontmatter の変更もあり得るため、本文が変わるたびにモードを再判定する。
      const nextMode = detectDocumentMode(md);
      documentMode.value = nextMode;

      if (nextMode === "slides") {
        // Marp レンダリングは重いため、連続入力中は実行を遅延させる。
        if (slideDebounceTimer !== null) {
          clearTimeout(slideDebounceTimer);
        }
        slideDebounceTimer = setTimeout(() => {
          slideDebounceTimer = null;
          renderSlideContent(md, filePath);
        }, 300);
        return;
      }

      // 通常 Markdown は従来どおり marked + XSS のパイプラインで描画する。
      const currentSequence = ++renderSequence;
      setMarkedRendererFileContext(filePath);
      const markdownWithEmbeddedImages = await embedLocalImageSources(md, filePath);
      const options: MarkedOptions = { async: false };
      const htmlStr = marked.parse(markdownWithEmbeddedImages, options);
      // HTML として整形したあとで危険なタグや属性を落とす。
      const cleanHtml = myXss.process(htmlStr as string);

      if (currentSequence !== renderSequence) {
        return;
      }

      parsedHtml.value = renderIframe(cleanHtml);
      previewFrameHtml.value = "";
      slideRender.value = null;
    },
    { flush: "post", immediate: true },
  );

  async function renderSlideContent(md: string, filePath: string) {
    const currentSequence = ++renderSequence;
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
  };
}
