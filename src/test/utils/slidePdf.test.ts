import { describe, expect, it } from "vitest";
import { prepareSlidePdf } from "@/utils/slidePdf";

function documentWithSlides(...sizes: string[]) {
  return `<html><head><style>@page { size: A4; margin: 10mm }</style></head><body><div class="marpit">${sizes
    .map(
      (size) =>
        `<svg data-marpit-svg="" viewBox="0 0 ${size}"><foreignObject><section><h1>日本語</h1><img loading="lazy" src="data:image/png;base64,test" /></section></foreignObject></svg>`,
    )
    .join("")}</div></body></html>`;
}

describe("prepareSlidePdf", () => {
  it.each([
    [1280, 720],
    [960, 720],
  ])("uses the slide's %s × %s dimensions, after custom styles", (width, height) => {
    const original = documentWithSlides(`${width} ${height}`, `${width} ${height}`);
    const result = prepareSlidePdf(original);
    const doc = new DOMParser().parseFromString(result.html, "text/html");
    expect(result.width).toBe(width);
    expect(result.height).toBe(height);
    expect(doc.head.querySelector("style:last-of-type")?.textContent).toContain(
      `size: ${width}px ${height}px !important; margin: 0 !important`,
    );
    expect(doc.querySelectorAll("div.marpit > svg")).toHaveLength(2);
    expect(doc.querySelector("section h1")?.textContent).toBe("日本語");
    expect(doc.querySelector("img")?.getAttribute("loading")).toBe("eager");
    expect(original).toContain('loading="lazy"');
    expect(result.html).toContain("document.fonts.ready");
    expect(result.html).toContain("image.decode()");
  });

  it.each([[], ["0 720"], ["1280 NaN"], ["1280 720", "960 720"]])(
    "rejects invalid or mixed slide sizes: %j",
    (...sizes) => {
      expect(() => prepareSlidePdf(documentWithSlides(...sizes))).toThrow();
    },
  );
});
