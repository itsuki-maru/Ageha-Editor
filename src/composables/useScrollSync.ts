import { onMounted, type Ref } from "vue";
import type { Ace } from "ace-builds";
import { SCROLL_SYNC_DELAY_MS } from "../constants";

// エディタとプレビューの高さが異なるため、スクロール可能量に対する比率で同期する。
export function useScrollSync(
  getSession: () => Ace.EditSession | undefined,
  getRenderer: () => Ace.VirtualRenderer | undefined,
  previewArea: Ref<HTMLElement | null>,
  enabled: Ref<boolean>,
) {
  onMounted(() => {
    const session = getSession();
    if (!session) return;

    // 双方向同期への拡張用。現状はガードに使っていない。
    let isEditorScrolling = false;

    session.on("changeScrollTop", function () {
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

      if (editorMaxScroll <= 0) return;

      isEditorScrolling = true;
      previewArea.value.scrollTop = (editorScroll / editorMaxScroll) * previewMaxScroll;

      setTimeout(() => (isEditorScrolling = false), SCROLL_SYNC_DELAY_MS);
    });

    // 未使用変数の診断を避ける。
    void isEditorScrolling;
  });
}
