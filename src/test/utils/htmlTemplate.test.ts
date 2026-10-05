import { describe, expect, it, vi } from "vitest";

import {
  createHtml,
  createSlideHtmlDocument,
  createSlideshowHtmlDocument,
  customizeSlideHtmlDocument,
} from "@/utils/htmlTemplate";

describe("htmlTemplate", () => {
  it.each([0, 1, 3])("図が %i 個でも軽量な HTML を生成し、変換済み SVG を保持する", (count) => {
    const diagrams = Array.from(
      { length: count },
      (_, index) =>
        `<svg id="diagram-${index}" viewBox="0 0 100 50"><text>Diagram ${index}</text></svg>`,
    ).join("");
    const html = createHtml(`<h1 id="title">Title</h1>${diagrams}`, "body{}");
    const doc = new DOMParser().parseFromString(html, "text/html");

    // 小さい文書へ数 MB の描画ライブラリを再度埋め込む退行を防ぐ。
    expect(new TextEncoder().encode(html).byteLength).toBeLessThan(100_000);
    expect(doc.querySelectorAll("svg")).toHaveLength(count);
    expect(doc.querySelector("#main-content")?.innerHTML).toContain(diagrams);
    expect(doc.head.querySelector("script")).toBeNull();
    expect(html).toContain("navigator.clipboard.writeText");
    expect(doc.querySelector("#ageha-toc")).not.toBeNull();
  });

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

  it("全画面の解除・切替とページ送りを独立して操作できる", async () => {
    const html = createSlideshowHtmlDocument(
      '<html><head></head><body><div class="marpit"><svg viewBox="0 0 1280 720"></svg><svg viewBox="0 0 1280 720"></svg></div></body></html>',
    );
    const doc = new DOMParser().parseFromString(html, "text/html");
    const invoke = vi.fn().mockResolvedValue(false);
    const nativeWindow = {
      innerWidth: 1920,
      innerHeight: 1080,
      addEventListener: vi.fn(),
      __TAURI_INTERNALS__: { invoke, metadata: { currentWindow: { label: "viewer-test" } } },
    };
    new Function("document", "window", doc.querySelector("script")!.textContent!)(
      doc,
      nativeWindow,
    );
    expect(doc.querySelector("#slideshow-wrapper")?.getAttribute("style")).toContain("scale(1.5)");
    doc.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(invoke).toHaveBeenCalledWith("plugin:window|set_fullscreen", {
      label: "viewer-test",
      value: false,
    });
    expect(doc.querySelector("#slide-counter")?.textContent).toBe("1 / 2");
    doc.dispatchEvent(new KeyboardEvent("keydown", { key: "F11" }));
    await vi.waitFor(() =>
      expect(invoke).toHaveBeenCalledWith("plugin:window|set_fullscreen", {
        label: "viewer-test",
        value: true,
      }),
    );
    doc.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
    expect(doc.querySelector("#slide-counter")?.textContent).toBe("2 / 2");
  });
});
