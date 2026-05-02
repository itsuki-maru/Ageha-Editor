import { describe, expect, it } from "vitest";

import {
  createHtml,
  createSlideHtmlDocument,
  createSlideshowHtmlDocument,
  customizeSlideHtmlDocument,
} from "@/utils/htmlTemplate";

describe("htmlTemplate", () => {
  it("通常 Markdown 用 HTML にタイトル、本文、CSS、コピーラベルを埋め込む", () => {
    const html = createHtml("<h1>Hello</h1>", "body{color:red;}", {
      title: '<Ageha "Test">',
      copiedLabel: "Copied!",
    });

    expect(html).toContain("&lt;Ageha &quot;Test&quot;&gt;");
    expect(html).toContain("<h1>Hello</h1>");
    expect(html).toContain("body{color:red;}");
    expect(html).toContain('"Copied!"');
  });

  it("スライド HTML 文書を生成し、タイトルと追加スタイルを差し替えられる", () => {
    const base = createSlideHtmlDocument("<section>Slide</section>", "section{font-size:1em;}", {
      title: "Slides",
      userStyle: "section{color:red;}",
      extraStyle: "body{background:white;}",
    });

    expect(base).toContain("<title>Slides</title>");
    expect(base).toContain("<section>Slide</section>");
    expect(base).toContain("section{font-size:1em;}");
    expect(base).toContain("body{background:white;}");
    expect(base).toContain("open-external");

    const customized = customizeSlideHtmlDocument(base, {
      title: "Print",
      extraStyle: "@media print { body { background:white; } }",
    });

    expect(customized).toContain("<title>Print</title>");
    expect(customized).toContain("@media print");
  });

  it("スライドショー用 UI とスクリプトを注入する", () => {
    const html = createSlideshowHtmlDocument(
      '<html><head></head><body><div class="marpit"></div></body></html>',
    );

    expect(html).toContain("slideshow-wrapper");
    expect(html).toContain("ss-prev");
    expect(html).toContain("showSlide");
  });
});
