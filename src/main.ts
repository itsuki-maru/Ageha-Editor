import { createApp } from "vue";
import App from "./App.vue";
import { createPinia } from "pinia";
import "./style.css";
import "./github.css";
import "katex/dist/katex.min.css";
import { useRustArgsInitStore } from "./stores/appInits";

// 起動引数とユーザー CSS は Rust 側から非同期で渡されるため、
// それらがそろってから Vue アプリを mount して初期表示のズレを避ける。
const app = createApp(App);
const pinia = createPinia();
app.use(pinia);

// Rustのバックエンドからのデータ取得（非同期）
useRustArgsInitStore(pinia)
  .init()
  .finally(() => {
    const rustArgsStore = useRustArgsInitStore();
    // Rust側から取得したCSSテキストを適用
    let styleEl = document.getElementById("user-css") as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "user-css";
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = rustArgsStore.rustArgsData.css_data;
    app.mount("#app");
  });
