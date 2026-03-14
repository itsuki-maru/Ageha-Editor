import { type Ref } from "vue";
import type { DocumentMode, SlideRenderResult } from "@/interface";
import {
  createHtml,
  createSlideHtmlDocument,
  customizeSlideHtmlDocument,
} from "../utils/htmlTemplate";

// 印刷・HTML エクスポート・別ウィンドウ表示の 3 つの出力先を管理する composable。
// Markdown モードとスライドモードで処理を分岐しつつ、
// 呼び出し口（printOut / exportHtml / openViewer）はモードに依らず統一している。
//
// スライドモードの出力は iframe プレビューで使っている HTML をそのまま再利用する。
// これにより「プレビューと印刷/エクスポート結果が一致する」ことを保証できる。

export function useExport(
  editorContent: Ref<string>,
  documentMode: Ref<DocumentMode>,
  parsedHtml: Ref<string>,
  previewFrameHtml: Ref<string>,
  slideRender: Ref<SlideRenderResult | null>,
  /** 現在の Markdown 用 CSS（ageha.css）を返すコールバック */
  cssData: () => string,
  /** 現在のスライド用 CSS（ageha-slide.css）を返すコールバック */
  slideCssData: () => string,
  /** Markdown モード用: `.mermaid` ブロックを SVG に変換するコールバック */
  renderMermaidToSvg: (html: string) => Promise<string>,
  /** HTML ファイルの保存ダイアログを開いて保存するコールバック */
  saveHtmlFile: (htmlContent: string) => Promise<void>,
  /** ユーザーへメッセージを表示するコールバック */
  showMessage: (msg: string) => void,
) {
  /**
   * 印刷 / PDF 出力を実行する。
   * 一時的な新規ウィンドウに HTML を書き込み、ブラウザの印刷ダイアログを呼び出す。
   * フォント・画像の読み込み完了を待ってから印刷するため、ちらつきが起きにくい。
   */
  async function printOut(): Promise<void> {
    if (editorContent.value === "") {
      showMessage("入力がありません。");
      return;
    }

    // 印刷専用の一時ウィンドウを開き、完成済みの HTML を流し込む。
    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) return;

    const html = await createExportHtml(true);
    printWindow.document.writeln(html);
    printWindow.document.close();
    // フォントや画像のロードを待ってから印刷することで崩れを防ぐ。
    await waitForWindowAssets(printWindow);
    printWindow.focus();
    printWindow.print();
    // 印刷ダイアログを閉じたらウィンドウも自動で閉じる。
    printWindow.close();
  }

  /**
   * 現在の内容をスタンドアロン HTML ファイルとしてエクスポートする。
   * 保存先はダイアログで指定する。
   */
  async function exportHtml(): Promise<void> {
    if (editorContent.value === "") {
      showMessage("入力がありません。");
      return;
    }

    // 保存用 HTML は印刷向けではなく通常閲覧向けで生成する（isPrint = false）。
    const html = await createExportHtml(false);
    await saveHtmlFile(html);
  }

  /**
   * 現在のプレビュー内容を新しいウィンドウで表示する（別ウィンドウビューア）。
   * 印刷とは異なり、ウィンドウを閉じずそのまま閲覧に使える。
   */
  async function openViewer(): Promise<void> {
    if (editorContent.value === "") {
      showMessage("入力がありません。");
      return;
    }

    // 閲覧用の大きめウィンドウを開く。
    const viewerWindow = window.open("", "_blank", "width=1000,height=700");
    if (!viewerWindow) return;

    const html = await createViewerHtml();
    viewerWindow.document.writeln(html);
    viewerWindow.document.close();
  }

  /**
   * エクスポート・印刷用の完全な HTML 文字列を生成して返す。
   * モードによって処理を分岐する。
   * @param isPrint - true: 印刷用（@media print スタイルを追加する） / false: HTML 保存用
   */
  async function createExportHtml(isPrint: boolean): Promise<string> {
    if (documentMode.value === "slides") {
      // スライドは iframe プレビューで使っている HTML をそのまま再利用する。
      // プレビューと出力結果の見た目が一致することをここで保証する。
      const baseSlidesHtml = getSlidesDocumentHtml();
      return customizeSlideHtmlDocument(baseSlidesHtml, {
        title: isPrint ? "印刷" : "Ageha Editor Slides",
        // 印刷時だけ背景色を明示して白紙にならないようにする。
        extraStyle: isPrint ? "@media print { html, body { background: #f4f7fb; } }" : undefined,
      });
    }

    // Markdown モード: エクスポート前に Mermaid ダイアグラムを静的 SVG へ変換する。
    // プレビューでは mermaid.init() が動的に描画しているが、
    // 別ウィンドウや保存 HTML では Mermaid の JS が動作しないため事前変換が必要。
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

    // HTML エクスポート: KaTeX CSS・Mermaid JS をインラインで含んだスタンドアロン HTML を生成する。
    return createHtml(rendered, cssData());
  }

  /**
   * 別ウィンドウビューア用の完全な HTML 文字列を生成して返す。
   * 印刷用と異なり、@media print スタイルは付けない。
   */
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

  /**
   * スライドモードの基盤 HTML 文書を取得して返す。
   * previewFrameHtml（プレビューと同一の完全 HTML）があればそれを最優先し、
   * なければ slideRender の結果から再構築する。
   */
  function getSlidesDocumentHtml(): string {
    if (previewFrameHtml.value) {
      // プレビューで使用中の HTML が最も新しい状態なのでそれを使う。
      return previewFrameHtml.value;
    }

    const renderedSlides = slideRender.value;
    if (!renderedSlides) {
      // 描画結果が取得できていない場合（デバウンス待ち等）は空のスライド文書を返す。
      return createSlideHtmlDocument("", "", { userStyle: slideCssData() });
    }

    // キャッシュが失効している場合はレンダリング結果から再構築する。
    return createSlideHtmlDocument(renderedSlides.html, renderedSlides.css, {
      userStyle: slideCssData(),
    });
  }

  /**
   * 別ウィンドウ内のアセット（フォント・画像）の読み込み完了を待つユーティリティ。
   * 読み込みが終わる前に print() を呼ぶとフォントや画像が崩れるため、
   * 印刷前に必ずこの関数で待機する。
   * @param targetWindow - 待機対象のウィンドウ
   */
  async function waitForWindowAssets(targetWindow: Window): Promise<void> {
    // ドキュメント全体の読み込みを待つ。
    if (targetWindow.document.readyState !== "complete") {
      await new Promise<void>((resolve) => {
        targetWindow.addEventListener("load", () => resolve(), { once: true });
      });
    }

    // まだロードが終わっていない個々の画像を待つ。
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

    // フォントの読み込みが完了するまで待機する。
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

  return { printOut, exportHtml, openViewer };
}
