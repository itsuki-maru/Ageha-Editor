import { translate } from "@/i18n";
import type { DocumentMode } from "@/interface";
import { createHtml, customizeSlideHtmlDocument } from "@/utils/htmlTemplate";

export async function createSavedHtml(
  mode: DocumentMode,
  markdownCss: () => string,
  renderMarkdown: () => Promise<string>,
  renderSlideDocument: () => Promise<string>,
): Promise<string> {
  if (mode === "slides") {
    return customizeSlideHtmlDocument(await renderSlideDocument(), {
      title: translate("export.slidesTitle"),
    });
  }

  return createHtml(await renderMarkdown(), markdownCss(), {
    title: translate("export.viewerTitle"),
    copiedLabel: translate("common.copied"),
  });
}
