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
    expect(html).toContain('name="viewport"');
    expect(html).toContain("<h1>Hello</h1>");
    expect(html).toContain("body{color:red;}");
    expect(html).toContain('"Copied!"');
  });

  it("見出し ID から通常 Markdown 用 HTML に目次を埋め込む", () => {
    const html = createHtml(
      '<h1 id="title">Title</h1><h2 id="section">Section</h2><p>body</p>',
      "",
    );

    expect(html).toContain('class="ageha-viewer has-toc"');
    expect(html).toContain('id="ageha-toc-toggle"');
    expect(html).toContain('href="#title"');
    expect(html).toContain('href="#section"');
    expect(html).toContain("目次を隠す");
  });

  it("通常 Markdown 用 HTML にスマートフォン向けレスポンシブスタイルを埋め込む", () => {
    const html = createHtml('<h1 id="title">Title</h1><img src="large.png"><table></table>', "");

    expect(html).toContain("@media (max-width: 720px)");
    expect(html).toContain("body.ageha-viewer img");
    expect(html).toContain("height: auto");
    expect(html).toContain("flex-direction: column");
    expect(html).toContain("order: -1");
  });

  it("スマートフォンでは目次をサイドドロワーとして表示する", () => {
    const html = createHtml('<h1 id="title">Title</h1><p>body</p>', "");

    expect(html).toContain('window.matchMedia("(max-width: 720px)")');
    expect(html).toContain("translateX(calc(100% + 18px))");
    expect(html).toContain("box-shadow: -8px 0 24px");
    expect(html).toContain("body.ageha-viewer.has-toc:not(.toc-collapsed)::before");
    expect(html).toContain("toc.contains(target)");
  });

  it("目次クリック時の画像ロードずれを補正するスクリプトを埋め込む", () => {
    const html = createHtml('<h1 id="title">Title</h1><img src="large.png" loading="lazy">', "");

    expect(html).toContain("function scrollToHeading");
    expect(html).toContain("correctAfterPendingImages");
    expect(html).toContain('image.addEventListener("load"');
    expect(html).toContain('image.addEventListener("error"');
    expect(html).toContain("history.pushState");
    expect(html).toContain('window.addEventListener("load"');
  });

  it("目次対象の見出しがない場合は目次 UI を出さない", () => {
    const html = createHtml("<p>body</p>", "");

    expect(html).toContain('class="ageha-viewer"');
    expect(html).not.toContain('id="ageha-toc-toggle"');
    expect(html).not.toContain('id="ageha-toc"');
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
