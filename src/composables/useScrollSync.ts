import { onMounted, type Ref } from "vue";
import type { Ace } from "ace-builds";
import { SCROLL_SYNC_DELAY_MS } from "../constants";

// Markdown モード時だけ、Ace エディタ側のスクロール量に合わせて
// プレビューエリアのスクロール位置を概算で同期する。
//
// アルゴリズム:
//   エディタの現在スクロール位置 / エディタの最大スクロール量 = 進捗比率
//   プレビューのスクロール位置 = 進捗比率 × プレビューの最大スクロール量
//
// この比率変換は行数ベースではなくピクセルベースのため、
// Markdown とプレビューの高さが一致しない場合でも概ね対応する位置を示す。

/**
 * エディタのスクロールイベントをプレビューエリアへ同期する composable。
 * @param getSession  - Ace の EditSession を返すコールバック（スクロールイベント購読に使う）
 * @param getRenderer - Ace の VirtualRenderer を返すコールバック（最大スクロール量の取得に使う）
 * @param previewArea - 同期先のプレビュー DOM 要素への ref
 * @param enabled     - true のときだけ同期を実行する（slides モード時は false にする）
 */
export function useScrollSync(
  getSession: () => Ace.EditSession | undefined,
  getRenderer: () => Ace.VirtualRenderer | undefined,
  previewArea: Ref<HTMLElement | null>,
  enabled: Ref<boolean>,
) {
  onMounted(() => {
    const session = getSession();
    if (!session) return;

    // スクロール中フラグ: 将来的に双方向同期へ拡張する際に使うことを想定している。
    // 現時点は片方向のみのため実際のガード処理には使っていないが、
    // void 参照でビルドエラーを回避している。
    let isEditorScrolling = false;

    // Ace の縦スクロール位置が変化するたびに呼ばれるイベントリスナー。
    session.on("changeScrollTop", function () {
      // slides モード時やプレビューが非表示のときは何もしない。
      if (!enabled.value) return;
      if (!previewArea.value) return;

      const editorScroll = session.getScrollTop();
      const rendererInstance = getRenderer();
      if (!rendererInstance) return;

      // layerConfig.maxHeight はコンテンツ全体の描画高さ、
      // $size.scrollerHeight はビューポートの高さ。
      // 差分が実際にスクロールできる最大量になる。
      const editorMaxScroll =
        (rendererInstance as any).layerConfig.maxHeight -
        (rendererInstance as any).$size.scrollerHeight;
      const previewMaxScroll = previewArea.value.scrollHeight - previewArea.value.clientHeight;

      // エディタが最上部にある（スクロール不要）場合は比率計算をスキップする。
      if (editorMaxScroll <= 0) return;

      isEditorScrolling = true;
      // エディタの進捗比率をそのままプレビューの絶対位置へ変換して適用する。
      previewArea.value.scrollTop = (editorScroll / editorMaxScroll) * previewMaxScroll;

      // 一定時間後にスクロール中フラグを解除する。
      setTimeout(() => (isEditorScrolling = false), SCROLL_SYNC_DELAY_MS);
    });

    // void 参照でビルドエラーを回避する（変数は未来の双方向同期実装のために残す）。
    void isEditorScrolling;
  });
}
