import { createApp } from "vue";
import App from "./App.vue";
import { createPinia } from "pinia";
import "./style.css";
import "./github.css";
import "katex/dist/katex.min.css";
import { useLocalStorageStore } from "./stores/localStorages";
import { useRustArgsInitStore } from "./stores/appInits";

// 起動引数とユーザー CSS は Rust 側から非同期で渡されるため、
// それらがそろってから Vue アプリを mount して初期表示のズレを避ける。
const app = createApp(App);
const pinia = createPinia();
app.use(pinia);

Promise.all([useRustArgsInitStore(pinia).init(), useLocalStorageStore(pinia).init()]).finally(
  () => {
    app.mount("#app");
  },
);
