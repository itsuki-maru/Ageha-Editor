import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: mocks.invoke,
  convertFileSrc: (path: string) => `asset://${path}`,
}));
vi.mock("mermaid", () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn(async () => ({ svg: '<svg id="diagram"><text>Diagram</text></svg>' })),
  },
}));
vi.mock("@tauri-apps/plugin-dialog", () => ({ save: vi.fn() }));
vi.mock("@tauri-apps/api/webviewWindow", () => ({ WebviewWindow: vi.fn() }));

afterEach(() => {
  vi.restoreAllMocks();
});

describe("md2html", () => {
  it.each([
    [
      "Markdown",
      "# Title\n\n![Image](image.png)\n\n$E=mc^2$\n\n~~~text\ncode\n~~~\n\n~~~mermaid\ngraph LR; A-->B\n~~~",
    ],
    [
      "slides",
      "---\nmarp: true\n---\n# Title\n\n![Image](image.png)\n\n---\n$E=mc^2$\n\n~~~mermaid\ngraph LR; A-->B\n~~~",
    ],
  ])("matches GUI HTML export for %s with saved preferences", async (_mode, markdown) => {
    vi.resetModules();
    mocks.invoke.mockReset();
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const input = {
      file_abs_path: "C:/documents/source.md",
      text_data: markdown,
      css_data: "body { color: purple; }",
      slide_css_data: "section { color: purple; }",
      saved_settings: { localeFromLocalStorage: "en", stylePackFromLocalStorage: "dark" },
    };
    mocks.invoke.mockImplementation(async (command: string) => {
      if (command === "md2html_input") return input;
      if (command === "read_binary_file_data_url") return "data:image/png;base64,aW1hZ2U=";
    });

    await import("@/md2html");
    await vi.waitFor(
      () => {
        expect(mocks.invoke).toHaveBeenCalledWith("md2html_result", {
          result: { Ok: expect.any(String) },
        });
      },
      { timeout: 10000 },
    );
    const cliHtml = mocks.invoke.mock.calls.find(([command]) => command === "md2html_result")![1]
      .result.Ok;

    const { ref, nextTick } = await import("vue");
    const { useMarkdownPreview } = await import("@/composables/useMarkdownPreview");
    const { useExport } = await import("@/composables/useExport");
    const { resolveStylePack } = await import("@/utils/stylePacks");
    const styles = resolveStylePack("dark", input.css_data, input.slide_css_data);
    const content = ref(markdown);
    const preview = useMarkdownPreview(
      content,
      ref(input.file_abs_path),
      ref(styles.slideCss),
      ref(false),
    );
    await nextTick();
    const saveHtmlFile = vi.fn(async (_html: string) => {});
    const subject = useExport(
      content,
      preview.documentMode,
      preview.parsedHtml,
      preview.previewFrameHtml,
      preview.slideRender,
      () => styles.markdownCss,
      () => styles.slideCss,
      preview.renderMermaidToSvg,
      preview.renderMarkdownHtmlForExport,
      preview.renderMarkdownHtmlForViewer,
      saveHtmlFile,
      vi.fn(),
      preview.renderSlidesDocumentForExport,
    );
    await subject.exportHtml();

    expect(saveHtmlFile).toHaveBeenCalledWith(cliHtml);
    expect(cliHtml).toContain("data:image/png;base64,aW1hZ2U=");
    expect(cliHtml).toContain('<svg id="diagram">');
    expect(cliHtml).toContain("katex");
  });
});
