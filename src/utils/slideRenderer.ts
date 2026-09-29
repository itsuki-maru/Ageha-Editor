import type { SlideRenderResult } from "@/interface";
import { normalizeSlideMarkdown } from "@/utils/documentMode";
import { embedLocalImageSources } from "@/utils/assetPaths";
import { AGEHA_SLIDE_THEME } from "@/utils/slideTheme";

// 通常の Markdown 表示で Marp を読み込まないよう、初回のスライド描画まで遅延する。
type MarpInstance = InstanceType<typeof import("@marp-team/marp-core").Marp>;

let marpInstancePromise: Promise<MarpInstance> | null = null;

export async function renderSlides(
  markdown: string,
  activeFilePath: string,
): Promise<SlideRenderResult> {
  const marp = await getMarp();
  const normalizedMarkdown = normalizeSlideMarkdown(markdown);
  const markdownWithResolvedAssets = await preprocessSlideAssets(
    normalizedMarkdown,
    activeFilePath,
  );
  const rendered = marp.render(markdownWithResolvedAssets);

  return {
    mode: "slides",
    html: rendered.html,
    css: rendered.css,
    metadata: {
      slideCount: countSlides(rendered.html),
    },
  };
}

// Promise をキャッシュし、並行呼び出しによる Marp の重複生成を防ぐ。
async function getMarp(): Promise<MarpInstance> {
  if (!marpInstancePromise) {
    marpInstancePromise = import("@marp-team/marp-core").then(({ Marp }) => {
      const marp = new Marp({
        html: true,
        math: { lib: "katex" },
      });

      marp.themeSet.add(AGEHA_SLIDE_THEME);
      marp.themeSet.default = marp.themeSet.get("ageha-slide", true);
      return marp;
    });
  }

  return marpInstancePromise;
}

type AssetCacheEntry = { markdown: string; filePath: string; result: string };

// ファイル単位の画像キャッシュとは別に、同じ文書のパス置換と文字列構築を省く。
let assetPreprocessCache: AssetCacheEntry | null = null;

async function preprocessSlideAssets(markdown: string, activeFilePath: string): Promise<string> {
  if (
    assetPreprocessCache &&
    assetPreprocessCache.markdown === markdown &&
    assetPreprocessCache.filePath === activeFilePath
  ) {
    return assetPreprocessCache.result;
  }

  // スライドは srcdoc / 別ウィンドウ / 印刷で独立 HTML として扱うため、
  // 画像 URL を data URL に変換しておかないと参照切れが起きやすい。
  const result = await embedLocalImageSources(markdown, activeFilePath);
  assetPreprocessCache = { markdown, filePath: activeFilePath, result };
  return result;
}

// Marp が出力する各スライドの <section id="..."> を数える。
function countSlides(html: string): number {
  const matches = html.match(/<section id="/g);
  return matches?.length ?? 0;
}
