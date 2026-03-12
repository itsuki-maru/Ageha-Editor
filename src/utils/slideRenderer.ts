import type { SlideRenderResult } from "@/interface";
import { normalizeSlideMarkdown } from "@/utils/documentMode";
import { embedLocalImageSources } from "@/utils/assetPaths";
import { AGEHA_SLIDE_THEME } from "@/utils/slideTheme";

// スライド機能は通常の Markdown 利用時には不要なため、
// Marp 本体は必要になったタイミングで遅延読み込みする。
type MarpInstance = InstanceType<typeof import("@marp-team/marp-core").Marp>;

let marpInstancePromise: Promise<MarpInstance> | null = null;

export async function renderSlides(
  markdown: string,
  activeFilePath: string,
): Promise<SlideRenderResult> {
  // frontmatter の補完と画像前処理を済ませてから Marp へ渡す。
  const marp = await getMarp();
  const normalizedMarkdown = normalizeSlideMarkdown(markdown);
  const markdownWithResolvedAssets = await preprocessSlideAssets(normalizedMarkdown, activeFilePath);
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

async function getMarp(): Promise<MarpInstance> {
  if (!marpInstancePromise) {
    marpInstancePromise = import("@marp-team/marp-core").then(({ Marp }) => {
      // 数式と HTML 埋め込みを許可した Marp インスタンスを必要時にだけ作る。
      const marp = new Marp({
        html: true,
        math: { lib: "katex" },
      });

      // Ageha 標準テーマを登録し、未指定時の既定テーマとして使う。
      marp.themeSet.add(AGEHA_SLIDE_THEME);
      marp.themeSet.default = marp.themeSet.get("ageha-slide", true);
      return marp;
    });
  }

  return marpInstancePromise;
}

async function preprocessSlideAssets(markdown: string, activeFilePath: string): Promise<string> {
  // スライドは独立 HTML として扱うため、画像 URL を先に解決しておく。
  return embedLocalImageSources(markdown, activeFilePath);
}

function countSlides(html: string): number {
  // Marp が出力する各 section を数えてスライド枚数とみなす。
  const matches = html.match(/<section id="/g);
  return matches?.length ?? 0;
}
