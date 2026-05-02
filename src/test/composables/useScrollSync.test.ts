import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";

import { mountComposable } from "../testUtils";
import { useScrollSync } from "@/composables/useScrollSync";

describe("useScrollSync", () => {
  it("Ace のスクロール比率をプレビュー領域へ反映する", async () => {
    vi.useFakeTimers();
    let listener: (() => void) | undefined;
    const session = {
      on: vi.fn((_event: string, callback: () => void) => {
        listener = callback;
      }),
      getScrollTop: vi.fn(() => 50),
    };
    const renderer = {
      layerConfig: { maxHeight: 300 },
      $size: { scrollerHeight: 100 },
    };
    const preview = document.createElement("div");
    Object.defineProperty(preview, "scrollHeight", { configurable: true, value: 500 });
    Object.defineProperty(preview, "clientHeight", { configurable: true, value: 100 });

    const enabled = ref(true);
    const previewArea = ref<HTMLElement | null>(preview);
    const { unmount } = await mountComposable(() =>
      useScrollSync(
        () => session as any,
        () => renderer as any,
        previewArea,
        enabled,
      ),
    );

    listener?.();

    expect(session.on).toHaveBeenCalledWith("changeScrollTop", expect.any(Function));
    expect(preview.scrollTop).toBe(100);

    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    unmount();
  });

  it("無効化中または最大スクロール量がない場合は同期しない", async () => {
    let listener: (() => void) | undefined;
    const session = {
      on: vi.fn((_event: string, callback: () => void) => {
        listener = callback;
      }),
      getScrollTop: vi.fn(() => 50),
    };
    const preview = document.createElement("div");
    Object.defineProperty(preview, "scrollHeight", { configurable: true, value: 500 });
    Object.defineProperty(preview, "clientHeight", { configurable: true, value: 100 });
    const enabled = ref(false);

    const { unmount } = await mountComposable(() =>
      useScrollSync(
        () => session as any,
        () => ({ layerConfig: { maxHeight: 100 }, $size: { scrollerHeight: 100 } }) as any,
        ref(preview),
        enabled,
      ),
    );

    listener?.();

    expect(preview.scrollTop).toBe(0);
    unmount();
  });
});
