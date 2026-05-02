import { describe, expect, it } from "vitest";

import { detectDocumentMode, normalizeSlideMarkdown } from "@/utils/documentMode";

describe("detectDocumentMode", () => {
  it("frontmatter がない場合は markdown を返す", () => {
    expect(detectDocumentMode("# Title")).toBe("markdown");
  });

  it.each(["true", "TRUE", "yes", "on"])("marp: %s を slides と判定する", (value) => {
    expect(detectDocumentMode(`---\nmarp: ${value}\n---\n# Slide`)).toBe("slides");
  });

  it("marp が true 相当でない場合は markdown を返す", () => {
    expect(detectDocumentMode("---\nmarp: false\n---\n# Doc")).toBe("markdown");
  });

  it("frontmatter が文書先頭にない場合は markdown を返す", () => {
    expect(detectDocumentMode("\n---\nmarp: true\n---\n# Doc")).toBe("markdown");
  });
});

describe("normalizeSlideMarkdown", () => {
  it("スライド用 frontmatter に既定値を補完する", () => {
    const markdown = "---\nmarp: true\n---\n# Slide";

    expect(normalizeSlideMarkdown(markdown)).toBe(
      "---\nmarp: true\ntheme: ageha-slide\nsize: 16:9\nmath: katex\n---\n# Slide",
    );
  });

  it("既存の theme / size / math は Ageha の既定値で差し替える", () => {
    const markdown = "---\nmarp: true\ntheme: custom\nsize: 4:3\nmath: mathjax\n---\n# Slide";

    expect(normalizeSlideMarkdown(markdown)).toContain(
      "marp: true\ntheme: ageha-slide\nsize: 16:9\nmath: katex",
    );
  });

  it("frontmatter がない場合は元の Markdown を返す", () => {
    expect(normalizeSlideMarkdown("# Normal Markdown")).toBe("# Normal Markdown");
  });
});
