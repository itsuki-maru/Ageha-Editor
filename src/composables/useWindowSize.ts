import { ref, onMounted, onBeforeUnmount, watch } from "vue";

// ウィンドウのリサイズを監視し、エディタ・プレビューエリアの高さを動的に計算する。
// CSS の vh 単位だけでは調整しにくい「ヘッダやツールバーを除いた残り高さ」を
// ここでピクセル計算して提供する。

export function useWindowSize() {
  /** ウィンドウの現在の横幅 (px) */
  const width = ref(window.innerWidth);
  /** ウィンドウの現在の縦幅 (px) */
  const height = ref(window.innerHeight);

  /** resize イベントのたびに viewport の実寸を更新する */
  const updateSize = () => {
    width.value = window.innerWidth;
    height.value = window.innerHeight;
  };

  onMounted(() => {
    window.addEventListener("resize", updateSize);
  });

  onBeforeUnmount(() => {
    // コンポーネント破棄時にリスナーを確実に解除する。
    window.removeEventListener("resize", updateSize);
  });

  /** 画面が縦方向に十分な高さを持つかどうかのフラグ。
   *  マークダウン入力ツールパネルの表示位置調整に使う。 */
  const isHeightScreen = ref(false);

  /** エディタ・プレビューエリアに割り当てる高さ (px)。
   *  ウィンドウ高さから係数を掛けて算出する。 */
  const divHeight = ref(0);

  /**
   * ウィンドウ高さに応じてエリア高さを再計算する。
   * 800px を境界値として 2 段階の係数を使い分けている。
   * - 800px 超: ヘッダ/ツールバー分を差し引いても余裕が出るため 80% を割り当てる。
   * - 800px 以下: 小さい画面ではヘッダ類との比率を考慮して 69% に抑える。
   * @param h - 現在のウィンドウ高さ (px)
   */
  function recalcHeight(h: number) {
    if (h > 800) {
      isHeightScreen.value = true;
      divHeight.value = h * 0.8;
    } else {
      isHeightScreen.value = false;
      divHeight.value = h * 0.69;
    }
  }

  // 初回マウント前に一度計算しておき、初期表示のちらつきを防ぐ。
  recalcHeight(height.value);
  // 以後はウィンドウ高さの変化に追随して再計算する。
  watch(height, recalcHeight);

  return { width, height, isHeightScreen, divHeight };
}
