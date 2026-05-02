import { describe, expect, it } from "vitest";
import { nextTick } from "vue";

import { mountComposable } from "../testUtils";
import { useWindowSize } from "@/composables/useWindowSize";

function setViewport(width: number, height: number) {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: height });
}

describe("useWindowSize", () => {
  it("初期サイズと高さ区分を計算する", async () => {
    setViewport(1200, 900);

    const { result, unmount } = await mountComposable(() => useWindowSize());

    expect(result.width.value).toBe(1200);
    expect(result.height.value).toBe(900);
    expect(result.isHeightScreen.value).toBe(true);
    expect(result.divHeight.value).toBe(720);

    unmount();
  });

  it("resize イベントでサイズと高さを更新し、アンマウント後は反応しない", async () => {
    setViewport(1000, 900);
    const { result, unmount } = await mountComposable(() => useWindowSize());

    setViewport(640, 700);
    window.dispatchEvent(new Event("resize"));
    await nextTick();

    expect(result.width.value).toBe(640);
    expect(result.height.value).toBe(700);
    expect(result.isHeightScreen.value).toBe(false);
    expect(result.divHeight.value).toBeCloseTo(483);

    unmount();
    setViewport(320, 500);
    window.dispatchEvent(new Event("resize"));
    await nextTick();

    expect(result.width.value).toBe(640);
    expect(result.height.value).toBe(700);
  });
});
