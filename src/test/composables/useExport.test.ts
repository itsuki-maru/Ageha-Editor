import { beforeEach, describe, expect, it, vi } from "vitest";
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
  WebviewWindow: vi.fn().mockImplementation(() => ({
    once: mocks.webviewOnce,
  })),
}));

vi.mock("@/i18n", () => ({
  translate: (key: string) => key,
}));

import { useExport } from "@/composables/useExport";

describe("useExport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createSubject(mode: "markdown" | "slides" = "markdown", content = "# Title") {
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
      () => "body{}",
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
});
