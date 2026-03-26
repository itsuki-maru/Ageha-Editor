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
   *
   * - Markdown モード: 一時ポップアップに HTML を書き込み、ブラウザの印刷ダイアログを呼び出す。
   *   window.print() はモーダルブロッキングのため、ダイアログを閉じた時点で完了メッセージを表示する。
   *
   * - スライドモード: 一時 HTML ファイルを保存して Tauri ネイティブウィンドウで開く。
   *   document.writeln() 経由では SVG foreignObject のレンダリングが print() 呼び出しに
   *   間に合わず 0 バイト PDF になる問題があるため、ファイル URL 経由でのロードに切り替える。
   *   load イベント後に window.print() を自動実行し、afterprint 後はオーバーレイを表示して
   *   ユーザーに手動クローズを促す。ウィンドウが閉じられたタイミングで完了メッセージを表示する。
   *   これにより「OS の保存ダイアログと同時にメッセージが出る」問題を回避できる。
   *   afterprint 発火時点では OS の「名前を付けて保存」ダイアログがまだ表示中の可能性があり、
   *   window.close() による自動クローズでは完了タイミングを正確に捉えられないためである。
   */
  async function printOut(): Promise<void> {
    if (editorContent.value === "") {
      showMessage("入力がありません。");
      return;
    }

    if (documentMode.value === "slides") {
      // スライドモード: ファイル URL 経由で開くことで SVG foreignObject の
      // レンダリング完了を load イベントで確実に待てるようにする。
      const baseSlidesHtml = getSlidesDocumentHtml();
      const printHtml = customizeSlideHtmlDocument(baseSlidesHtml, {
        title: "印刷",
        extraStyle: "@media print { html, body { background: #f4f7fb; } }",
      });
      // load 完了後に自動印刷する。
      // afterprint 後は自動クローズせず、オーバーレイを表示してユーザーに手動クローズを促す。
      // 完了メッセージは tauri://destroyed（ウィンドウが実際に閉じられた瞬間）で表示する。
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
            msg.textContent = "保存出力の完了後、このウィンドウを閉じてください。";
            msg.setAttribute("style", "margin:0;font-size:15px;color:#0f172a;letter-spacing:0.02em;");
            ov.appendChild(check);
            ov.appendChild(msg);
            document.body.appendChild(ov);
          });
        <\/script></body>`,
      );
      await openNativeViewer(htmlWithAutoPrint, { title: "印刷", width: 1000, height: 700 }, () =>
        showMessage("出力処理が完了しました。"),
      );
      return;
    }

    // Markdown モード: 印刷専用の一時ウィンドウを開き、完成済みの HTML を流し込む。
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
   * HTML を一時ファイルに保存し、Tauri のネイティブウィンドウ（アドレスバーなし）で開く。
   * ウィンドウが閉じられたタイミングで一時ファイルを自動削除し、onClosed があれば呼び出す。
   * @param onClosed - ウィンドウが破棄されたときに呼ばれるオプションコールバック
   */
  async function openNativeViewer(
    html: string,
    options: { title: string; width?: number; height?: number; maximized?: boolean },
    onClosed?: () => void,
  ): Promise<void> {
    let filePath: string;
    try {
      filePath = await invoke<string>("save_temp_html", { html });
    } catch {
      showMessage("ウィンドウの表示に失敗しました。");
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

    // ウィンドウが閉じられたら一時ファイルを削除し、コールバックがあれば実行する。
    win.once("tauri://destroyed", () => {
      invoke("delete_file", { path: filePath }).catch(console.error);
      onClosed?.();
    });
  }

  /**
   * 現在のプレビュー内容を新しいネイティブウィンドウで表示する（別ウィンドウビューア）。
   */
  async function openViewer(): Promise<void> {
    if (editorContent.value === "") {
      showMessage("入力がありません。");
      return;
    }

    const html = await createViewerHtml();
    await openNativeViewer(html, { title: "Ageha Editor Viewer", width: 1000, height: 700 });
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

    // 通常 Markdown はリソースをすべてインライン化したスタンドアロン HTML を生成する。
    // ネイティブウィンドウでファイルを開く場合、相対パス参照は解決されないため
    // createHtml（KaTeX・Mermaid JS をインライン埋め込み済み）を使う。
    const rendered = await renderMermaidToSvg(parsedHtml.value);
    return createHtml(rendered, cssData());
  }

  /**
   * スライドモード専用: 全画面スライドショーをネイティブウィンドウで開く。
   * Markdown モード時は何もしない。
   */
  async function openSlideshow(): Promise<void> {
    if (documentMode.value !== "slides") return;
    if (editorContent.value === "") {
      showMessage("入力がありません。");
      return;
    }

    const html = createSlideshowHtmlDocument(getSlidesDocumentHtml());
    await openNativeViewer(html, { title: "Ageha Editor Slideshow", maximized: true });
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

  return { printOut, exportHtml, openViewer, openSlideshow };
}
