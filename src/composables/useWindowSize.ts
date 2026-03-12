import { ref, onMounted, onBeforeUnmount, watch } from "vue";

// ウィンドウサイズに応じてエディタ領域の高さを計算する。
// 単純な CSS だけでは調整しづらい高さをここでまとめて扱う。
export function useWindowSize() {
  const width = ref(window.innerWidth);
  const height = ref(window.innerHeight);

  const updateSize = () => {
    // resize イベントのたびに viewport の実寸を保存する。
    width.value = window.innerWidth;
    height.value = window.innerHeight;
  };

  onMounted(() => {
    window.addEventListener("resize", updateSize);
  });

  onBeforeUnmount(() => {
    window.removeEventListener("resize", updateSize);
  });

  const isHeightScreen = ref(false);
  const divHeight = ref(0);

  function recalcHeight(h: number) {
    if (h > 800) {
      // 縦に余裕がある環境では、編集領域も広めに確保する。
      isHeightScreen.value = true;
      divHeight.value = h * 0.8;
    } else {
      // 小さい画面ではヘッダ類とのバランスを見て少し控えめにする。
      isHeightScreen.value = false;
      divHeight.value = h * 0.69;
    }
  }

  recalcHeight(height.value);
  watch(height, recalcHeight);

  return { width, height, isHeightScreen, divHeight };
}
