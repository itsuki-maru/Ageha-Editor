import { createApp } from "vue";
import App from "./App.vue";
import { createPinia } from 'pinia';
import "./style.css";
import './github.css';
import "katex/dist/katex.min.css";
import { useRustArgsStore } from "./stores/markdownDatas";

const app = createApp(App);
const pinia = createPinia();
app.use(pinia);

// Rustのバックエンドからのデータ取得（非同期）
useRustArgsStore(pinia).init().finally(() => {
    app.mount("#app");
});
