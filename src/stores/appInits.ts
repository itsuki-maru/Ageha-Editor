import { defineStore } from "pinia";
import { RustArgsInit } from "../interface";
import { invoke } from "@tauri-apps/api/core";

// アプリ起動時に Rust 側から渡される初期データを保持する Pinia ストア。
// 「開くファイルの本文」「Markdown 用 CSS」「スライド用 CSS」が
// ここを経由してコンポーネントへ渡る。
// init() は main.ts のアプリ起動シーケンスで一度だけ呼ぶ設計になっている。

/** ストアの初期状態（未取得時のフォールバック値） */
const DEFAULT_STATE: RustArgsInit = {
  status: {
    status_code: 200,
    message: "",
  },
  file_abs_path: "",
  text_data: "",
  css_data: "",
  slide_css_data: "",
};

interface State {
  /** Rust バックエンドから取得した起動時データ */
  rustArgsData: RustArgsInit;
}

export const useRustArgsInitStore = defineStore({
  id: "rustArgs",
  state: (): State => {
    return {
      rustArgsData: DEFAULT_STATE,
    };
  },
  actions: {
    /**
     * `request_launch_args` コマンドを呼び出し、起動時データを取得してストアへ格納する。
     * 失敗した場合は DEFAULT_STATE のままとなり、新規文書として起動する。
     */
    async init(): Promise<void> {
      try {
        const result = await invoke<RustArgsInit | null>("request_launch_args");
        if (result) {
          // 起動時点のファイル本文とユーザー CSS をそのまま保持する。
          this.rustArgsData = result;
        }
      } catch (_error) {
        // Rust 側でエラーが発生した場合は無視し、既定値のまま続行する。
        // ファイルが指定されていない通常起動では常にここを通る。
      }
    },

    /** ストアをデフォルト値へリセットする。主にテスト・デバッグ用。 */
    clear() {
      this.rustArgsData = DEFAULT_STATE;
    },
  },
});
