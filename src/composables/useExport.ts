import { type Ref } from "vue";
import type { DocumentMode, SlideRenderResult } from "@/interface";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import {
  createHtml,
  createSlideHtmlDocument,
  createSlideshowHtmlDocument,
  customizeSlideHtmlDocument,
} from "../utils/htmlTemplate";
import { translate } from "@/i18n";

export function useExport(
  editorContent: Ref<string>,
  documentMode: Ref<DocumentMode>,
  parsedHtml: Ref<string>,
  previewFrameHtml: Ref<string>,
  slideRender: Ref<SlideRenderResult | null>,
  cssData: () => string,
  slideCssData: () => string,
  renderMermaidToSvg: (html: string) => Promise<string>,
  /** Markdown モード用: 出力向けにローカル画像を data URL 化した HTML を生成するコールバック */
  renderMarkdownHtmlForExport: () => Promise<string>,
  /** Markdown モード用: 別ウィンドウ向けに軽量な HTML を生成するコールバック */
  renderMarkdownHtmlForViewer: () => Promise<string>,
  saveHtmlFile: (htmlContent: string) => Promise<void>,
  showMessage: (msg: string) => void,
) {
  // SVG foreignObject の描画前に印刷される問題を避けるため、スライドはファイル URL で開く。
  async function printOut(): Promise<void> {
    if (editorContent.value === "") {
      showMessage(translate("editor.emptyInput"));
      return;
    }

    if (documentMode.value === "slides") {
      const baseSlidesHtml = getSlidesDocumentHtml();
      const printHtml = customizeSlideHtmlDocument(baseSlidesHtml, {
        title: translate("export.printTitle"),
        extraStyle: "@media print { html, body { background: #f4f7fb; } }",
      });
      // afterprint 時点では OS の保存ダイアログが開いている場合があるため、
      // 自動クローズせず、ウィンドウ破棄時に完了を通知する。
      const htmlWithAutoPrint = printHtml.replace(
        "</body>",
        `<script>
          window.addEventListener("load", function () {
            window.print();
          });
          window.addEventListener("afterprint", function () {
            const ov = document.createElement("div");
            ov.setAttribute("style",
              "position:fixed;inset:0;z-index:9999;" +
              "display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;" +
              "background:rgba(244,247,251,0.97);" +
              "font-family:'Aptos','Segoe UI','Hiragino Sans','Yu Gothic UI',sans-serif;"
            );
            const check = document.createElement("div");
            check.textContent = "✓";
            check.setAttribute("style", "font-size:56px;line-height:1;color:#4361ee;");
            const msg = document.createElement("p");
            msg.textContent = ${JSON.stringify(translate("export.printOverlay"))};
            msg.setAttribute("style", "margin:0;font-size:15px;color:#0f172a;letter-spacing:0.02em;");
            ov.appendChild(check);
            ov.appendChild(msg);
            document.body.appendChild(ov);
          });
        <\/script></body>`,
      );
      await openNativeViewer(
        htmlWithAutoPrint,
        { title: translate("export.printTitle"), width: 1000, height: 700 },
        () => showMessage(translate("export.exportComplete")),
      );
      return;
    }

    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) return;

    try {
      const html = await createExportHtml(true);
      printWindow.document.writeln(html);
      printWindow.document.close();
      // フォントや画像のロードを待ってから印刷することで崩れを防ぐ。
      await waitForWindowAssets(printWindow);
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    } catch (error) {
      printWindow.close();
      console.error("Failed to print markdown document:", error);
      showMessage(translate("export.viewerOpenError"));
    }
  }

  async function exportHtml(): Promise<void> {
    if (editorContent.value === "") {
      showMessage(translate("editor.emptyInput"));
      return;
    }

    const html = await createExportHtml(false);
    await saveHtmlFile(html);
  }

  async function openNativeViewer(
    html: string,
    options: { title: string; width?: number; height?: number; maximized?: boolean },
    onClosed?: () => void,
  ): Promise<void> {
    let filePath: string;
    try {
      filePath = await invoke<string>("save_temp_html", { html });
    } catch {
      showMessage(translate("export.viewerOpenError"));
      return;
    }

    const label = `viewer-${Date.now()}`;
    const win = new WebviewWindow(label, {
      url: convertFileSrc(filePath),
      title: options.title,
      width: options.width,
      height: options.height,
      maximized: options.maximized,
    });

    win.once("tauri://destroyed", () => {
      invoke("delete_file", { path: filePath }).catch(console.error);
      onClosed?.();
    });
  }

  async function openViewer(): Promise<void> {
    if (editorContent.value === "") {
      showMessage(translate("editor.emptyInput"));
      return;
    }

    try {
      const html = await createViewerHtml();
      await openNativeViewer(html, {
        title: translate("export.viewerTitle"),
        width: 1000,
        height: 700,
      });
    } catch (error) {
      console.error("Failed to open viewer:", error);
      showMessage(translate("export.viewerOpenError"));
    }
  }

  /** isPrint が true の場合は印刷用スタイルを追加する。 */
  async function createExportHtml(isPrint: boolean): Promise<string> {
    if (documentMode.value === "slides") {
      const baseSlidesHtml = getSlidesDocumentHtml();
      return customizeSlideHtmlDocument(baseSlidesHtml, {
        title: isPrint ? translate("export.printTitle") : translate("export.slidesTitle"),
        // 印刷時だけ背景色を明示して白紙にならないようにする。
        extraStyle: isPrint ? "@media print { html, body { background: #f4f7fb; } }" : undefined,
      });
    }

    // Markdown モード: エクスポート前に Mermaid ダイアグラムを静的 SVG へ変換する。
    // プレビューでは mermaid.init() が動的に描画しているが、
    // 別ウィンドウや保存 HTML では Mermaid の JS が動作しないため事前変換が必要。
    const markdownHtml = await renderMarkdownHtmlForExport();
    const rendered = await renderMermaidToSvg(markdownHtml);
    if (isPrint) {
      const printReadyHtml = forceEagerImageLoading(rendered);
      return `<html>
        <head>
          <meta charset="UTF-8">
          <title>${translate("export.printTitle")}</title>
          <link rel="stylesheet" href="katex.css">
          <style>${cssData()}
            @media print {
              /* 本文の padding は改ページ後に繰り返されないため、用紙側で余白を確保する。
                 保存済みの ageha.css にある旧設定よりも印刷用の設定を優先する。 */
              @page { margin: 10mm !important; }
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                transform: none !important;
              }
              button.copy-btn { display: none !important; }
              iframe { display: none !important; }
            }
          </style>
        </head>
        <body>${printReadyHtml}</body>
      </html>`;
    }

    return createHtml(rendered, cssData(), {
      title: translate("export.viewerTitle"),
      copiedLabel: translate("common.copied"),
    });
  }

  async function createViewerHtml(): Promise<string> {
    if (documentMode.value === "slides") {
      return customizeSlideHtmlDocument(getSlidesDocumentHtml(), {
        title: translate("export.slidesTitle"),
      });
    }

    // 別ウィンドウ表示は即時性を優先し、プレビュー表示中なら現在の HTML を再利用する。
    // プレビュー非表示などで HTML が無い場合も、data URL 化を避けた軽量 HTML を生成する。
    const markdownHtml = parsedHtml.value || (await renderMarkdownHtmlForViewer());
    const rendered = await renderMermaidToSvg(markdownHtml);
    return createHtml(rendered, cssData(), {
      title: translate("export.viewerTitle"),
      copiedLabel: translate("common.copied"),
    });
  }

  async function openSlideshow(): Promise<void> {
    if (documentMode.value !== "slides") return;
    if (editorContent.value === "") {
      showMessage(translate("editor.emptyInput"));
      return;
    }

    const html = createSlideshowHtmlDocument(getSlidesDocumentHtml());
    await openNativeViewer(html, { title: translate("export.slideshowTitle"), maximized: true });
  }

  function getSlidesDocumentHtml(): string {
    if (previewFrameHtml.value) {
      return previewFrameHtml.value;
    }

    const renderedSlides = slideRender.value;
    if (!renderedSlides) {
      // 描画結果が取得できていない場合（デバウンス待ち等）は空のスライド文書を返す。
      return createSlideHtmlDocument("", "", { userStyle: slideCssData() });
    }

    return createSlideHtmlDocument(renderedSlides.html, renderedSlides.css, {
      userStyle: slideCssData(),
    });
  }

  async function waitForWindowAssets(targetWindow: Window): Promise<void> {
    if (targetWindow.document.readyState !== "complete") {
      await new Promise<void>((resolve) => {
        targetWindow.addEventListener("load", () => resolve(), { once: true });
      });
    }

    // load / error のどちらでも待機を終了し、永遠に待ち続けないようにする。
    const images = Array.from(targetWindow.document.images).filter((image) => !image.complete);
    await Promise.all(
      images.map(
        (image) =>
          new Promise<void>((resolve) => {
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

    // 2 フレーム待ってレイアウトの更新を落ち着かせてから印刷する。
    // これにより SVG や flexbox のレイアウト崩れを軽減できる。
    await new Promise<void>((resolve) => {
      targetWindow.requestAnimationFrame(() => {
        targetWindow.requestAnimationFrame(() => resolve());
      });
    });
  }

  /**
   * 通常プレビューでは画像の遅延読み込みを使うが、印刷時は全画像を事前ロードしたい。
   * `loading="lazy"` が残ると画面外の画像が印刷に間に合わないことがあるため、
   * 印刷用 HTML だけ eager に差し替える。
   */
  function forceEagerImageLoading(html: string): string {
    const container = document.createElement("div");
    container.innerHTML = html;

    for (const image of Array.from(container.querySelectorAll("img"))) {
      image.loading = "eager";
      image.decoding = "sync";
    }

    return container.innerHTML;
  }

  return { printOut, exportHtml, openViewer, openSlideshow };
}
