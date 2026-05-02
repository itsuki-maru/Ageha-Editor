import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  open: vi.fn(),
  save: vi.fn(),
  confirm: vi.fn(),
  invoke: vi.fn(),
  setTitle: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: mocks.open,
  save: mocks.save,
  confirm: mocks.confirm,
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: mocks.invoke,
}));

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({ setTitle: mocks.setTitle }),
}));

vi.mock("@/i18n", () => ({
  translate: (key: string) => key,
}));

import { nextTick } from "vue";

import { useFileOperations } from "@/composables/useFileOperations";

describe("useFileOperations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("読み込んだ内容を反映し、変更追跡で未保存マークを付け外しする", async () => {
    let editorContent = "";
    const ops = useFileOperations(
      () => editorContent,
      (text) => {
        editorContent = text;
      },
      vi.fn(),
    );

    ops.loadContent("hello", "C:/docs/a.md");
    await nextTick();

    expect(editorContent).toBe("hello");
    expect(ops.activeFilePath.value).toBe("C:/docs/a.md");
    expect(ops.isEdit.value).toBe(false);
    expect(mocks.setTitle).toHaveBeenLastCalledWith("C:/docs/a.md");

    ops.trackChange("hello!");
    expect(ops.activeFilePath.value).toBe("*C:/docs/a.md");
    expect(ops.isEdit.value).toBe(true);

    ops.trackChange("hello");
    expect(ops.activeFilePath.value).toBe("C:/docs/a.md");
    expect(ops.isEdit.value).toBe(false);
  });

  it("fileOpen は未保存確認、ファイル選択、Rust 読み込みを順に実行する", async () => {
    let editorContent = "old";
    mocks.confirm.mockResolvedValue(true);
    mocks.open.mockResolvedValue("C:/docs/open.md");
    mocks.invoke.mockResolvedValue({ text_data: "new text" });

    const ops = useFileOperations(
      () => editorContent,
      (text) => {
        editorContent = text;
      },
      vi.fn(),
    );
    ops.loadContent("old", "C:/docs/current.md");
    ops.trackChange("dirty");

    await ops.fileOpen();

    expect(mocks.confirm).toHaveBeenCalledWith("dialog.unsavedMessage", {
      title: "dialog.unsavedTitle",
      kind: "warning",
    });
    expect(mocks.open).toHaveBeenCalledWith({
      directory: false,
      multiple: false,
      filters: [{ name: "file.markdownFilter", extensions: ["md", "txt"] }],
    });
    expect(mocks.invoke).toHaveBeenCalledWith("read_file", { targetFile: "C:/docs/open.md" });
    expect(editorContent).toBe("new text");
    expect(ops.activeFilePath.value).toBe("C:/docs/open.md");
  });

  it("fileSave は新規保存と上書き保存で save_file を呼び出す", async () => {
    let editorContent = "draft";
    mocks.save.mockResolvedValue("C:/docs/new.md");
    mocks.invoke.mockResolvedValue({ status_code: 200, message: "Save Ok." });
    const ops = useFileOperations(
      () => editorContent,
      (text) => {
        editorContent = text;
      },
      vi.fn(),
    );

    await ops.fileSave();

    expect(mocks.save).toHaveBeenCalledWith({
      filters: [{ name: "file.markdownSaveFilter", extensions: ["md"] }],
    });
    expect(mocks.invoke).toHaveBeenLastCalledWith("save_file", {
      savePath: "C:/docs/new.md",
      markdownTextData: "draft",
    });
    expect(ops.activeFilePath.value).toBe("C:/docs/new.md");
    expect(ops.isEdit.value).toBe(false);

    editorContent = "updated";
    ops.trackChange("updated");
    await ops.fileSave();

    expect(mocks.invoke).toHaveBeenLastCalledWith("save_file", {
      savePath: "C:/docs/new.md",
      markdownTextData: "updated",
    });
    expect(ops.activeFilePath.value).toBe("C:/docs/new.md");
  });
});
