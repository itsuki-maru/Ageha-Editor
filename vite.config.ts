import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath, URL } from 'node:url'
import { readFileSync } from "node:fs";

const pkgJson = JSON.parse(readFileSync("./package.json", "utf-8"));

// @ts-expect-error process は Node.js のグローバル変数
const host = process.env.TAURI_DEV_HOST;

export default defineConfig(async () => ({
  plugins: [vue()],

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  // Tauri 開発向けの Vite 設定。`tauri dev` または `tauri build` でのみ適用する。
  //
  // 1. Rust のエラーが Vite の画面クリアで消えないようにする。
  clearScreen: false,
  build: {
    rollupOptions: {
      input: {
        editor: fileURLToPath(new URL("./index.html", import.meta.url)),
        md2html: fileURLToPath(new URL("./md2html.html", import.meta.url)),
      },
    },
  },
  // 2. Tauri は固定ポートを使うため、そのポートが使用中ならエラーにする。
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. `src-tauri` を Vite の監視対象から除外する。
      ignored: ["**/src-tauri/**"],
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkgJson.version)
  }
}));
