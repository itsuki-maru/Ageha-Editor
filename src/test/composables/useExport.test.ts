import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  webviewOnce: vi.fn(),
  save: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({ save: mocks.save }));

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

import { resolveStylePack } from "@/utils/stylePacks";
import { useExport } from "@/composables/useExport";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";

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
      ref(
        '<html><head></head><body><div class="marpit"><svg data-marpit-svg="" viewBox="0 0 1280 720"><foreignObject><section id="1"></section></foreignObject></svg></div></body></html>',
      ),
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
    expect(WebviewWindow).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ fullscreen: true }),
    );
  });

  it("PDF保存のキャンセル時には出力せず、処理中状態を解除する", async () => {
    mocks.save.mockResolvedValue(null);
    const { subject, showMessage } = createSubject("slides");
    await subject.exportPdf();
    expect(mocks.invoke).not.toHaveBeenCalled();
    expect(showMessage).not.toHaveBeenCalled();
    expect(subject.isExportingPdf.value).toBe(false);
  });

  it("PDFの完了を待ち、同時保存を防ぐ", async () => {
    mocks.save.mockResolvedValue("C:/slides.pdf");
    let finish!: () => void;
    mocks.invoke.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const { subject, showMessage } = createSubject("slides");
    const pending = subject.exportPdf();
    await vi.waitFor(() =>
      expect(mocks.invoke).toHaveBeenCalledWith("export_slide_pdf", {
        path: "C:/slides.pdf",
        width: 1280,
        height: 720,
        html: expect.stringContaining("__agehaPdfState"),
      }),
    );
    expect(subject.isExportingPdf.value).toBe(true);
    expect(showMessage).not.toHaveBeenCalled();
    await subject.exportPdf();
    expect(mocks.save).toHaveBeenCalledOnce();
    finish();
    await pending;
    expect(showMessage).toHaveBeenCalledWith("export.exportComplete");
    expect(subject.isExportingPdf.value).toBe(false);
  });

  it("PDF失敗時には成功表示をせず、再試行できる", async () => {
    mocks.save.mockResolvedValue("C:/slides.pdf");
    mocks.invoke.mockRejectedValueOnce(new Error("PDF rendering failed"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { subject, showMessage } = createSubject("slides");
    await subject.exportPdf();
    expect(showMessage).toHaveBeenCalledWith("export.pdfError");
    expect(showMessage).not.toHaveBeenCalledWith("export.exportComplete");
    expect(subject.isExportingPdf.value).toBe(false);
  });

  it.each([
    "@page { size: A4; margin: 1mm; } body { padding: 30px; }",
    ...["simple", "dark", "paper"].map((pack) => resolveStylePack(pack, "", "").markdownCss),
  ])("prints the selected CSS with its scope and print margins", async (legacyCss) => {
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
    expect(printedHtml).toContain('<body id="ageha-document">');
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
  it.each(["dark", "paper", "simple"])(
    "passes %s output CSS to the viewer and export",
    async (pack) => {
      mocks.invoke.mockResolvedValue("C:/tmp/viewer.html");
      const css = resolveStylePack(pack, "", "").markdownCss;
      const { subject, saveHtmlFile } = createSubject("markdown", "# Title", css);
      await subject.openViewer();
      const viewerHtml = mocks.invoke.mock.calls.find((call) => call[0] === "save_temp_html")![1]
        .html;
      expect(viewerHtml).toContain(css);
      expect(viewerHtml).toContain('id="ageha-document"');
      await subject.exportHtml();
      expect(saveHtmlFile.mock.calls[0][0]).toContain(css);
      expect(saveHtmlFile.mock.calls[0][0]).toContain('id="ageha-document"');
    },
  );
});
