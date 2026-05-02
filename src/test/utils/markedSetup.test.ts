import { describe, expect, it, vi } from "vitest";
import { marked } from "marked";

vi.mock("@/utils/assetPaths", () => ({
  toPreviewAssetUrl: (path: string, activeFilePath: string) => `asset://${activeFilePath}/${path}`,
}));

vi.mock("@/i18n", () => ({
  translate: (key: string) => key,
}));

import {
  PageBreakToken,
  renderIframe,
  renderer,
  setMarkedRendererFileContext,
  setMarkedRendererPreviewAssetUrls,
  youtubeToken,
} from "@/utils/markedSetup";

describe("markedSetup", () => {
  it("YouTube トークンは許可ドメインと 11 文字 ID のみ受け付ける", () => {
    const token = youtubeToken.tokenizer("@[youtube](https://youtu.be/abcdefghijk)", []);

    expect(token).toMatchObject({
      type: "youtube",
      text: "abcdefghijk",
      href: "https://youtu.be/abcdefghijk",
    });
    expect(youtubeToken.tokenizer("@[youtube](https://example.com/abcdefghijk)", [])).toBeNull();
    expect(youtubeToken.tokenizer("@[youtube](https://youtu.be/short)", [])).toBeNull();
  });

  it("app-youtube プレースホルダーを nocookie iframe に置換する", () => {
    expect(
      renderIframe('<app-youtube video-id="abcdefghijk" data-src="x"></app-youtube>'),
    ).toContain('src="https://www.youtube-nocookie.com/embed/abcdefghijk"');
  });

  it("画像レンダラは幅指定を分離し、プレビュー用 asset URL を使う", () => {
    setMarkedRendererFileContext("C:/docs/a.md");
    setMarkedRendererPreviewAssetUrls(true);

    expect(renderer.image({ href: "images/a.png =320x", text: "alt" } as any)).toBe(
      '<img src="asset://C:/docs/a.md/images/a.png" alt="alt" loading="lazy" decoding="async"  width="320px">',
    );
  });

  it("リンク、コード、ページブレークを Ageha 用 HTML として描画する", () => {
    marked.setOptions({ renderer });

    expect(marked.parse("[Example](https://example.com)")).toContain(
      'target="_blank" rel="noopener noreferrer"',
    );
    expect(renderer.code({ text: "<tag>", lang: "ts" } as any)).toContain("&lt;tag&gt;");
    expect(PageBreakToken.renderer({ type: "pagebreak", text: "" })).toBe(
      '<div class="pagebreak"></div>',
    );
  });
});
