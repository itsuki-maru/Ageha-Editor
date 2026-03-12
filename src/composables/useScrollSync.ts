import { onMounted, type Ref } from "vue";
import type { Ace } from "ace-builds";
import { SCROLL_SYNC_DELAY_MS } from "../constants";

// Markdown モード時だけ、Ace エディタ側のスクロール量に合わせて
// プレビューのスクロール位置を概算で同期する。
export function useScrollSync(
  getSession: () => Ace.EditSession | undefined,
  getRenderer: () => Ace.VirtualRenderer | undefined,
  previewArea: Ref<HTMLElement | null>,
  enabled: Ref<boolean>,
) {
  onMounted(() => {
    const session = getSession();
    if (!session) return;

    let isEditorScrolling = false;

    session.on("changeScrollTop", function () {
      if (!enabled.value) return;
      if (!previewArea.value) return;

      // Ace 側のスクロール量と、プレビュー側の最大スクロール量を比率で対応づける。
      const editorScroll = session.getScrollTop();
      const rendererInstance = getRenderer();
      if (!rendererInstance) return;

      const editorMaxScroll =
        (rendererInstance as any).layerConfig.maxHeight -
        (rendererInstance as any).$size.scrollerHeight;
      const previewMaxScroll = previewArea.value.scrollHeight - previewArea.value.clientHeight;

      if (editorMaxScroll <= 0) return;

      isEditorScrolling = true;
      // 概算比率でプレビュー側の位置を合わせる。
      previewArea.value.scrollTop = (editorScroll / editorMaxScroll) * previewMaxScroll;
      setTimeout(() => (isEditorScrolling = false), SCROLL_SYNC_DELAY_MS);
    });

    // void の参照でビルドエラーを回避
    void isEditorScrolling;
  });
}
