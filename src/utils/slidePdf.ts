/** ネイティブのPDF生成機能で出力するための独立したスライド文書を準備する。 */
export function prepareSlidePdf(html: string): { html: string; width: number; height: number } {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const slides = Array.from(doc.querySelectorAll("div.marpit > svg[data-marpit-svg]"));
  if (!slides.length) throw new Error("No slides to export.");
  const sizes = slides.map((slide) => {
    const viewBox = (slide.getAttribute("viewBox") ?? "")
      .trim()
      .split(/[\s,]+/)
      .map(Number);
    if (
      viewBox.length !== 4 ||
      !viewBox.every(Number.isFinite) ||
      viewBox[2] <= 0 ||
      viewBox[3] <= 0
    ) {
      throw new Error("Invalid slide dimensions.");
    }
    return { width: viewBox[2], height: viewBox[3] };
  });
  const { width, height } = sizes[0];
  if (sizes.some((size) => size.width !== width || size.height !== height)) {
    throw new Error("All slides must have the same dimensions.");
  }
  const style = doc.createElement("style");
  style.textContent = `
    @page { size: ${width}px ${height}px !important; margin: 0 !important; }
    @media print {
      html, body { margin: 0 !important; padding: 0 !important; min-height: 0 !important; }
      div.marpit { margin: 0 !important; padding: 0 !important; }
      div.marpit > svg[data-marpit-svg] {
        display: block !important; width: ${width}px !important; height: ${height}px !important;
        margin: 0 !important; padding: 0 !important; border: 0 !important;
        break-inside: avoid; break-after: page;
      }
      div.marpit > svg[data-marpit-svg]:last-child { break-after: auto; }
    }`;
  doc.head.appendChild(style);
  for (const img of Array.from(doc.images)) {
    img.setAttribute("loading", "eager");
    img.setAttribute("decoding", "sync");
  }
  const ready = doc.createElement("script");
  ready.textContent = `
    window.__agehaPdfState = "loading";
    window.addEventListener("load", async function () {
      try {
        await document.fonts.ready;
        await Promise.all(Array.from(document.images).map(function (image) {
          return image.decode();
        }));
        // 非表示のウィンドウではrequestAnimationFrameが停止する場合があるため、印刷前にレイアウトを確定する。
        document.body.getBoundingClientRect();
        await new Promise(function (resolve) { setTimeout(resolve, 100); });
        window.__agehaPdfState = "ready";
      } catch (_) { window.__agehaPdfState = "error"; }
    }, { once: true });`;
  doc.body.appendChild(ready);
  return { html: "<!DOCTYPE html>\n" + doc.documentElement.outerHTML, width, height };
}
