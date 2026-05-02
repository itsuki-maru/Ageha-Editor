import { describe, expect, it, vi } from "vitest";

import { mountComposable } from "../testUtils";
import { type ShortcutActions, useKeyboardShortcuts } from "@/composables/useKeyboardShortcuts";

function createActions(): ShortcutActions {
  return {
    fileOpen: vi.fn(),
    fileSave: vi.fn(),
    readImage: vi.fn(),
    printOut: vi.fn(),
    exportHtml: vi.fn(),
    openViewer: vi.fn(),
    togglePreview: vi.fn(),
    toggleInputTool: vi.fn(),
    toggleHelp: vi.fn(),
    openNewInstance: vi.fn(),
    openSlideshow: vi.fn(),
    drawMermaid: vi.fn(),
    toggleVimMode: vi.fn(),
    closeModals: vi.fn(),
  };
}

function dispatchKey(key: string, options: KeyboardEventInit = {}) {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
    ...options,
  });
  window.dispatchEvent(event);
  return event;
}

describe("useKeyboardShortcuts", () => {
  it("Ctrl 系ショートカットを対応するアクションへ割り当てる", async () => {
    const actions = createActions();
    const { unmount } = await mountComposable(() => useKeyboardShortcuts(actions));

    const saveEvent = dispatchKey("s", { ctrlKey: true });
    const mermaidEvent = dispatchKey("m", { ctrlKey: true });

    expect(actions.fileSave).toHaveBeenCalledOnce();
    expect(saveEvent.defaultPrevented).toBe(true);
    expect(actions.drawMermaid).toHaveBeenCalledOnce();
    expect(mermaidEvent.defaultPrevented).toBe(false);

    unmount();
  });

  it("Ctrl+Alt 系と Escape を処理し、アンマウント後は解除する", async () => {
    const actions = createActions();
    const { unmount } = await mountComposable(() => useKeyboardShortcuts(actions));

    const previewEvent = dispatchKey("/", { ctrlKey: true, altKey: true });
    const escapeEvent = dispatchKey("Escape");

    expect(actions.togglePreview).toHaveBeenCalledOnce();
    expect(previewEvent.defaultPrevented).toBe(true);
    expect(actions.closeModals).toHaveBeenCalledOnce();
    expect(escapeEvent.defaultPrevented).toBe(true);

    unmount();
    dispatchKey("/", { ctrlKey: true, altKey: true });

    expect(actions.togglePreview).toHaveBeenCalledOnce();
  });
});
