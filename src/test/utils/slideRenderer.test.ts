import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  render: vi.fn(),
  addTheme: vi.fn(),
  getTheme: vi.fn(() => "default-theme"),
  embedLocalImageSources: vi.fn(async (markdown: string) =>
    markdown.replace("images/a.png", "data:image/png;base64,abc"),
  ),
}));

vi.mock("@marp-team/marp-core", () => ({
  Marp: vi.fn().mockImplementation(() => ({
    themeSet: {
      add: mocks.addTheme,
      get: mocks.getTheme,
      default: undefined,
    },
    render: mocks.render,
  })),
}));

vi.mock("@/utils/assetPaths", () => ({
  embedLocalImageSources: mocks.embedLocalImageSources,
}));

import { renderSlides } from "@/utils/slideRenderer";

describe("slideRenderer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.render.mockReturnValue({
      html: '<section id="1"></section><section id="2"></section>',
      css: "section{}",
    });
  });

  it("frontmatter 補完と画像前処理を行って Marp 結果を返す", async () => {
    const result = await renderSlides(
      "---\nmarp: true\n---\n![alt](images/a.png)",
      "C:/docs/slide.md",
    );

    expect(mocks.addTheme).toHaveBeenCalled();
    expect(mocks.getTheme).toHaveBeenCalledWith("ageha-slide", true);
    expect(mocks.embedLocalImageSources).toHaveBeenCalledWith(
      expect.stringContaining("theme: ageha-slide"),
      "C:/docs/slide.md",
    );
    expect(mocks.render).toHaveBeenCalledWith(expect.stringContaining("data:image/png;base64,abc"));
    expect(result).toEqual({
      mode: "slides",
      html: '<section id="1"></section><section id="2"></section>',
      css: "section{}",
      metadata: { slideCount: 2 },
    });
  });
});
