import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  edit: vi.fn(),
  defineEx: vi.fn(),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: mocks.invoke,
}));

vi.mock("ace-builds", () => ({
  edit: mocks.edit,
  require: () => ({
    CodeMirror: {
      Vim: {
        defineEx: mocks.defineEx,
      },
    },
  }),
}));

vi.mock("ace-builds/src-noconflict/ext-searchbox", () => ({}));
vi.mock("ace-builds/src-noconflict/ext-language_tools", () => ({}));
vi.mock("ace-builds/src-noconflict/mode-markdown", () => ({}));
vi.mock("ace-builds/src-noconflict/theme-monokai", () => ({}));
vi.mock("ace-builds/src-noconflict/keybinding-vim", () => ({}));

import { mountComposable } from "../testUtils";
import { useAceEditor } from "@/composables/useAceEditor";

function createEditorMock() {
  let value = "";
  const session = {
    setMode: vi.fn(),
    setUseWrapMode: vi.fn(),
    insert: vi.fn(),
    replace: vi.fn(),
  };
  const editor = {
    getSession: () => session,
    setFontSize: vi.fn(),
    setShowPrintMargin: vi.fn(),
    setOptions: vi.fn(),
    setKeyboardHandler: vi.fn(),
    on: vi.fn(),
    getValue: vi.fn(() => value),
    setValue: vi.fn((next: string) => {
      value = next;
    }),
    getCursorPosition: vi.fn(() => ({ row: 1, column: 2 })),
    focus: vi.fn(),
    destroy: vi.fn(),
    renderer: { id: "renderer" },
    session,
  };
  return { editor, session };
}

describe("useAceEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("マウント時に Ace を初期化し、公開 API で値やカーソル挿入を扱う", async () => {
    const host = document.createElement("div");
    const { editor, session } = createEditorMock();
    mocks.edit.mockReturnValue(editor);
    const onSave = vi.fn();
    const onChange = vi.fn();

    const { result, unmount } = await mountComposable(() =>
      useAceEditor(ref(host), {
        vimMode: ref(true),
        onSave,
        onChange,
        getActiveFilePath: () => "*C:/docs/a.md",
      }),
    );

    expect(mocks.edit).toHaveBeenCalledWith(host);
    expect(session.setMode).toHaveBeenCalledWith("ace/mode/markdown");
    expect(session.setUseWrapMode).toHaveBeenCalledWith(true);
    expect(editor.setKeyboardHandler).toHaveBeenCalledWith("ace/keyboard/vim");
    expect(mocks.defineEx).toHaveBeenCalledWith("wq", "wq", expect.any(Function));
    expect(mocks.defineEx).toHaveBeenCalledWith("write", "w", expect.any(Function));

    result.setValue("hello");
    expect(result.getValue()).toBe("hello");

    result.insertAtCursor("!");
    expect(session.insert).toHaveBeenCalledWith({ row: 1, column: 2 }, "!");
    expect(editor.focus).toHaveBeenCalled();

    result.setVimMode(false);
    expect(editor.setKeyboardHandler).toHaveBeenLastCalledWith("");
    expect(result.getSession()).toBe(session);
    expect(result.getRenderer()).toEqual({ id: "renderer" });

    unmount();
    expect(editor.destroy).toHaveBeenCalled();
  });

  it("画像パス補完は Tauri 候補を Ace completion に変換する", async () => {
    const host = document.createElement("div");
    const { editor } = createEditorMock();
    mocks.edit.mockReturnValue(editor);
    mocks.invoke.mockResolvedValue(["images/", "images/a.png"]);

    await mountComposable(() =>
      useAceEditor(ref(host), {
        vimMode: ref(false),
        onSave: vi.fn(),
        onChange: vi.fn(),
        getActiveFilePath: () => "*C:/docs/a.md",
      }),
    );

    const completer = editor.setOptions.mock.calls[0][0].enableBasicAutocompletion[0];
    const callback = vi.fn();
    await completer.getCompletions(
      editor,
      { getLine: () => "![alt](im" },
      { row: 0, column: 9 },
      "",
      callback,
    );

    expect(mocks.invoke).toHaveBeenCalledWith("list_image_path_suggestions", {
      inputPath: "im",
      baseFilePath: "C:/docs/a.md",
    });
    expect(callback).toHaveBeenCalledWith(
      null,
      expect.arrayContaining([
        expect.objectContaining({ caption: "images/", meta: "folder", score: 1000 }),
        expect.objectContaining({ caption: "images/a.png", meta: "image", score: 900 }),
      ]),
    );
  });
});
