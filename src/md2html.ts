import { invoke } from "@tauri-apps/api/core";
import { setLocale } from "@/i18n";
import type { RustArgsInit } from "@/interface";
import { normalizeSavedSettings } from "@/stores/localStorages";
import { detectDocumentMode } from "@/utils/documentMode";
import {
  renderMarkdownHtml,
  renderMermaidToSvg,
  renderSlidesDocument,
} from "@/utils/documentRenderer";
import { createSavedHtml } from "@/utils/htmlExport";
import { resolveStylePack } from "@/utils/stylePacks";
import "@/style.css";
import "@/github.css";
import "katex/dist/katex.min.css";

type ExportInput = Omit<RustArgsInit, "status"> & { saved_settings: unknown };

async function convert(): Promise<string> {
  const input = await invoke<ExportInput>("md2html_input");
  const settings = normalizeSavedSettings(input.saved_settings);
  setLocale(settings.localeFromLocalStorage ?? "ja");
  const { text_data: markdown, file_abs_path: filePath, css_data, slide_css_data } = input;
  const styles = resolveStylePack(settings.stylePackFromLocalStorage, css_data, slide_css_data);
  // Mermaid は実際の文書上で文字を計測するため、SVG 生成時のスタイルを
  // エディタにそろえ、非表示の描画処理でも同じレイアウトを再現する。
  const style = document.createElement("style");
  style.id = "user-css";
  style.textContent = styles.previewCss;
  document.head.appendChild(style);
  return createSavedHtml(
    detectDocumentMode(markdown),
    () => styles.markdownCss,
    async () =>
      renderMermaidToSvg(
        await renderMarkdownHtml(markdown, filePath, {
          embedLocalImages: true,
        }),
      ),
    () => renderSlidesDocument(markdown, filePath, styles.slideCss),
  );
}

void convert().then(
  (html) => invoke("md2html_result", { result: { Ok: html } }),
  (error) => invoke("md2html_result", { result: { Err: String(error) } }),
);
