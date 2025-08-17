import { createApp } from "vue";
import App from "./App.vue";
import { createPinia } from 'pinia';
import "./style.css";
import './github.css';
import "katex/dist/katex.min.css";
import { useLocalStorageStore } from "./stores/localStorages";
import { useRustArgsStore } from "./stores/markdownDatas";

const app = createApp(App);
const pinia = createPinia();
app.use(pinia);

// ローカルストレージの情報を初期化（同期）
useLocalStorageStore(pinia).init();

// Rustのバックエンドからのデータ取得（非同期）
useRustArgsStore(pinia).init().finally(() => {
    app.mount("#app");
});
