import type { SlideRenderResult } from "@/interface";
import { normalizeSlideMarkdown } from "@/utils/documentMode";
import { embedLocalImageSources } from "@/utils/assetPaths";
import { AGEHA_SLIDE_THEME } from "@/utils/slideTheme";

// Marp を使ったスライドレンダリングの中核モジュール。
// renderSlides() が外部向けの唯一の公開 API であり、
// frontmatter の補完→画像の前処理→Marp レンダリング の順で処理する。
//
// Marp 本体は動的インポートで遅延読み込みする。
// 通常の Markdown 文書を開いているだけでは marp-core の大きなバンドルが
// ロードされないため、初回起動のパフォーマンスに影響しない。

// Marp インスタンスの型エイリアス（動的インポートのため型のみ参照）
type MarpInstance = InstanceType<typeof import("@marp-team/marp-core").Marp>;

// Marp インスタンスを Promise ごとキャッシュするシングルトン変数。
// null の場合は未生成、それ以外は生成中または生成済みを意味する。
let marpInstancePromise: Promise<MarpInstance> | null = null;

/**
 * Markdown テキストをスライド HTML/CSS に変換して返す。
 * 内部で frontmatter 補完・画像 data URL 化・Marp レンダリングを行う。
 * @param markdown       - スライドモードの Markdown テキスト全体
 * @param activeFilePath - 現在開いているファイルのパス（相対画像パス解決に使う）
 * @returns Marp が生成した html / css とスライド枚数を含む SlideRenderResult
 */
export async function renderSlides(
  markdown: string,
  activeFilePath: string,
): Promise<SlideRenderResult> {
  // Marp インスタンスの取得（未生成なら初めてここで動的インポートが走る）
  const marp = await getMarp();
  // frontmatter に theme / size / math が未指定なら Ageha 固定値を補完する。
  const normalizedMarkdown = normalizeSlideMarkdown(markdown);
  // ローカル画像を data URL に変換しておく（srcdoc や別ウィンドウで参照切れを防ぐ）。
  const markdownWithResolvedAssets = await preprocessSlideAssets(
    normalizedMarkdown,
    activeFilePath,
  );
  // Marp 本体のレンダリングを実行する（同期処理）。
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

/**
 * Marp インスタンスをシングルトンとして取得する。
 * 初回呼び出し時に動的インポートとインスタンス生成が走り、以後はキャッシュを返す。
 * Promise をキャッシュすることで並行呼び出し時の重複生成も防いでいる。
 */
async function getMarp(): Promise<MarpInstance> {
  if (!marpInstancePromise) {
    marpInstancePromise = import("@marp-team/marp-core").then(({ Marp }) => {
      // HTML 埋め込みと KaTeX 数式を有効化した Marp インスタンスを生成する。
      const marp = new Marp({
        html: true,
        math: { lib: "katex" },
      });

      // Ageha 標準テーマを登録し、frontmatter 無指定時の既定テーマとして設定する。
      marp.themeSet.add(AGEHA_SLIDE_THEME);
      // get() の第 2 引数 true は「見つからない場合に例外を投げる」指定。
      // add() の直後なので必ず見つかるが、型安全のために明示している。
      marp.themeSet.default = marp.themeSet.get("ageha-slide", true);
      return marp;
    });
  }

  return marpInstancePromise;
}

// -------- 画像前処理キャッシュ --------

/** preprocessSlideAssets の直前の呼び出し結果を保持する 1 スロットキャッシュの型 */
type AssetCacheEntry = { markdown: string; filePath: string; result: string };

// 直前の呼び出し結果を保持する 1 スロットキャッシュ。
// ファイル単位の data URL 変換は embeddedAssetUrlCache（assetPaths.ts）で済んでいるが、
// regex マッチと文字列組み立ては毎回走るため、入力が変わっていなければスキップする。
// アンドゥ操作・再フォーカス時など、同一内容で再レンダリングされるケースに効く。
let assetPreprocessCache: AssetCacheEntry | null = null;

/**
 * Markdown テキスト中のローカル画像パスを data URL に置き換えて返す。
 * @param markdown       - 処理対象の Markdown テキスト
 * @param activeFilePath - 相対パス解決の基準となるファイルパス
 * @returns 画像パスが data URL で置き換えられた Markdown テキスト
 */
async function preprocessSlideAssets(markdown: string, activeFilePath: string): Promise<string> {
  // 同じ markdown + filePath の組み合わせならキャッシュを返す。
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

// -------- スライド枚数カウント --------

/**
 * Marp が出力した HTML からスライド枚数を数える。
 * Marp は各スライドを `<section id="...">` で出力するため、その数をカウントする。
 * @param html - Marp が生成した HTML 断片
 * @returns スライド枚数（section 要素の数）
 */
function countSlides(html: string): number {
  const matches = html.match(/<section id="/g);
  return matches?.length ?? 0;
}
