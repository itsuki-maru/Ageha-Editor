import { describe, expect, it } from "vitest";

import {
  detectDocumentMode,
  normalizeSlideMarkdown,
  setDocumentMode,
  stripMarpFrontmatter,
} from "@/utils/documentMode";

describe("stripMarpFrontmatter", () => {
  it.each(["\n", "\r\n"])("marp を含む先頭設定欄だけを除外する (%j)", (eol) => {
    const body = ["", "# Body", "", "---", "", "Text"].join(eol);
    const metadata = [
      "---",
      "title: Keep",
      "marp: false # disabled",
      "theme: custom",
      "---",
      "",
    ].join(eol);
    expect(stripMarpFrontmatter(metadata + body)).toBe(body);
    expect(stripMarpFrontmatter(["---", "marp: false", "---"].join(eol))).toBe("");
  });

  it.each([
    "---\ntitle: Normal\n---\n# Body",
    "---\n\nText\n\n---\nEnd",
    "# Body\n\n---\nmarp: false\n---",
    "```yaml\n---\nmarp: false\n---\n```",
    "---\nmarp: false\n# Unclosed",
    "---\n# marp: false\n---\nBody",
  ])("通常の文書やコード例を変更しない: %s", (markdown) => {
    expect(stripMarpFrontmatter(markdown)).toBe(markdown);
  });
});

describe("setDocumentMode", () => {
  it.each(["", "# Title\n\n---\n\nBody", "\n---\nmarp: true\n---\nBody"])(
    "設定欄を文書先頭に追加し本文を保持する",
    (body) => {
      const slides = setDocumentMode(body, "slides");
      expect(slides).toBe(`---\nmarp: true\n---\n${body}`);
      expect(detectDocumentMode(slides)).toBe("slides");
      expect(setDocumentMode(slides, "slides")).toBe(slides);
      expect(detectDocumentMode(setDocumentMode(slides, "markdown"))).toBe("markdown");
    },
  );

  it.each(["\n", "\r\n"])("改行と他の設定を保持する (%j)", (eol) => {
    const source = [
      "---",
      "title: Test",
      "marp: false # keep",
      "theme: custom",
      "---",
      "# Body",
      "---",
      "End",
    ].join(eol);
    const slides = setDocumentMode(source, "slides");
    expect(slides).toBe(source.replace("marp: false", "marp: true"));
    expect(detectDocumentMode(slides)).toBe("slides");
    expect(setDocumentMode(slides, "markdown")).toBe(source);
  });

  it.each(["true", "TRUE", "yes", "on"])("%s を無効化する", (value) => {
    expect(setDocumentMode(`---\nmarp: ${value}\n---`, "markdown")).toBe("---\nmarp: false\n---");
  });

  it("空の設定欄と marp のない設定欄へ追記する", () => {
    expect(setDocumentMode("---\n---\nBody", "slides")).toBe("---\nmarp: true\n---\nBody");
    expect(setDocumentMode("---\ntitle: Test\n---", "slides")).toBe(
      "---\ntitle: Test\nmarp: true\n---",
    );
    expect(setDocumentMode("Body", "markdown")).toBe("Body");
  });
});

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
