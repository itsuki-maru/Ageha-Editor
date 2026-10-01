import { afterEach, describe, expect, it } from "vitest";
import { createHtml } from "@/utils/htmlTemplate";
import { resolveStylePack } from "@/utils/stylePacks";

afterEach(() => {
  document.head.innerHTML = "";
  document.body.innerHTML = "";
  document.body.removeAttribute("id");
  document.body.removeAttribute("class");
});

describe("style pack output cascade", () => {
  it.each([
    ["dark", "rgb(227, 234, 244)"],
    ["paper", "rgb(68, 58, 48)"],
    ["simple", "rgb(37, 48, 68)"],
  ])("uses %s heading styles in the standalone viewer", (pack, color) => {
    const html = createHtml(
      '<h2 class="head2" id="title">Heading</h2>',
      resolveStylePack(pack, "", "").markdownCss,
    );
    const parsed = new DOMParser().parseFromString(html, "text/html");
    expect(parsed.body.id).toBe("ageha-document");
    expect(html).toContain("body#ageha-document h2");
    document.head.innerHTML = parsed.head.innerHTML;
    document.body.innerHTML = parsed.body.innerHTML;
    document.body.id = parsed.body.id;
    document.body.className = parsed.body.className;
    const style = getComputedStyle(document.querySelector("h2")!);
    expect(style.color).toBe(color);
    expect(style.backgroundColor).toBe("rgba(0, 0, 0, 0)");
    expect(style.borderLeftWidth).toBe("0px");
  });
});
