import { ref, onMounted, onBeforeUnmount, watch } from "vue";

export function useWindowSize() {
  const width = ref(window.innerWidth);
  const height = ref(window.innerHeight);

  const updateSize = () => {
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

  // 小さい画面ではツールバーの占める割合を考慮して本文の高さを抑える。
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
  watch(height, recalcHeight);

  return { width, height, isHeightScreen, divHeight };
}
