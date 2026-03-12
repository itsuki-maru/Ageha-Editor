import { type Ref } from "vue";
import type { DocumentMode, SlideRenderResult } from "@/interface";
import {
  createHtml,
  createSlideHtmlDocument,
  customizeSlideHtmlDocument,
} from "../utils/htmlTemplate";

// 印刷・HTML 出力・別ウィンドウ表示の処理をまとめて管理する。
// Markdown モードと Slides モードで分岐しても、呼び出し口は統一しておきたい。
export function useExport(
  editorContent: Ref<string>,
  documentMode: Ref<DocumentMode>,
  parsedHtml: Ref<string>,
  previewFrameHtml: Ref<string>,
  slideRender: Ref<SlideRenderResult | null>,
  cssData: () => string,
  slideCssData: () => string,
  renderMermaidToSvg: (html: string) => Promise<string>,
  saveHtmlFile: (htmlContent: string) => Promise<void>,
  showMessage: (msg: string) => void,
) {
  async function printOut(): Promise<void> {
    if (editorContent.value === "") {
      showMessage("入力がありません。");
      return;
    }

    // 印刷専用の一時ウィンドウへ完成済み HTML を流し込む。
    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) return;

    const html = await createExportHtml(true);
    printWindow.document.writeln(html);
    printWindow.document.close();
    // フォントや画像の読み込み完了を待ってから印刷する。
    await waitForWindowAssets(printWindow);
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  }

  async function exportHtml(): Promise<void> {
    if (editorContent.value === "") {
      showMessage("入力がありません。");
      return;
    }

    // 保存用 HTML は印刷向けではなく通常閲覧向けの内容で生成する。
    const html = await createExportHtml(false);
    await saveHtmlFile(html);
  }

  async function openViewer(): Promise<void> {
    if (editorContent.value === "") {
      showMessage("入力がありません。");
      return;
    }

    // viewer は印刷と違って閉じず、そのまま閲覧用ウィンドウとして残す。
    const viewerWindow = window.open("", "_blank", "width=1000,height=700");
    if (!viewerWindow) return;

    const html = await createViewerHtml();
    viewerWindow.document.writeln(html);
    viewerWindow.document.close();
  }

  async function createExportHtml(isPrint: boolean): Promise<string> {
    if (documentMode.value === "slides") {
      // スライドは iframe プレビューで使っている HTML をそのまま再利用し、
      // 画面上の見た目と印刷・出力結果の差が出にくいようにしている。
      const baseSlidesHtml = getSlidesDocumentHtml();
      return customizeSlideHtmlDocument(baseSlidesHtml, {
        title: isPrint ? "印刷" : "Ageha Editor Slides",
        extraStyle: isPrint ? "@media print { html, body { background: #f4f7fb; } }" : undefined,
      });
    }

    // Markdown モードでは export 前に Mermaid を静的 SVG 化しておく。
    const rendered = await renderMermaidToSvg(parsedHtml.value);
    if (isPrint) {
      return `<html>
        <head>
          <meta charset="UTF-8">
          <title>印刷</title>
          <link rel="stylesheet" href="katex.css">
          <style>${cssData()}
            @media print {
              button.copy-btn { display: none !important; }
              iframe { display: none !important; }
            }
            html { transform: scale(0.9); }
          </style>
        </head>
        <body>${rendered}</body>
      </html>`;
    }

    return createHtml(rendered, cssData());
  }

  async function createViewerHtml(): Promise<string> {
    if (documentMode.value === "slides") {
      // スライドは preview 用 HTML をそのまま流用する。
      return customizeSlideHtmlDocument(getSlidesDocumentHtml(), {
        title: "Ageha Editor Slides",
      });
    }

    // 通常 Markdown は閲覧向けの HTML を新たに組み立てる。
    const rendered = await renderMermaidToSvg(parsedHtml.value);
    return `<!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Ageha Editor Viewer</title>
          <link rel="stylesheet" href="katex.css">
          <style>${cssData()}</style>
        </head>
        <body>${rendered}</body>
        <style>body { margin-top: 0; }</style>
        <script src="preview.js"><\/script>
      </html>`;
  }

  function getSlidesDocumentHtml(): string {
    if (previewFrameHtml.value) {
      // すでに完成している preview 用 HTML があればそれを最優先する。
      return previewFrameHtml.value;
    }

    const renderedSlides = slideRender.value;
    if (!renderedSlides) {
      // 描画結果がまだ無い場合でも、空のスライド文書として返せるようにしておく。
      return createSlideHtmlDocument("", "", { userStyle: slideCssData() });
    }

    return createSlideHtmlDocument(renderedSlides.html, renderedSlides.css, {
      userStyle: slideCssData(),
    });
  }

  async function waitForWindowAssets(targetWindow: Window): Promise<void> {
    // 画像やフォントの読み込みが終わる前に印刷すると見た目が崩れるため、
    // 別ウィンドウ側のアセット読み込み完了を待ってから print を呼ぶ。
    if (targetWindow.document.readyState !== "complete") {
      await new Promise<void>((resolve) => {
        targetWindow.addEventListener("load", () => resolve(), { once: true });
      });
    }

    const images = Array.from(targetWindow.document.images).filter((image) => !image.complete);
    await Promise.all(
      images.map(
        (image) =>
          new Promise<void>((resolve) => {
            // load/error のどちらでも待機を終了し、永遠に待ち続けないようにする。
            image.addEventListener("load", () => resolve(), { once: true });
            image.addEventListener("error", () => resolve(), { once: true });
          }),
      ),
    );

    if ("fonts" in targetWindow.document) {
      try {
        await targetWindow.document.fonts.ready;
      } catch {
        console.warn("Failed to wait for document fonts.");
      }
    }

    await new Promise<void>((resolve) => {
      // 2 フレーム待ってレイアウト更新を落ち着かせる。
      targetWindow.requestAnimationFrame(() => {
        targetWindow.requestAnimationFrame(() => resolve());
      });
    });
  }

  return { printOut, exportHtml, openViewer };
}
