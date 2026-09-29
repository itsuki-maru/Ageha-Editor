import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  webviewOnce: vi.fn(),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: mocks.invoke,
  convertFileSrc: (path: string) => `asset://${path}`,
}));

vi.mock("@tauri-apps/api/webviewWindow", () => ({
  WebviewWindow: vi.fn().mockImplementation(function () {
    return { once: mocks.webviewOnce };
  }),
}));

vi.mock("@/i18n", () => ({
  translate: (key: string) => key,
}));

import { useExport } from "@/composables/useExport";

describe("useExport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function createSubject(
    mode: "markdown" | "slides" = "markdown",
    content = "# Title",
    css = "body{}",
  ) {
    const showMessage = vi.fn();
    const saveHtmlFile = vi.fn();
    const subject = useExport(
      ref(content),
      ref(mode),
      ref("<h1>Title</h1>"),
      ref('<html><body><section id="1"></section></body></html>'),
      ref({
        mode: "slides",
        html: '<section id="1"></section>',
        css: "section{}",
        metadata: { slideCount: 1 },
      }),
      () => css,
      () => "section{}",
      async (html) => html.replace("mermaid", "svg"),
      async () => "<p>export</p>",
      async () => "<p>viewer</p>",
      saveHtmlFile,
      showMessage,
    );
    return { subject, showMessage, saveHtmlFile };
  }

  it("空の入力では出力処理を止めてメッセージを表示する", async () => {
    const { subject, showMessage, saveHtmlFile } = createSubject("markdown", "");

    await subject.exportHtml();
    await subject.openViewer();

    expect(showMessage).toHaveBeenCalledWith("editor.emptyInput");
    expect(saveHtmlFile).not.toHaveBeenCalled();
    expect(mocks.invoke).not.toHaveBeenCalled();
  });

  it("Markdown HTML を生成して保存コールバックへ渡す", async () => {
    const { subject, saveHtmlFile } = createSubject();

    await subject.exportHtml();

    expect(saveHtmlFile).toHaveBeenCalledOnce();
    expect(saveHtmlFile.mock.calls[0][0]).toContain("<p>export</p>");
    expect(saveHtmlFile.mock.calls[0][0]).toContain("<style>body{}");
  });

  it("スライドショーはスライドモードのときだけネイティブビューアを開く", async () => {
    mocks.invoke.mockResolvedValue("C:/tmp/viewer.html");
    const { subject } = createSubject("slides");

    await subject.openSlideshow();

    expect(mocks.invoke).toHaveBeenCalledWith("save_temp_html", {
      html: expect.stringContaining("slideshow-wrapper"),
    });
    expect(mocks.webviewOnce).toHaveBeenCalledWith("tauri://destroyed", expect.any(Function));
  });

  it("既存 CSS のページ余白を印刷時だけ上書きし、HTML 保存には印刷専用設定を混入させない", async () => {
    const legacyCss = "@page { size: A4; margin: 1mm; } body { padding: 30px; }";
    const { subject, saveHtmlFile } = createSubject("markdown", "# Title", legacyCss);
    const popup = {
      document: {
        writeln: vi.fn(),
        close: vi.fn(),
        readyState: "complete",
        images: [],
        fonts: { ready: Promise.resolve() },
      },
      requestAnimationFrame: (callback: FrameRequestCallback) => {
        callback(0);
        return 0;
      },
      focus: vi.fn(),
      print: vi.fn(),
      close: vi.fn(),
    };
    vi.spyOn(window, "open").mockReturnValue(popup as unknown as Window);

    await subject.printOut();

    const printedHtml = popup.document.writeln.mock.calls[0][0] as string;
    expect(printedHtml).toContain(legacyCss);
    expect(printedHtml).toMatch(/@media print\s*\{[\s\S]*@page\s*\{\s*margin: 10mm !important;/);
    expect(printedHtml).toMatch(
      /html, body\s*\{\s*margin: 0 !important;\s*padding: 0 !important;\s*transform: none !important;/,
    );
    expect(printedHtml).not.toContain("scale(0.9)");
    expect(printedHtml).toContain("<p>export</p>");
    expect(popup.print).toHaveBeenCalledOnce();
    expect(popup.close).toHaveBeenCalledOnce();

    await subject.exportHtml();

    const savedHtml = saveHtmlFile.mock.calls[0][0] as string;
    expect(savedHtml).toContain(legacyCss);
    expect(savedHtml).not.toContain("margin: 10mm !important;");
    expect(savedHtml).not.toContain("transform: none !important;");
  });
});
