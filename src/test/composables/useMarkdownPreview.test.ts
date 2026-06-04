import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick, ref } from "vue";

const mocks = vi.hoisted(() => ({
  mermaidInit: vi.fn(),
  mermaidRender: vi.fn(),
  renderSlides: vi.fn(),
  embedLocalImageSourcesInHtml: vi.fn(async (html: string) =>
    html.replace("local.png", "data:image/png;base64,abc"),
  ),
}));

vi.mock("mermaid", () => ({
  default: {
    initialize: vi.fn(),
    init: mocks.mermaidInit,
    render: mocks.mermaidRender,
  },
}));

vi.mock("@/utils/slideRenderer", () => ({
  renderSlides: mocks.renderSlides,
}));

vi.mock("@/utils/assetPaths", async () => {
  const actual = await vi.importActual<typeof import("@/utils/assetPaths")>("@/utils/assetPaths");
  return {
    ...actual,
    embedLocalImageSourcesInHtml: mocks.embedLocalImageSourcesInHtml,
    toPreviewAssetUrl: (path: string) => `/asset/${path}`,
  };
});

vi.mock("@/i18n", () => ({
  translate: (key: string) => key,
}));

import { mountComposable } from "../testUtils";
import { useMarkdownPreview } from "@/composables/useMarkdownPreview";

describe("useMarkdownPreview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mocks.mermaidRender.mockResolvedValue({ svg: "<svg>graph</svg>" });
    mocks.renderSlides.mockResolvedValue({
      mode: "slides",
      html: '<section id="1"><pre><code class="language-mermaid">graph TD;A-->B;</code></pre></section>',
      css: "section{}",
      metadata: { slideCount: 1 },
    });
  });

  it("Markdown をデバウンス後に HTML 化し、危険なタグを除去する", async () => {
    const editorContent = ref("# Title\n\n<script>alert(1)</script>\n\n![alt](local.png)");
    const { result, unmount } = await mountComposable(() =>
      useMarkdownPreview(editorContent, ref("C:/docs/a.md"), ref(""), ref(true)),
    );

    await vi.advanceTimersByTimeAsync(200);
    await nextTick();

    expect(result.documentMode.value).toBe("markdown");
    expect(result.parsedHtml.value).toContain('<h1 id="title" class="head1">Title</h1>');
    expect(result.parsedHtml.value).not.toContain("<script>");
    expect(result.parsedHtml.value).toContain('src="/asset/local.png"');
    expect(result.previewFrameHtml.value).toBe("");

    unmount();
    vi.useRealTimers();
  });

  it("Markdown レンダリングごとに見出し ID の採番をリセットする", async () => {
    const editorContent = ref("# Title\n\n# Title");
    const { result, unmount } = await mountComposable(() =>
      useMarkdownPreview(editorContent, ref("C:/docs/a.md"), ref(""), ref(true)),
    );

    await vi.advanceTimersByTimeAsync(200);
    await nextTick();

    expect(result.parsedHtml.value).toContain('<h1 id="title" class="head1">Title</h1>');
    expect(result.parsedHtml.value).toContain('<h1 id="title-2" class="head1">Title</h1>');

    editorContent.value = "# Title";
    await nextTick();
    await vi.advanceTimersByTimeAsync(200);
    await nextTick();

    expect(result.parsedHtml.value).toContain('<h1 id="title" class="head1">Title</h1>');
    expect(result.parsedHtml.value).not.toContain('id="title-3"');

    unmount();
    vi.useRealTimers();
  });

  it("エクスポート用 Markdown HTML ではローカル画像の埋め込み処理を使う", async () => {
    const { result, unmount } = await mountComposable(() =>
      useMarkdownPreview(ref("![alt](local.png)"), ref("C:/docs/a.md"), ref(""), ref(false)),
    );

    const html = await result.renderMarkdownHtmlForExport();

    expect(mocks.embedLocalImageSourcesInHtml).toHaveBeenCalled();
    expect(html).toContain("data:image/png;base64,abc");

    unmount();
    vi.useRealTimers();
  });

  it("スライド frontmatter では Marp レンダリング結果から iframe HTML を作る", async () => {
    const markdown = ref("---\nmarp: true\n---\n# Slide");
    const { result, unmount } = await mountComposable(() =>
      useMarkdownPreview(markdown, ref("C:/docs/slide.md"), ref("section{color:red;}"), ref(true)),
    );

    await vi.advanceTimersByTimeAsync(300);
    await nextTick();

    expect(result.documentMode.value).toBe("slides");
    expect(mocks.renderSlides).toHaveBeenCalledWith(markdown.value, "C:/docs/slide.md");
    expect(mocks.mermaidRender).toHaveBeenCalledWith("slide-graph-0", "graph TD;A-->B;");
    expect(result.slideRender.value?.html).toContain(
      '<div class="mermaid-slide"><svg>graph</svg></div>',
    );
    expect(result.previewFrameHtml.value).toContain("Ageha Editor Slides Preview");
    expect(result.previewFrameHtml.value).toContain("color: red");

    unmount();
    vi.useRealTimers();
  });

  it("renderMermaidToSvg は Markdown 内の Mermaid ブロックを SVG に置換する", async () => {
    const { result, unmount } = await mountComposable(() =>
      useMarkdownPreview(ref(""), ref(""), ref(""), ref(false)),
    );

    const html = await result.renderMermaidToSvg('<pre class="mermaid">graph TD;A-->B;</pre>');

    expect(html).toBe("<svg>graph</svg>");
    expect(mocks.mermaidRender).toHaveBeenCalledWith("print-graph-0", "graph TD;A-->B;");

    unmount();
    vi.useRealTimers();
  });
});
