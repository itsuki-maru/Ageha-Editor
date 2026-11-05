import { nextTick, ref, watch, type Ref } from "vue";
import mermaid from "mermaid";
import type { DocumentMode, SlideRenderResult } from "@/interface";
import { detectDocumentMode } from "@/utils/documentMode";
import { createSlideHtmlDocument } from "@/utils/htmlTemplate";
import { renderSlides } from "@/utils/slideRenderer";
import {
  renderMarkdownHtml,
  renderMermaidToSvg,
  renderSlideMermaidToSvg,
  renderSlidesDocument,
} from "@/utils/documentRenderer";

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

  // スタイル変更時は描画済みのスライド本文を保持し、フレームだけを再構築する。
  watch(
    slideCustomCss,
    () => {
      const rendered = slideRender.value;
      if (documentMode.value === "slides" && rendered) {
        previewFrameHtml.value = createSlideHtmlDocument(rendered.html, rendered.css, {
          userStyle: slideCustomCss.value,
        });
      }
    },
    { flush: "sync" },
  );

  function renderSlidesDocumentForExport(): Promise<string> {
    // プレビュー非表示時や描画の遅延待ちでも、現在の本文から描画する。
    return renderSlidesDocument(editorContent.value, activeFilePath.value, slideCustomCss.value);
  }

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

  return {
    parsedHtml,
    previewFrameHtml,
    documentMode,
    slideRender,
    drawMermaid,
    renderMermaidToSvg,
    renderMarkdownHtmlForExport,
    renderMarkdownHtmlForViewer,
    renderSlidesDocumentForExport,
  };
}
