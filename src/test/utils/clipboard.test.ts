import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/i18n", () => ({
  translate: (key: string) => (key === "common.copied" ? "Copied" : key),
}));

import { TOOLTIP_DISPLAY_MS, TOOLTIP_FADE_MS } from "@/constants";
import { copyElementText, handleCopyButtonClick } from "@/utils/clipboard";

describe("clipboard utilities", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.useFakeTimers();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn() },
    });
  });

  it("data-target の要素テキストをコピーし、ツールチップを表示して消す", () => {
    const parent = document.createElement("div");
    const code = document.createElement("code");
    code.id = "code-1";
    code.textContent = "console.log(1)";
    const button = document.createElement("button");
    button.dataset.target = "code-1";
    parent.append(code, button);
    document.body.append(parent);

    handleCopyButtonClick(button);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("console.log(1)");
    expect(parent.querySelector(".copy-tooltip")?.textContent).toBe("Copied");

    vi.advanceTimersByTime(TOOLTIP_DISPLAY_MS);
    expect((parent.querySelector(".copy-tooltip") as HTMLElement).style.opacity).toBe("0");
    vi.advanceTimersByTime(TOOLTIP_FADE_MS);
    expect(parent.querySelector(".copy-tooltip")).toBeNull();
    vi.useRealTimers();
  });

  it("通常要素の textContent をコピーし、空テキストは無視する", () => {
    const parent = document.createElement("div");
    const element = document.createElement("pre");
    element.textContent = "copy me";
    parent.append(element);
    document.body.append(parent);

    copyElementText(element);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("copy me");

    const empty = document.createElement("span");
    copyElementText(empty);
    expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
