import { describe, expect, it } from "vitest";
import { normalizeStylePack, resolveStylePack } from "@/utils/stylePacks";

describe("style packs", () => {
  it.each([undefined, null, "removed-pack", {}, 3])(
    "falls back for legacy or invalid setting %s",
    (value) => {
      expect(normalizeStylePack(value)).toBe("standard");
      expect(resolveStylePack(value, "custom markdown", "custom slides")).toEqual({
        previewCss: "custom markdown",
        markdownCss: "custom markdown",
        slideCss: "custom slides",
      });
    },
  );

  it.each(["simple", "dark", "paper"])("isolates %s from custom CSS and editor controls", (id) => {
    const css = resolveStylePack(id, "USER_MARKDOWN", "USER_SLIDES");
    expect(Object.values(css).join("")).not.toContain("USER_");
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(css.previewCss);
    for (const rule of Array.from(sheet.cssRules)) {
      if (rule instanceof CSSStyleRule) {
        expect(
          rule.selectorText.split(",").every((s) => s.trim().startsWith("#result.preview-area")),
        ).toBe(true);
      }
    }
    expect(css.markdownCss).toContain("body {");
    expect(css.slideCss).toContain("section.lead");
  });
});
