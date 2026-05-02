import { describe, expect, it, vi } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({
  convertFileSrc: (path: string) => `asset://${path}`,
  invoke: vi.fn(),
}));

import {
  getParentPath,
  isExternalAssetPath,
  resolveAssetPath,
  toPreviewAssetUrl,
} from "@/utils/assetPaths";

describe("isExternalAssetPath", () => {
  it.each([
    "https://example.com/a.png",
    "//cdn.example.com/a.png",
    "data:image/png;base64,abc",
    "blob:test",
    "#anchor",
  ])("外部または特殊 URL として扱う: %s", (path) => {
    expect(isExternalAssetPath(path)).toBe(true);
  });

  it.each(["images/a.png", "./a.png", "../a.png", "C:/docs/a.png", "/tmp/a.png"])(
    "ローカルパスとして扱う: %s",
    (path) => {
      expect(isExternalAssetPath(path)).toBe(false);
    },
  );
});

describe("getParentPath", () => {
  it("スラッシュ区切りの親ディレクトリを返す", () => {
    expect(getParentPath("/home/user/doc.md")).toBe("/home/user");
  });

  it("Windows 区切りの親ディレクトリを返す", () => {
    expect(getParentPath("C:\\Users\\me\\doc.md")).toBe("C:\\Users\\me");
  });

  it("親がない場合は空文字を返す", () => {
    expect(getParentPath("doc.md")).toBe("");
  });
});

describe("resolveAssetPath", () => {
  it("相対画像パスを編集中ファイルの親ディレクトリから解決する", () => {
    expect(resolveAssetPath("images/pic.png", "C:/docs/note.md")).toBe("C:/docs/images/pic.png");
  });

  it("絶対パスはそのまま返す", () => {
    expect(resolveAssetPath("C:/images/pic.png", "C:/docs/note.md")).toBe("C:/images/pic.png");
  });

  it("外部 URL はそのまま返す", () => {
    expect(resolveAssetPath("https://example.com/pic.png", "C:/docs/note.md")).toBe(
      "https://example.com/pic.png",
    );
  });
});

describe("toPreviewAssetUrl", () => {
  it("解決できた絶対パスを Tauri の asset URL に変換する", () => {
    expect(toPreviewAssetUrl("images/pic.png", "C:/docs/note.md")).toBe(
      "asset://C:/docs/images/pic.png",
    );
  });

  it("基準ファイルがない相対パスは元の値を返す", () => {
    expect(toPreviewAssetUrl("images/pic.png", "note.md")).toBe("images/pic.png");
  });
});
